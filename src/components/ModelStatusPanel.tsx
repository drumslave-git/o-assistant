"use client";

import { useModelStatus } from "@/hooks/useModelStatus";

export function ModelStatusPanel() {
  const { status, checking, refresh, dotClass, label } = useModelStatus();

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${dotClass}`} />
          <div className="min-w-0">
            <p className="font-medium">{label}</p>
            {status && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {status.model} · {status.provider}
                {status.latencyMs != null && status.online && ` · ${status.latencyMs}ms`}
              </p>
            )}
            {status?.message && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {status.message}
              </p>
            )}
            {status?.baseURL && (
              <p className="mt-2 break-all font-mono text-xs text-[var(--text-secondary)]">
                {status.baseURL}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={checking}
          className="shrink-0 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm hover:bg-[var(--bg-input)] disabled:opacity-50"
        >
          Recheck
        </button>
      </div>
    </div>
  );
}
