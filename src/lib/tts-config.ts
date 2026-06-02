import { prisma } from "./db";
import {
  fetchKokoroCatalog,
  KOKORO_FASTAPI_DEFAULTS,
  normalizeKokoroBaseURL,
  synthesizeKokoroSpeech,
} from "./kokoro-fastapi";
import type { TtsCatalog, TtsResponseFormat, TtsUserConfig } from "./tts-types";

export function defaultTtsConfig(): TtsUserConfig {
  return { ...KOKORO_FASTAPI_DEFAULTS };
}

function normalizeConfig(partial: Partial<TtsUserConfig>): TtsUserConfig {
  const base = defaultTtsConfig();
  const responseFormat = partial.responseFormat;
  const validFormats: TtsResponseFormat[] = [
    "mp3",
    "wav",
    "opus",
    "flac",
    "m4a",
    "pcm",
  ];

  return {
    baseURL: normalizeKokoroBaseURL(partial.baseURL ?? base.baseURL),
    apiKey: partial.apiKey ?? base.apiKey,
    model: partial.model?.trim() || base.model,
    voice: partial.voice?.trim() || base.voice,
    speed: Math.min(5, Math.max(0.25, partial.speed ?? base.speed)),
    responseFormat: validFormats.includes(responseFormat as TtsResponseFormat)
      ? (responseFormat as TtsResponseFormat)
      : base.responseFormat,
  };
}

export async function getTtsConfig(userId: string): Promise<TtsUserConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ttsConfig: true },
  });

  const stored = user?.ttsConfig as Partial<TtsUserConfig> | null;
  if (!stored || Object.keys(stored).length === 0) {
    return defaultTtsConfig();
  }

  return normalizeConfig(stored);
}

export async function setTtsConfig(
  userId: string,
  partial: Partial<TtsUserConfig>,
): Promise<TtsUserConfig> {
  const current = await getTtsConfig(userId);
  const next = normalizeConfig({ ...current, ...partial });

  await prisma.user.update({
    where: { id: userId },
    data: { ttsConfig: next },
  });

  return next;
}

export async function fetchTtsCatalog(
  baseURL: string,
  apiKey: string,
): Promise<TtsCatalog> {
  return fetchKokoroCatalog(baseURL, apiKey);
}

export async function synthesizeSpeech(
  tts: TtsUserConfig,
  text: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  return synthesizeKokoroSpeech(tts, text);
}
