"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type {
  KokoroVoice,
  TtsCatalog,
  TtsResponseFormat,
  TtsUserConfig,
} from "@/lib/tts-types";
import { KOKORO_FASTAPI_DOCS } from "@/lib/kokoro-fastapi";
import { stopSpeaking } from "./VoiceInput";

type VoiceMode = "simple" | "formula";

function voiceLabel(v: KokoroVoice) {
  const lang = v.lang?.name ?? v.lang?.id ?? "";
  const grade = v.overallGrade ? ` · ${v.overallGrade}` : "";
  return `${v.name} (${v.id}) — ${v.gender ?? "?"}${lang ? ` · ${lang}` : ""}${grade}`;
}

export function VoiceSettingsPanel() {
  const [config, setConfig] = useState<TtsUserConfig | null>(null);
  const [saved, setSaved] = useState<TtsUserConfig | null>(null);
  const [catalog, setCatalog] = useState<TtsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("simple");
  const [langFilter, setLangFilter] = useState("");
  const [previewText, setPreviewText] = useState(
    "Hello! This is a voice preview from O Assistant.",
  );

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ config: TtsUserConfig }>("/api/tts/config");
      setConfig(data.config);
      setSaved(data.config);
      if (data.config.voice.includes("+") || data.config.voice.includes("(")) {
        setVoiceMode("formula");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const dirty = useMemo(() => {
    if (!config || !saved) return false;
    return JSON.stringify(config) !== JSON.stringify(saved);
  }, [config, saved]);

  const filteredVoices = useMemo(() => {
    if (!catalog?.voices) return [];
    if (!langFilter) return catalog.voices;
    return catalog.voices.filter(
      (v) => v.lang?.id === langFilter || v.lang?.name === langFilter,
    );
  }, [catalog, langFilter]);

  async function loadCatalog() {
    if (!config) return;
    setLoadingCatalog(true);
    setStatus(null);
    try {
      const data = await fetchJson<{ catalog: TtsCatalog }>("/api/tts/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseURL: config.baseURL,
          apiKey: config.apiKey,
        }),
      });
      setCatalog(data.catalog);
      setStatus(`Loaded ${data.catalog.voices.length} voices`);
      setTimeout(() => setStatus(null), 2500);

      setConfig((c) =>
        c ? { ...c, model: data.catalog.models[0]?.id ?? "kokoro" } : c,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Catalog load failed");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      const data = await fetchJson<{ config: TtsUserConfig }>("/api/tts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setConfig(data.config);
      setSaved(data.config);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function previewVoice() {
    if (!config || !previewText.trim()) return;
    setPreviewing(true);
    stopSpeaking();
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: previewText.trim(),
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
          voice: config.voice,
          speed: config.speed,
          responseFormat: config.responseFormat,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Preview failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  function patch(partial: Partial<TtsUserConfig>) {
    setConfig((c) => (c ? { ...c, ...partial } : c));
  }

  if (loading || !config) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading voice settings…</p>;
  }

  return (
    <div className="flex max-h-[min(75vh,720px)] flex-col">
      <p className="mb-4 shrink-0 text-sm leading-relaxed text-[var(--text-secondary)]">
        OpenAI-compatible TTS endpoint (base URL must end with{" "}
        <code className="text-xs">/v1</code>). Works with{" "}
        <a
          href={KOKORO_FASTAPI_DOCS}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300"
        >
          Kokoro-FastAPI
        </a>{" "}
        and similar hosts. Saved in the database, not in <code className="text-xs">.env</code>.
      </p>

      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <label className="block text-xs text-[var(--text-secondary)]">
          API base URL
          <input
            value={config.baseURL}
            onChange={(e) => patch({ baseURL: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            placeholder="https://your-tts-host/v1"
          />
        </label>

        <label className="block text-xs text-[var(--text-secondary)]">
          API key (optional)
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            placeholder="Optional"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          onClick={() => void loadCatalog()}
          disabled={loadingCatalog}
          className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm hover:bg-[var(--bg-input)] disabled:opacity-50"
        >
          {loadingCatalog ? "Loading catalog…" : "Connect & load voices"}
        </button>

        {catalog && (
          <>
            <label className="block text-xs text-[var(--text-secondary)]">
              Model
              <select
                value={config.model}
                onChange={(e) => patch({ model: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              >
                {catalog.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                    {m.quantization ? ` (${m.quantization})` : ""}
                    {m.size ? ` · ${m.size}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setVoiceMode("simple")}
                className={`rounded px-2 py-1 ${voiceMode === "simple" ? "bg-indigo-600 text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)]"}`}
              >
                Single voice
              </button>
              <button
                type="button"
                onClick={() => setVoiceMode("formula")}
                className={`rounded px-2 py-1 ${voiceMode === "formula" ? "bg-indigo-600 text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)]"}`}
              >
                Voice formula
              </button>
            </div>

            {voiceMode === "simple" ? (
              <>
                {catalog.langs.length > 0 && (
                  <label className="block text-xs text-[var(--text-secondary)]">
                    Filter by language
                    <select
                      value={langFilter}
                      onChange={(e) => setLangFilter(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                    >
                      <option value="">All languages</option>
                      {catalog.langs.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.id})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block text-xs text-[var(--text-secondary)]">
                  Voice
                  <select
                    value={config.voice}
                    onChange={(e) => patch({ voice: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  >
                    {filteredVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {voiceLabel(v)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label className="block text-xs text-[var(--text-secondary)]">
                Voice formula
                <input
                  value={config.voice}
                  onChange={(e) => patch({ voice: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 font-mono text-xs"
                  placeholder="af_bella+af_sky or af_bella(2)+af_sky(1)"
                />
                <span className="mt-1 block text-[var(--text-secondary)]">
                  Mix voices with + or weighted ratios in parentheses
                </span>
              </label>
            )}

            <label className="block text-xs text-[var(--text-secondary)]">
              Speed: {config.speed.toFixed(2)}×
              <input
                type="range"
                min={0.25}
                max={5}
                step={0.05}
                value={config.speed}
                onChange={(e) => patch({ speed: Number(e.target.value) })}
                className="mt-2 w-full"
              />
            </label>

            <label className="block text-xs text-[var(--text-secondary)]">
              Format
              <select
                value={config.responseFormat}
                onChange={(e) =>
                  patch({ responseFormat: e.target.value as TtsResponseFormat })
                }
                className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="opus">Opus</option>
                <option value="flac">FLAC</option>
                <option value="m4a">M4A</option>
                <option value="pcm">PCM</option>
              </select>
            </label>
          </>
        )}

        <label className="block text-xs text-[var(--text-secondary)]">
          Preview text
          <textarea
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            rows={2}
            className="mt-1 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void previewVoice()}
            disabled={previewing || !catalog}
            className="rounded-lg border border-indigo-500/50 px-3 py-1.5 text-sm text-indigo-200 hover:bg-indigo-950 disabled:opacity-40"
          >
            {previewing ? "Playing…" : "Test voice"}
          </button>
          {status && (
            <span
              className={`text-xs ${status === "Saved" ? "text-emerald-400" : status.startsWith("Loaded") ? "text-emerald-400" : "text-rose-400"}`}
            >
              {status}
            </span>
          )}
          <button
            type="submit"
            disabled={saving || !dirty}
            className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
