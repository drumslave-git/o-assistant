"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmotionDisplay } from "@/components/EmotionDisplay";
import { useChatAvatar } from "./ChatAvatarContext";

const Avatar3D = dynamic(
  () => import("@/components/Avatar3D").then((m) => m.Avatar3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[240px] w-full animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />
    ),
  },
);

const PHASE_LABELS: Record<string, string> = {
  queued: "Queued",
  connecting: "Connecting",
  waiting: "Waiting",
  generating: "Processing",
  streaming: "Streaming",
  error: "Error",
};

const STORAGE_KEY = "o-assistant:avatar-panel-width";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 220;
const MAX_WIDTH = 560;

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

export function ChatRightSidebar() {
  const {
    emotion,
    speaking,
    listening,
    loading,
    activityPhase,
    activityDetail,
  } = useChatAvatar();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef({ startX: 0, startWidth: DEFAULT_WIDTH });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          setWidth(clampWidth(parsed));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
      setResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: PointerEvent) => {
      const { startX, startWidth } = dragRef.current;
      const delta = startX - e.clientX;
      setWidth(clampWidth(startWidth + delta));
    };

    const onUp = () => {
      setResizing(false);
      setWidth((current) => {
        const clamped = clampWidth(current);
        try {
          localStorage.setItem(STORAGE_KEY, String(clamped));
        } catch {
          /* ignore */
        }
        return clamped;
      });
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizing]);

  const showStatus = loading && activityPhase !== "idle";

  return (
    <aside
      style={{ width }}
      className={`relative hidden h-full shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-sidebar)] xl:flex ${
        resizing ? "select-none" : ""
      }`}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize avatar panel"
        onPointerDown={onResizePointerDown}
        className="absolute -left-1 top-0 z-20 flex h-full w-2 cursor-col-resize items-center justify-center touch-none"
      >
        <div
          className={`h-12 w-1 rounded-full transition-colors ${
            resizing
              ? "bg-indigo-400"
              : "bg-[var(--border-subtle)] hover:bg-indigo-400/70"
          }`}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Avatar3D speaking={speaking} listening={listening} mood={emotion.mood} />
        </div>

        <div className="mt-4 shrink-0 space-y-3">
          <EmotionDisplay emotion={emotion} />

          {showStatus && (
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400 align-middle" />
              {PHASE_LABELS[activityPhase] ?? activityPhase}
              {activityDetail && ` — ${activityDetail}`}
            </p>
          )}

          {(speaking || listening) && !loading && (
            <p className="text-xs text-[var(--text-secondary)]">
              {listening ? "Listening…" : "Speaking…"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
