"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

export function InstructionsPanel() {
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ instructions: string }>("/api/instructions");
      setInstructions(data.instructions ?? "");
      setSaved(data.instructions ?? "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = instructions !== saved;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const data = await fetchJson<{ instructions: string }>("/api/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      setSaved(data.instructions ?? "");
      setInstructions(data.instructions ?? "");
      setStatus("Saved");
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : (
        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-2">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Reply in Ukrainian when I write in Ukrainian. Be direct and technical. Call me George."
            rows={8}
            maxLength={8000}
            className="min-h-[160px] flex-1 resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--text-secondary)]">
              {instructions.length}/8000
            </span>
            <div className="flex items-center gap-2">
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
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
