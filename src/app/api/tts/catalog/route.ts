import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { ensureDefaultUser } from "@/lib/user";
import { fetchTtsCatalog, getTtsConfig } from "@/lib/tts-config";

const bodySchema = z.object({
  baseURL: z.string().url().optional(),
  apiKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await ensureDefaultUser();
  const saved = await getTtsConfig(user.id);
  const parsed = bodySchema.safeParse(
    request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {},
  );

  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const baseURL = parsed.data.baseURL ?? saved.baseURL;
  const apiKey = parsed.data.apiKey ?? saved.apiKey;

  try {
    const catalog = await fetchTtsCatalog(baseURL, apiKey);
    return NextResponse.json({ catalog, baseURL });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load catalog";
    return jsonError(message, 502);
  }
}
