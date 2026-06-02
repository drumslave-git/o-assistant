import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { ensureDefaultUser } from "@/lib/user";
import { getTtsConfig, setTtsConfig } from "@/lib/tts-config";

export async function GET() {
  const user = await ensureDefaultUser();
  const config = await getTtsConfig(user.id);
  return NextResponse.json({ config });
}

const updateSchema = z.object({
  baseURL: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1).optional(),
  voice: z.string().min(1).optional(),
  speed: z.number().min(0.25).max(5).optional(),
  responseFormat: z
    .enum(["mp3", "wav", "opus", "flac", "m4a", "pcm"])
    .optional(),
});

export async function PUT(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const config = await setTtsConfig(user.id, parsed.data);
  return NextResponse.json({ config });
}
