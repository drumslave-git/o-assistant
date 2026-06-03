import { prisma } from "./db";
import {
  formatEmotionTurnReminder,
  normalizeEmotion,
} from "./emotion";
import type { AssistantEmotion } from "./emotion-types";
import { getMemoriesForPrompt, storeAssistantMemories } from "./memory";
import { maybeGenerateSessionTitle } from "./session-title";
import { buildSystemPrompt, getCustomInstructions } from "./instructions";
import { getLlmConfig } from "./llm-config";
import { withOllamaKeepAlive } from "./ollama";
import { createOpenAIClient } from "./openai";
import { parseAssistantResponse } from "./assistant-format";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

function extractMoodArc(
  history: { role: string; emotion: unknown }[],
): AssistantEmotion[] {
  return history
    .filter((m) => m.role === "assistant" && m.emotion != null)
    .map((m) => normalizeEmotion(m.emotion));
}

export async function buildChatMessages(
  sessionId: string,
  userId: string,
): Promise<ChatCompletionMessageParam[]> {
  const [memories, customInstructions, session, history] = await Promise.all([
    getMemoriesForPrompt(userId),
    getCustomInstructions(userId),
    prisma.session.findUnique({
      where: { id: sessionId },
      select: { assistantEmotion: true },
    }),
    prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { role: true, content: true, emotion: true },
    }),
  ]);

  const currentEmotion = normalizeEmotion(session?.assistantEmotion);
  const moodArc = extractMoodArc(history);

  const transcript: ChatCompletionMessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  return [
    {
      role: "system",
      content: buildSystemPrompt({
        customInstructions,
        memories,
        emotion: currentEmotion,
        moodArc,
      }),
    },
    ...transcript,
    {
      role: "system",
      content: formatEmotionTurnReminder(currentEmotion),
    },
  ];
}

export async function runAssistantTurn(
  sessionId: string,
  userId: string,
  userContent: string,
) {
  const sessionBefore = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { assistantEmotion: true },
  });
  const previousEmotion = normalizeEmotion(sessionBefore?.assistantEmotion);

  await prisma.message.create({
    data: { sessionId, role: "user", content: userContent },
  });

  const messages = await buildChatMessages(sessionId, userId);
  const llm = await getLlmConfig(userId);
  const client = createOpenAIClient(llm);

  const completion = await client.chat.completions.create(
    withOllamaKeepAlive(llm.baseURL, {
      model: llm.model,
      messages,
      temperature: 0.7,
      max_tokens: 8192,
    }),
  );

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const { message, memory, emotion } = parseAssistantResponse(raw, previousEmotion);

  await prisma.message.create({
    data: {
      sessionId,
      role: "assistant",
      content: message,
      emotion,
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      updatedAt: new Date(),
      assistantEmotion: emotion,
    },
  });

  const memoriesAdded = await storeAssistantMemories(userId, memory);
  const title = await maybeGenerateSessionTitle(sessionId, userId);

  return { message, memoriesAdded, emotion, title, completion };
}

export function sessionEmotionFromJson(raw: unknown): AssistantEmotion {
  return normalizeEmotion(raw);
}
