"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { ModelStatus } from "@/lib/model-status";

type ModelUnloadButtonProps = {
  status: ModelStatus | null;
  onDone?: () => void;
  size?: "sm" | "md";
};

export function ModelUnloadButton({
  status,
  onDone,
  size = "md",
}: ModelUnloadButtonProps) {
  const [unloading, setUnloading] = useState(false);

  if (!status?.ollama) return null;

  const sizeClass =
    size === "sm"
      ? "rounded px-2 py-0.5 text-xs"
      : "rounded-lg px-3 py-1.5 text-sm";

  async function unloadModel() {
    setUnloading(true);
    try {
      await fetchJson("/api/model/unload", { method: "POST" });
      onDone?.();
    } catch {
      /* parent can recheck; errors surface on next status refresh */
      onDone?.();
    } finally {
      setUnloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void unloadModel()}
      disabled={unloading || !status.online}
      title={
        status.online
          ? `Unload ${status.model} from Ollama VRAM`
          : "Connect to Ollama first"
      }
      className={`border border-amber-500/40 text-amber-200/90 hover:bg-amber-500/10 disabled:opacity-50 ${sizeClass}`}
    >
      {unloading ? "Unloading…" : "Unload model"}
    </button>
  );
}
