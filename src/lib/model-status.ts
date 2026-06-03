import { config } from "./config";
import { formatOpenAIError } from "./openai-errors";
import type { LlmUserConfig } from "./llm-types";
import {
  isModelLoadedInOllama,
  isOllamaCompatible,
  listOllamaLoadedModels,
  OLLAMA_KEEP_ALIVE,
  resolveOllamaEndpoint,
} from "./ollama";
import { createOpenAIClient } from "./openai";

export type ModelStatus = {
  online: boolean;
  configured: boolean;
  model: string;
  provider: string;
  baseURL: string;
  ollama: boolean;
  loadedModels: string[];
  latencyMs: number | null;
  message: string;
  checkedAt: string;
};

export function describeProvider(baseURL: string): string {
  if (isOllamaCompatible(baseURL)) {
    return "Local (Ollama-compatible)";
  }
  const url = baseURL.toLowerCase();
  if (url.includes("openai.com")) {
    return "OpenAI";
  }
  return "OpenAI-compatible API";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function checkModelStatus(llm: LlmUserConfig): Promise<ModelStatus> {
  const model = llm.model;
  const baseURL = llm.baseURL;
  let ollama = isOllamaCompatible(baseURL);
  const provider = ollama
    ? "Local (Ollama-compatible)"
    : describeProvider(baseURL);
  const checkedAt = new Date().toISOString();

  const start = Date.now();
  try {
    const client = createOpenAIClient(llm);

    await withTimeout(client.models.list(), config.modelHealthTimeoutMs);

    if (!ollama) {
      ollama = await resolveOllamaEndpoint(baseURL);
    }

    const latencyMs = Date.now() - start;
    let loadedModels: string[] = [];
    let message = `Model API online (${latencyMs}ms).`;

    if (ollama) {
      try {
        loadedModels = await listOllamaLoadedModels(baseURL);
      } catch {
        /* ps endpoint optional */
      }
      const loadedNote =
        loadedModels.length > 0
          ? ` Loaded in VRAM: ${loadedModels.join(", ")}.`
          : " No models currently loaded in VRAM.";
      message = `Ollama reachable (${latencyMs}ms). keep_alive=${OLLAMA_KEEP_ALIVE} on chat requests.${loadedNote} Unload manually when needed.`;
    }

    return {
      online: true,
      configured: true,
      model,
      provider,
      baseURL,
      ollama,
      loadedModels,
      latencyMs,
      message,
      checkedAt,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const { message } = formatOpenAIError(error);

    if (!ollama) {
      ollama = await resolveOllamaEndpoint(baseURL).catch(() => false);
    }

    return {
      online: false,
      configured: true,
      model,
      provider: ollama ? "Local (Ollama-compatible)" : provider,
      baseURL,
      ollama,
      loadedModels: [],
      latencyMs,
      message,
      checkedAt,
    };
  }
}
