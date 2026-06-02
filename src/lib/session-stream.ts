import { prisma } from "./db";
import { normalizeEmotion } from "./emotion";
import type { AssistantEmotion } from "./emotion-types";
import { visibleReplyStreamText } from "./assistant-stream";
import { parseAssistantResponse } from "./assistant-format";
import { buildChatMessages } from "./session";
import { getLlmConfig } from "./llm-config";
import { createOpenAIClient } from "./openai";
import { storeAssistantMemories } from "./memory";
import { maybeGenerateSessionTitle } from "./session-title";

export type AssistantStreamEvent =
  | { type: "content"; delta: string }
  | {
      type: "done";
      message: string;
      memoriesAdded: number;
      emotion: AssistantEmotion;
      title: string | null;
    };

export async function* streamAssistantTurn(
  sessionId: string,
  userId: string,
  userContent: string,
): AsyncGenerator<AssistantStreamEvent> {
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

  const completion = await client.chat.completions.create({
    model: llm.model,
    messages,
    temperature: 0.7,
    max_tokens: 8192,
    stream: true,
  });

  let raw = "";
  let lastDisplayed = "";

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;

    raw += delta;
    const visible = visibleReplyStreamText(raw);
    if (visible.length <= lastDisplayed.length) continue;

    const contentDelta = visible.slice(lastDisplayed.length);
    lastDisplayed = visible;
    yield { type: "content", delta: contentDelta };
  }

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

  yield { type: "done", message, memoriesAdded, emotion, title };
}
