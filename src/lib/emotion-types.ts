export const EMOTION_MOODS = [
  "neutral",
  "happy",
  "curious",
  "thoughtful",
  "concerned",
  "excited",
  "calm",
  "playful",
  "empathetic",
  "tired",
] as const;

export type EmotionMood = (typeof EMOTION_MOODS)[number];

export type AssistantEmotion = {
  mood: EmotionMood;
  label: string;
  note?: string;
};

export const DEFAULT_EMOTION: AssistantEmotion = {
  mood: "calm",
  label: "Calm & ready",
  note: "Starting the conversation.",
};
