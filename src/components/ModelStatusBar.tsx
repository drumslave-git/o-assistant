"use client";

import Link from "next/link";
import { ModelUnloadButton } from "@/components/ModelUnloadButton";
import { useModelStatus } from "@/hooks/useModelStatus";

export function ModelStatusBar() {
  const { status, checking, refresh, dotClass, label } = useModelStatus();

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-xs"
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="shrink-0 font-medium text-[var(--text-primary)]">{label}</span>
      {status && (
        <span className="min-w-0 truncate text-[var(--text-secondary)]">
          {status.model}
          <span className="mx-1 opacity-40">·</span>
          {status.provider}
          {status.online && status.latencyMs != null && (
            <>
              <span className="mx-1 opacity-40">·</span>
              {status.latencyMs}ms
            </>
          )}
        </span>
      )}
      {!checking && status && !status.online && status.message && (
        <span
          className="hidden min-w-0 truncate text-[var(--text-secondary)] sm:inline"
          title={status.message}
        >
          — {status.message}
        </span>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ModelUnloadButton
          status={status}
          size="sm"
          onDone={() => void refresh()}
        />
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={checking}
          className="rounded px-1.5 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-50"
          aria-label="Recheck model connection"
          title="Recheck"
        >
          ↻
        </button>
        <Link
          href="/settings/model"
          className="text-indigo-400 hover:text-indigo-300"
        >
          Model
        </Link>
      </div>
    </div>
  );
}
