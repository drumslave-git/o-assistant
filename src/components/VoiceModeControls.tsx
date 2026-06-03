"use client";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

export type VoiceModeStatus =
  | "ready"
  | "listening"
  | "thinking"
  | "speaking";

type VoiceModeControlsProps = {
  status: VoiceModeStatus;
  statusDetail?: string;
  disabled?: boolean;
  onListeningChange: (listening: boolean) => void;
  onTranscript: (text: string) => void;
  onInterruptSpeaking: () => void;
  startListeningRef: React.MutableRefObject<(() => void) | null>;
  stopListeningRef: React.MutableRefObject<(() => void) | null>;
};

const STATUS_LABELS: Record<VoiceModeStatus, string> = {
  ready: "Tap the microphone to speak",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

export function VoiceModeControls({
  status,
  statusDetail,
  disabled,
  onListeningChange,
  onTranscript,
  onInterruptSpeaking,
  startListeningRef,
  stopListeningRef,
}: VoiceModeControlsProps) {
  const { listening, supported, start, stop, toggle } = useSpeechRecognition({
    onFinalTranscript: onTranscript,
    onListeningChange,
  });

  startListeningRef.current = () => {
    if (!disabled && status !== "thinking") start();
  };
  stopListeningRef.current = stop;

  const label =
    statusDetail && status === "thinking"
      ? statusDetail
      : STATUS_LABELS[status];

  const micActive = listening || status === "listening";

  function onMicClick() {
    if (disabled && status !== "speaking") return;
    if (status === "speaking") {
      onInterruptSpeaking();
      start();
      return;
    }
    toggle();
  }

  if (!supported) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
        Voice mode needs Chrome or Edge (Web Speech API).
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex h-16 items-center justify-center gap-1">
        {micActive ? (
          Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-indigo-400 animate-pulse"
              style={{
                height: `${12 + Math.sin(i) * 8}px`,
                animationDelay: `${i * 0.12}s`,
                animationDuration: "0.8s",
              }}
            />
          ))
        ) : status === "speaking" ? (
          Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-violet-400/80"
              style={{ height: `${10 + (i % 3) * 6}px` }}
            />
          ))
        ) : status === "thinking" ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-[var(--text-secondary)]/40" />
        )}
      </div>

      <p className="min-h-[1.25rem] text-center text-sm text-[var(--text-secondary)]">
        {label}
      </p>

      <button
        type="button"
        onClick={onMicClick}
        disabled={disabled && status !== "speaking"}
        aria-label={
          status === "speaking"
            ? "Interrupt and speak"
            : micActive
              ? "Stop listening"
              : "Start listening"
        }
        className={`flex h-20 w-20 items-center justify-center rounded-full transition shadow-lg ${
          micActive
            ? "bg-rose-500/90 text-white ring-4 ring-rose-400/30 hover:bg-rose-500"
            : status === "speaking"
              ? "bg-violet-600 text-white ring-4 ring-violet-400/30 hover:bg-violet-500"
              : "bg-[var(--text-primary)] text-[var(--bg-sidebar)] hover:opacity-90 disabled:opacity-40"
        }`}
      >
        {micActive ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-2 6v2a3 3 0 01-6 0v-2H7v2a5 5 0 0010 0v-2h-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function VoiceModeToggleButton({
  active,
  onClick,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? "Exit voice mode" : "Enter voice mode"}
      title={active ? "Exit voice mode" : "Voice mode"}
      className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
        active
          ? "bg-indigo-600 text-white ring-2 ring-indigo-400/50"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
      } disabled:opacity-30`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        {active ? (
          <path d="M6 6h12v12H6V6zm2 2v8h8V8H8z" />
        ) : (
          <>
            <rect x="4" y="8" width="2" height="8" rx="1" />
            <rect x="8" y="5" width="2" height="14" rx="1" />
            <rect x="12" y="7" width="2" height="10" rx="1" />
            <rect x="16" y="4" width="2" height="16" rx="1" />
            <rect x="20" y="9" width="2" height="6" rx="1" />
          </>
        )}
      </svg>
    </button>
  );
}
