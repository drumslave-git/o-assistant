import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { checkApiAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getLlmConfig } from "@/lib/llm-config";
import { createOpenAIClient } from "@/lib/openai";
import { ensureDefaultUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { getMemoriesForPrompt } from "@/lib/memory";
import { buildSystemPrompt, getCustomInstructions } from "@/lib/instructions";
import { formatOpenAIError } from "@/lib/openai-errors";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "developer"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

const bodySchema = z.object({
  model: z.string().optional(),
  messages: z.array(messageSchema).min(1),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  session_id: z.string().optional(),
});

function toOpenAIContent(content: z.infer<typeof messageSchema>["content"]): string {
  if (typeof content === "string") return content;
  return JSON.stringify(content);
}

export async function POST(request: NextRequest) {
  if (!checkApiAuth(request)) {
    return jsonError("Invalid API key", 401);
  }
  const user = await ensureDefaultUser();
  const llm = await getLlmConfig(user.id);

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { messages, stream, temperature, max_tokens, session_id } = parsed.data;
  const model = parsed.data.model ?? llm.model;
  const client = createOpenAIClient(llm);

  let outbound = messages.map((m) => ({
    role: m.role === "developer" ? ("system" as const) : m.role,
    content: toOpenAIContent(m.content),
  }));

  if (session_id) {
    const session = await prisma.session.findFirst({
      where: { id: session_id, userId: user.id },
    });
    if (!session) {
      return jsonError("session_id not found", 404);
    }

    const [memories, customInstructions] = await Promise.all([
      getMemoriesForPrompt(user.id),
      getCustomInstructions(user.id),
    ]);
    const systemBlock = buildSystemPrompt({ customInstructions, memories });
    const lastUser = [...outbound].reverse().find((m) => m.role === "user");

    outbound = [{ role: "system", content: systemBlock }, ...outbound];

    if (lastUser) {
      await prisma.message.create({
        data: { sessionId: session_id, role: "user", content: lastUser.content },
      });
    }
  }

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages: outbound,
      stream: stream ?? false,
      temperature,
      max_tokens,
    });
  } catch (error) {
    const { message, status } = formatOpenAIError(error);
    return jsonError(message, status);
  }

  if (stream && Symbol.asyncIterator in completion) {
    const encoder = new TextEncoder();
    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        const id = `chatcmpl-${Date.now()}`;
        try {
          for await (const chunk of completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) fullReply += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }

          if (session_id && fullReply) {
            await prisma.message.create({
              data: { sessionId: session_id, role: "assistant", content: fullReply },
            });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const { message } = formatOpenAIError(error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: { message, type: "api_error" } })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const result = completion as OpenAI.Chat.Completions.ChatCompletion;
  const reply = result.choices[0]?.message?.content ?? "";

  if (session_id && reply) {
    await prisma.message.create({
      data: { sessionId: session_id, role: "assistant", content: reply },
    });
  }

  return NextResponse.json(result);
}
