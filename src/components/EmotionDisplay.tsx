"use client";

import type { AssistantEmotion } from "@/lib/emotion-types";
import { moodAccentColor, moodEmoji } from "@/lib/emotion";

type EmotionDisplayProps = {
  emotion: AssistantEmotion | null;
  compact?: boolean;
};

export function EmotionDisplay({ emotion, compact = false }: EmotionDisplayProps) {
  if (!emotion) return null;

  const emoji = moodEmoji(emotion.mood);
  const accent = moodAccentColor(emotion.mood);

  if (compact) {
    return (
      <span
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs"
        title={emotion.note}
      >
        <span aria-hidden>{emoji}</span>
        <span className="truncate font-medium" style={{ color: accent }}>
          {emotion.label}
        </span>
      </span>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: accent }}>
            {emotion.label}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
            {emotion.mood}
          </p>
        </div>
      </div>
      {emotion.note && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          {emotion.note}
        </p>
      )}
    </div>
  );
}
