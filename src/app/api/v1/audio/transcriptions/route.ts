import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getLlmConfig } from "@/lib/llm-config";
import { createOpenAIClient } from "@/lib/openai";
import { ensureDefaultUser } from "@/lib/user";

export async function POST(request: NextRequest) {
  if (!checkApiAuth(request)) {
    return jsonError("Invalid API key", 401);
  }
  const user = await ensureDefaultUser();
  const llm = await getLlmConfig(user.id);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("file is required", 400);
  }

  const model = (formData.get("model") as string) ?? "whisper-1";
  const client = createOpenAIClient(llm);

  try {
    const transcription = await client.audio.transcriptions.create({
      file,
      model,
    });
    return NextResponse.json(transcription);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return jsonError(message, 502);
  }
}
