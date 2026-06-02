"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { LlmUserConfig } from "@/lib/llm-types";

export function LlmSettingsPanel() {
  const [config, setConfig] = useState<LlmUserConfig | null>(null);
  const [saved, setSaved] = useState<LlmUserConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ config: LlmUserConfig }>("/api/llm/config");
      setConfig(data.config);
      setSaved(data.config);
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

  function patch(partial: Partial<LlmUserConfig>) {
    setConfig((c) => (c ? { ...c, ...partial } : c));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      const data = await fetchJson<{ config: LlmUserConfig }>("/api/llm/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setConfig(data.config);
      setSaved(data.config);
      setStatus("Saved");
      window.dispatchEvent(new Event("o-assistant:llm-config-updated"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading model settings…</p>;
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        Any OpenAI-compatible endpoint. API key is only sent when you fill it in.
      </p>

      <label className="block text-xs text-[var(--text-secondary)]">
        API base URL
        <input
          value={config.baseURL}
          onChange={(e) => patch({ baseURL: e.target.value })}
          className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm font-mono"
          placeholder="https://api.openai.com/v1"
          required
        />
      </label>

      <label className="block text-xs text-[var(--text-secondary)]">
        API key <span className="opacity-70">(optional)</span>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => patch({ apiKey: e.target.value })}
          className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
          placeholder="Only if your server requires it"
          autoComplete="off"
        />
      </label>

      <label className="block text-xs text-[var(--text-secondary)]">
        Model
        <input
          value={config.model}
          onChange={(e) => patch({ model: e.target.value })}
          className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm"
          placeholder="gpt-4o-mini"
          required
        />
      </label>

      <div className="flex items-center gap-2 pt-1">
        {status && (
          <span
            className={`text-xs ${status === "Saved" ? "text-emerald-400" : "text-rose-400"}`}
          >
            {status}
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !dirty}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
