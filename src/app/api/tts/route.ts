import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { ensureDefaultUser } from "@/lib/user";
import { getTtsConfig, synthesizeSpeech } from "@/lib/tts-config";
import { stripTextForTts } from "@/lib/tts-text";

const bodySchema = z.object({
  text: z.string().min(1),
  baseURL: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  voice: z.string().optional(),
  speed: z.number().min(0.25).max(5).optional(),
  responseFormat: z
    .enum(["mp3", "wav", "opus", "flac", "m4a", "pcm"])
    .optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  try {
    const user = await ensureDefaultUser();
    const saved = await getTtsConfig(user.id);
    const { text, ...overrides } = parsed.data;
    const spoken = stripTextForTts(text);
    if (!spoken) {
      return jsonError("No speakable text after removing emoji", 400);
    }

    const tts = {
      ...saved,
      ...overrides,
      baseURL: (overrides.baseURL ?? saved.baseURL).replace(/\/$/, ""),
    };

    const { buffer, contentType } = await synthesizeSpeech(tts, spoken);

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TTS failed";
    return jsonError(message, 502);
  }
}
