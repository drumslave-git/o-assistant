import type OpenAI from "openai";

/** Keep model loaded in VRAM until manually unloaded (Ollama). */
export const OLLAMA_KEEP_ALIVE = -1;

const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/i;

export function ollamaNativeBase(baseURL: string): string {
  return baseURL.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

/** Heuristic: likely Ollama or local OpenAI-compatible LLM on LAN. */
export function isOllamaCompatible(baseURL: string): boolean {
  const url = baseURL.toLowerCase();
  if (url.includes("ollama") || url.includes(":11434")) return true;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return true;

  try {
    const host = new URL(baseURL).hostname;
    return PRIVATE_HOST.test(host);
  } catch {
    return false;
  }
}

/** Confirm Ollama via /api/version when the URL heuristic is ambiguous. */
export async function probeOllamaEndpoint(baseURL: string): Promise<boolean> {
  if (isOllamaCompatible(baseURL)) return true;

  try {
    const root = ollamaNativeBase(baseURL);
    const res = await fetch(`${root}/api/version`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string";
  } catch {
    return false;
  }
}

export async function resolveOllamaEndpoint(baseURL: string): Promise<boolean> {
  return probeOllamaEndpoint(baseURL);
}

export function withOllamaKeepAlive<T extends OpenAI.Chat.ChatCompletionCreateParams>(
  baseURL: string,
  params: T,
): T {
  if (!isOllamaCompatible(baseURL)) return params;
  return { ...params, keep_alive: OLLAMA_KEEP_ALIVE } as T;
}

type OllamaPsModel = { name?: string; model?: string };

export async function listOllamaLoadedModels(baseURL: string): Promise<string[]> {
  const root = ollamaNativeBase(baseURL);
  const res = await fetch(`${root}/api/ps`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Ollama /api/ps failed (${res.status})`);
  }

  const data = (await res.json()) as { models?: OllamaPsModel[] };
  const models = data.models ?? [];
  return models
    .map((m) => m.name ?? m.model ?? "")
    .filter((name) => name.length > 0);
}

/** Request Ollama to unload the model from memory (keep_alive: 0). */
export async function unloadOllamaModel(
  baseURL: string,
  model: string,
): Promise<void> {
  const root = ollamaNativeBase(baseURL);
  const res = await fetch(`${root}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "",
      stream: false,
      keep_alive: 0,
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(
      `Failed to unload model (${res.status})${details ? `: ${details.slice(0, 200)}` : ""}`,
    );
  }
}

export function isModelLoadedInOllama(
  configuredModel: string,
  loadedModels: string[],
): boolean {
  const target = configuredModel.toLowerCase();
  return loadedModels.some(
    (name) =>
      name.toLowerCase() === target ||
      name.toLowerCase().startsWith(`${target}:`) ||
      target.startsWith(`${name.toLowerCase()}:`),
  );
}
