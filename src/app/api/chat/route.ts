import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/user";
import { runAssistantTurn } from "@/lib/session";
import { streamAssistantTurn } from "@/lib/session-stream";
import { getLlmConfig } from "@/lib/llm-config";
import { describeProvider } from "@/lib/model-status";
import { jsonError } from "@/lib/api";
import { formatOpenAIError } from "@/lib/openai-errors";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  stream: z.boolean().optional(),
});

function sseLine(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function streamChatResponse(
  sessionId: string,
  userId: string,
  userMessage: string,
  model: string,
  provider: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseLine(data)));
      };

      send({
        status: "queued",
        detail: "Your message was received.",
      });

      send({
        status: "connecting",
        detail: `Calling ${model} (${provider})…`,
      });

      const isLocal = provider.startsWith("Local");
      send({
        status: "waiting",
        detail: isLocal
          ? "Waiting for the model. The first request after idle can take 30–120s while it loads into memory."
          : "Waiting for the model to respond…",
      });

      const started = Date.now();
      let firstToken = false;

      try {
        for await (const event of streamAssistantTurn(
          sessionId,
          userId,
          userMessage,
        )) {
          if (event.type === "content") {
            if (!firstToken) {
              firstToken = true;
              send({
                status: "streaming",
                detail: "Receiving…",
              });
            }
            send({ content: event.delta });
          } else if (event.type === "done") {
            const latencyMs = Date.now() - started;
            send({ emotion: event.emotion });
            send({ message: event.message });
            if (event.title) send({ title: event.title });
            send({ memoriesAdded: event.memoriesAdded, latencyMs });
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const latencyMs = Date.now() - started;
        const { message: errMsg } = formatOpenAIError(error);
        send({
          error: errMsg,
          status: "error",
          detail: errMsg,
          latencyMs,
        });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const { sessionId, message, stream } = parsed.data;

  try {
    const user = await ensureDefaultUser();
    const llm = await getLlmConfig(user.id);
    const model = llm.model;
    const provider = describeProvider(llm.baseURL);

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) {
      return jsonError("Session not found", 404);
    }

    if (stream) {
      return new Response(
        streamChatResponse(sessionId, user.id, message, model, provider),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    }

    const { message: reply, memoriesAdded, emotion, title } = await runAssistantTurn(
      sessionId,
      user.id,
      message,
    );
    return NextResponse.json({ reply, memoriesAdded, emotion, title });
  } catch (error) {
    const { message: errMsg, status } = formatOpenAIError(error);
    return jsonError(errMsg, status);
  }
}
