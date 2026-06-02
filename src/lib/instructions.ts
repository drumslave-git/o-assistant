import {
  ASSISTANT_JSON_INSTRUCTIONS,
} from "./assistant-format";
import { formatMemoriesForSystem } from "./memory";
import { prisma } from "./db";
const ASSISTANT_PERSONA = `You are O, a warm, capable personal assistant.
Use session context and stored long-term memories about the user naturally.`;

export function buildSystemPrompt(options: {
  customInstructions?: string | null;
  memories: { category: string; content: string }[];
}): string {
  const parts = [ASSISTANT_PERSONA, ASSISTANT_JSON_INSTRUCTIONS];

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
