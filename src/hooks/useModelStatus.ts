"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { ModelStatus } from "@/lib/model-status";

export type { ModelStatus };

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const data = await fetchJson<ModelStatus>("/api/model/status");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 45_000);
    const onConfig = () => void refresh();
    window.addEventListener("o-assistant:llm-config-updated", onConfig);
    return () => {
      clearInterval(interval);
      window.removeEventListener("o-assistant:llm-config-updated", onConfig);
    };
  }, [refresh]);

  const dotClass = checking
    ? "bg-amber-400 animate-pulse"
    : status?.online
      ? "bg-emerald-400"
      : status?.configured
        ? "bg-rose-500"
        : "bg-slate-500";

  const label = checking
    ? "Checking…"
    : status?.online
      ? "Online"
      : status?.configured
        ? "Offline"
        : "Unavailable";

  return { status, checking, refresh, dotClass, label };
}
