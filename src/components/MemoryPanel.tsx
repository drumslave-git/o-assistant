"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

type Memory = {
  id: string;
  category: string;
  content: string;
  importance: number;
};

export function MemoryPanel() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ memories?: Memory[] }>("/api/memory");
      setMemories(data.memories ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onUpdate = () => void load();
    window.addEventListener("o-assistant:memories-updated", onUpdate);
    return () => window.removeEventListener("o-assistant:memories-updated", onUpdate);
  }, [load]);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft.trim(), category: "fact", importance: 3 }),
    });
    setDraft("");
    await load();
  }

  async function removeMemory(id: string) {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="flex max-h-[min(70vh,560px)] flex-col">
      <form onSubmit={addMemory} className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a fact…"
          className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm placeholder:text-[var(--text-secondary)] focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Save
        </button>
      </form>
      <ul className="flex-1 space-y-2 overflow-y-auto text-sm">
        {loading && <li className="text-[var(--text-secondary)]">Loading…</li>}
        {!loading && memories.length === 0 && (
          <li className="text-[var(--text-secondary)]">
            Memories build as you chat, or add them manually.
          </li>
        )}
        {memories.map((m) => (
          <li
            key={m.id}
            className="group flex items-start justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2"
          >
            <div>
              <span className="text-xs uppercase tracking-wide text-indigo-400">
                {m.category}
              </span>
              <p>{m.content}</p>
            </div>
            <button
              type="button"
              onClick={() => removeMemory(m.id)}
              className="shrink-0 text-[var(--text-secondary)] opacity-0 transition group-hover:opacity-100 hover:text-rose-400"
              aria-label="Delete memory"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
