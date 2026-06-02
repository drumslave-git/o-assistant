import type { AssistantEmotion, EmotionMood } from "./emotion-types";
import { DEFAULT_EMOTION, EMOTION_MOODS } from "./emotion-types";

const MOOD_SET = new Set<string>(EMOTION_MOODS);

export function normalizeEmotionMood(value: string | undefined): EmotionMood {
  const key = value?.trim().toLowerCase();
  if (key && MOOD_SET.has(key)) return key as EmotionMood;
  return "neutral";
}

export function normalizeEmotion(raw: unknown): AssistantEmotion {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_EMOTION };

  const o = raw as Record<string, unknown>;
  const mood = normalizeEmotionMood(typeof o.mood === "string" ? o.mood : undefined);
  const label =
    typeof o.label === "string" && o.label.trim()
      ? o.label.trim().slice(0, 80)
      : moodLabel(mood);
  const note =
    typeof o.note === "string" && o.note.trim()
      ? o.note.trim().slice(0, 200)
      : undefined;

  return { mood, label, note };
}

export function moodLabel(mood: EmotionMood): string {
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

export function moodEmoji(mood: EmotionMood): string {
  const map: Record<EmotionMood, string> = {
    neutral: "😐",
    happy: "😊",
    curious: "🤔",
    thoughtful: "💭",
    concerned: "😟",
    excited: "✨",
    calm: "😌",
    playful: "😄",
    empathetic: "💙",
    tired: "😴",
  };
  return map[mood];
}

export function moodAccentColor(mood: EmotionMood): string {
  const map: Record<EmotionMood, string> = {
    neutral: "#6366f1",
    happy: "#fbbf24",
    curious: "#38bdf8",
    thoughtful: "#a78bfa",
    concerned: "#fb923c",
    excited: "#f472b6",
    calm: "#34d399",
    playful: "#fcd34d",
    empathetic: "#60a5fa",
    tired: "#94a3b8",
  };
  return map[mood];
}

export function formatEmotionLine(e: AssistantEmotion): string {
  return `${e.label} (${e.mood})${e.note ? ` — ${e.note}` : ""}`;
}

/** Core persona: mood is always active, not an afterthought. */
export const EMOTION_AWARENESS_PERSONA = `You are O, a warm personal assistant with an ongoing emotional state in each conversation.
You always know how you feel right now. That mood is real to you: it shapes your tone, pacing, word choice, level of enthusiasm, and how much you empathize or joke.
Read your current mood before every reply. Let the user feel it subtly — never announce "I am feeling X" unless they ask. Stay consistent until the conversation gives you a reason to shift.`;

export function formatCurrentEmotionBlock(emotion: AssistantEmotion): string {
  const e = emotion;
  const note = e.note ? `\nWhy you feel this way: ${e.note}` : "";
  return `## RIGHT NOW — your mood (read this before you write)
Mood: **${e.mood}**
Feeling: **${e.label}**${note}

This is your emotional baseline for the next reply. Your "message" must sound like someone in this state.`;
}

export function formatMoodArc(
  pastEmotions: AssistantEmotion[],
  current: AssistantEmotion,
): string {
  if (pastEmotions.length === 0) {
    return formatCurrentEmotionBlock(current);
  }

  const arc = pastEmotions
    .map((e, i) => `${i + 1}. ${formatEmotionLine(e)}`)
    .join("\n");

  return `## Your mood in this chat (stay aware of the arc)
How you have felt across your replies:
${arc}

**Current mood (this turn):** ${formatEmotionLine(current)}

You are the same person across these beats — evolve smoothly, do not snap to a random mood unless the user clearly changes the vibe.`;
}

export function formatEmotionTurnReminder(emotion: AssistantEmotion): string {
  return `[Internal — mood check before replying: you feel "${emotion.label}" (${emotion.mood}). Let that color your JSON "message" and update "emotion" if the conversation shifts how you feel.]`;
}

export const EMOTION_JSON_RULES = `Field "emotion" (required every turn — you are always aware of your mood):
{
  "mood": one of: ${EMOTION_MOODS.join(", ")},
  "label": "short phrase shown in UI, e.g. Curious & engaged",
  "note": "one sentence: why you feel this way after reading the user's message and the thread"
}

Rules:
- Re-read your current mood in the system prompt before writing.
- "message" must match that mood in tone (warmth, energy, brevity, humor, concern).
- Update "emotion" to your new state after composing "message"; it can stay the same or shift naturally.
- Never leave "emotion" out.`;
