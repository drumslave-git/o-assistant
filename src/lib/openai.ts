import OpenAI from "openai";
import { config } from "./config";
import type { LlmUserConfig } from "./llm-types";

export function llmApiKey(llm: LlmUserConfig): string {
  return llm.apiKey.trim();
}

export function createOpenAIClient(llm: LlmUserConfig) {
  const apiKey = llmApiKey(llm);

  return new OpenAI({
    // SDK requires a string; omit Authorization on the wire when the user left key empty.
    apiKey: apiKey || "unused",
    baseURL: llm.baseURL,
    timeout: config.modelTimeoutMs,
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      if (!apiKey) {
        headers.delete("Authorization");
      }
      return fetch(url, { ...init, headers });
    },
  });
}
