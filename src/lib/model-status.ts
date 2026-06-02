import { config } from "./config";
import { formatOpenAIError } from "./openai-errors";
import type { LlmUserConfig } from "./llm-types";
import { createOpenAIClient } from "./openai";

export type ModelStatus = {
  online: boolean;
  configured: boolean;
  model: string;
  provider: string;
  baseURL: string;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
};

export function describeProvider(baseURL: string): string {
  const url = baseURL.toLowerCase();
  if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes(":11434")) {
    return "Local (Ollama-compatible)";
  }
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
  const provider = describeProvider(baseURL);
  const checkedAt = new Date().toISOString();

  const start = Date.now();
  try {
    const client = createOpenAIClient(llm);

    await withTimeout(client.models.list(), config.modelHealthTimeoutMs);

    const latencyMs = Date.now() - start;
    const isLocal = provider.startsWith("Local");

    return {
      online: true,
      configured: true,
      model,
      provider,
      baseURL,
      latencyMs,
      message: isLocal
        ? `Provider reachable (${latencyMs}ms). First chat may take longer while the model loads into memory.`
        : `Model API online (${latencyMs}ms).`,
      checkedAt,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const { message } = formatOpenAIError(error);

    return {
      online: false,
      configured: true,
      model,
      provider,
      baseURL,
      latencyMs,
      message,
      checkedAt,
    };
  }
}
