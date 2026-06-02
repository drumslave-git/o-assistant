import type { KokoroVoice, TtsCatalog, TtsUserConfig } from "./tts-types";

/** Defaults for a local Kokoro-FastAPI instance (remsky/Kokoro-FastAPI). */
export const KOKORO_FASTAPI_DEFAULTS: TtsUserConfig = {
  baseURL: "http://localhost:8880/v1",
  apiKey: "",
  model: "kokoro",
  voice: "af_bella",
  speed: 1,
  responseFormat: "mp3",
};

export const KOKORO_FASTAPI_DOCS = "https://github.com/remsky/Kokoro-FastAPI";
export const KOKORO_FASTAPI_WEB_UI = "http://localhost:8880/web";

/** Kokoro-FastAPI exposes OpenAI-compatible routes under /v1 (not /audio/... at root). */
export function normalizeKokoroBaseURL(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return KOKORO_FASTAPI_DEFAULTS.baseURL;
  if (/\/v1$/i.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function authHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key = apiKey.trim();
  if (key) {
    headers.Authorization = key.startsWith("Bearer ") ? key : `Bearer ${key}`;
  }
  return headers;
}

function normalizeVoice(raw: Record<string, unknown>): KokoroVoice {
  const id = String(raw.id ?? raw.voice_id ?? "");
  return {
    id,
    name: String(raw.name ?? id),
    gender: raw.gender ? String(raw.gender) : undefined,
    targetQuality: raw.targetQuality ? String(raw.targetQuality) : undefined,
    overallGrade: raw.overallGrade ? String(raw.overallGrade) : undefined,
    lang:
      raw.lang && typeof raw.lang === "object"
        ? {
            id: String((raw.lang as { id?: string }).id ?? ""),
            name: String((raw.lang as { name?: string }).name ?? ""),
          }
        : undefined,
  };
}

export async function fetchKokoroCatalog(
  baseURL: string,
  apiKey: string,
): Promise<TtsCatalog> {
  const base = normalizeKokoroBaseURL(baseURL);
  const headers = authHeaders(apiKey);

  const voicesRes = await fetch(`${base}/audio/voices`, { headers });
  if (!voicesRes.ok) {
    const details = await voicesRes.text().catch(() => "");
    throw new Error(
      `Could not reach Kokoro-FastAPI (${voicesRes.status}). Is it running on ${base}? ${details}`.trim(),
    );
  }

  const voicesJson = (await voicesRes.json()) as
    | KokoroVoice[]
    | { voices?: unknown[] };

  const rawVoices = Array.isArray(voicesJson)
    ? voicesJson
    : (voicesJson.voices ?? []);

  const voices = rawVoices
    .filter((v): v is Record<string, unknown> => v !== null && typeof v === "object")
    .map(normalizeVoice)
    .filter((v) => v.id);

  const langs = new Map<string, { id: string; name: string }>();
  for (const v of voices) {
    if (v.lang?.id) {
      langs.set(v.lang.id, { id: v.lang.id, name: v.lang.name || v.lang.id });
    }
  }

  return {
    langs: [...langs.values()],
    models: [{ id: "kokoro", quantization: "Kokoro-FastAPI" }],
    voices,
  };
}

export async function synthesizeKokoroSpeech(
  tts: TtsUserConfig,
  text: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const base = normalizeKokoroBaseURL(tts.baseURL);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(tts.apiKey),
  };

  const response = await fetch(`${base}/audio/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: tts.model || "kokoro",
      voice: tts.voice,
      input: text,
      response_format: tts.responseFormat,
      speed: tts.speed,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Kokoro-FastAPI synthesis failed (${response.status}): ${details || "No details"}`,
    );
  }

  const format = tts.responseFormat.toLowerCase();
  const contentTypeByFormat: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    opus: "audio/opus",
    flac: "audio/flac",
    m4a: "audio/mp4",
    pcm: "audio/L16",
  };

  return {
    buffer: await response.arrayBuffer(),
    contentType:
      response.headers.get("content-type") ??
      contentTypeByFormat[format] ??
      "audio/mpeg",
  };
}
