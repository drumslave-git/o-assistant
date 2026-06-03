import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getLlmConfig } from "@/lib/llm-config";
import {
  listOllamaLoadedModels,
  resolveOllamaEndpoint,
  unloadOllamaModel,
} from "@/lib/ollama";
import { ensureDefaultUser } from "@/lib/user";

export async function POST() {
  const user = await ensureDefaultUser();
  const llm = await getLlmConfig(user.id);

  const isOllama = await resolveOllamaEndpoint(llm.baseURL);
  if (!isOllama) {
    return jsonError(
      "Model unload is only available when the API base URL points to Ollama.",
      400,
    );
  }

  try {
    await unloadOllamaModel(llm.baseURL, llm.model);
    const loadedModels = await listOllamaLoadedModels(llm.baseURL).catch(
      () => [] as string[],
    );

    return NextResponse.json({
      ok: true,
      model: llm.model,
      message: `Unload requested for ${llm.model}.`,
      loadedModels,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unload model";
    return jsonError(message, 502);
  }
}
