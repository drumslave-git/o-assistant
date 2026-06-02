import { prisma } from "./db";
import type { LlmUserConfig } from "./llm-types";

export const LLM_DEFAULTS: LlmUserConfig = {
  apiKey: "",
  baseURL: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
};

export function normalizeLlmBaseURL(baseURL: string): string {
  return baseURL.trim().replace(/\/+$/, "");
}

function normalizeConfig(partial: Partial<LlmUserConfig>): LlmUserConfig {
  const base = LLM_DEFAULTS;
  return {
    apiKey: partial.apiKey ?? base.apiKey,
    baseURL: normalizeLlmBaseURL(partial.baseURL ?? base.baseURL),
    model: partial.model?.trim() || base.model,
  };
}

export function defaultLlmConfig(): LlmUserConfig {
  return { ...LLM_DEFAULTS };
}

export async function getLlmConfig(userId: string): Promise<LlmUserConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { llmConfig: true },
  });

  const stored = user?.llmConfig as Partial<LlmUserConfig> | null;
  if (!stored || Object.keys(stored).length === 0) {
    return defaultLlmConfig();
  }

  return normalizeConfig(stored);
}

export async function setLlmConfig(
  userId: string,
  partial: Partial<LlmUserConfig>,
): Promise<LlmUserConfig> {
  const current = await getLlmConfig(userId);
  const next = normalizeConfig({ ...current, ...partial });

  await prisma.user.update({
    where: { id: userId },
    data: { llmConfig: next },
  });

  return next;
}
