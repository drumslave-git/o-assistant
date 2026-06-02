import { ASSISTANT_REPLY_INSTRUCTIONS } from "./assistant-format";
import {
  EMOTION_AWARENESS_PERSONA,
  formatCurrentEmotionBlock,
  formatMoodArc,
} from "./emotion";
import type { AssistantEmotion } from "./emotion-types";
import { formatMemoriesForSystem } from "./memory";
import { prisma } from "./db";

export function buildSystemPrompt(options: {
  customInstructions?: string | null;
  memories: { category: string; content: string }[];
  emotion: AssistantEmotion;
  moodArc?: AssistantEmotion[];
}): string {
  const parts = [
    EMOTION_AWARENESS_PERSONA,
    options.moodArc?.length
      ? formatMoodArc(options.moodArc, options.emotion)
      : formatCurrentEmotionBlock(options.emotion),
    ASSISTANT_REPLY_INSTRUCTIONS,
  ];

  const custom = options.customInstructions?.trim();
  if (custom) {
    parts.push(
      `## User custom instructions\nFollow these persistent preferences and rules in every reply:\n${custom}`,
    );
  }

  parts.push(formatMemoriesForSystem(options.memories));
  return parts.join("\n\n");
}

export async function getCustomInstructions(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customInstructions: true },
  });
  return user?.customInstructions ?? "";
}

export async function setCustomInstructions(
  userId: string,
  instructions: string,
): Promise<string> {
  const value = instructions.trim() || null;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { customInstructions: value },
    select: { customInstructions: true },
  });
  return user.customInstructions ?? "";
}
