import { prisma } from "./db";
import { getMemoriesForPrompt, storeAssistantMemories } from "./memory";
import { buildSystemPrompt, getCustomInstructions } from "./instructions";
import { getLlmConfig } from "./llm-config";
import { createOpenAIClient } from "./openai";
import { parseAssistantResponse } from "./assistant-format";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export async function buildChatMessages(
  sessionId: string,
  userId: string,
): Promise<ChatCompletionMessageParam[]> {
  const [memories, customInstructions, history] = await Promise.all([
    getMemoriesForPrompt(userId),
    getCustomInstructions(userId),
    prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
  ]);

  return [
    {
      role: "system",
      content: buildSystemPrompt({ customInstructions, memories }),
    },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];
}

export async function runAssistantTurn(
  sessionId: string,
  userId: string,
  userContent: string,
) {
  await prisma.message.create({
    data: { sessionId, role: "user", content: userContent },
  });

  const messages = await buildChatMessages(sessionId, userId);
  const llm = await getLlmConfig(userId);
  const client = createOpenAIClient(llm);

  const completion = await client.chat.completions.create({
    model: llm.model,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const { message, memory } = parseAssistantResponse(raw);

  await prisma.message.create({
    data: { sessionId, role: "assistant", content: message },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  const memoriesAdded = await storeAssistantMemories(userId, memory);

  return { message, memoriesAdded, completion };
}

export async function titleFromFirstMessage(sessionId: string, firstMessage: string) {
  const title =
    firstMessage.length > 48 ? `${firstMessage.slice(0, 45)}…` : firstMessage;
  await prisma.session.update({
    where: { id: sessionId },
    data: { title },
  });
}
