import { z } from "zod";
import { jsonrepair } from "jsonrepair";
import { EMOTION_JSON_RULES, normalizeEmotion } from "./emotion";
import type { AssistantEmotion } from "./emotion-types";
import { DEFAULT_EMOTION } from "./emotion-types";

/** Hidden trailer; markdown renderers do not show HTML comments. */
export const ASSISTANT_META_MARKER = "<!--O_META";

export const ASSISTANT_REPLY_INSTRUCTIONS = `## How to reply

Write your **entire** answer as normal markdown in the message body:
- prose, lists, \`\`\`language code blocks, more prose, another code block — whatever fits.
- Do not wrap your reply in JSON. Do not put the whole answer inside a JSON string.

After your markdown reply, on a new line, append metadata in this exact form (one line, no spaces inside the tag name):
<!--O_META{"memory":null,"emotion":{"mood":"calm","label":"Short label","note":"optional"}}-->

Replace the JSON inside the comment with real values. "memory" follows the same rules as before (null, string, or array of strings). ${EMOTION_JSON_RULES}

The user must never see the O_META comment — only your markdown above it.`;

const emotionSchema = z.object({
  mood: z.string(),
  label: z.string(),
  note: z.string().optional(),
});

const metaSchema = z.object({
  memory: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  emotion: emotionSchema.optional(),
});

const legacyJsonSchema = z.object({
  message: z.string().min(1),
  memory: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  emotion: emotionSchema.optional(),
});

export type ParsedAssistantResponse = {
  message: string;
  memory?: string | string[] | null;
  emotion: AssistantEmotion;
};

function parseMetaJson(jsonText: string): z.infer<typeof metaSchema> | null {
  try {
    return metaSchema.parse(JSON.parse(jsonText));
  } catch {
    try {
      return metaSchema.parse(JSON.parse(jsonrepair(jsonText)));
    } catch {
      return null;
    }
  }
}

function parseMetaTrailer(raw: string, previousEmotion?: AssistantEmotion): {
  memory: string | string[] | null | undefined;
  emotion: AssistantEmotion;
} | null {
  const start = raw.indexOf(ASSISTANT_META_MARKER);
  if (start === -1) return null;

  const afterMarker = raw.slice(start + ASSISTANT_META_MARKER.length);
  const end = afterMarker.indexOf("-->");
  if (end === -1) return null;

  const jsonText = afterMarker.slice(0, end).trim();
  const meta = parseMetaJson(jsonText);
  if (!meta) return null;

  return {
    memory: meta.memory,
    emotion: meta.emotion
      ? normalizeEmotion(meta.emotion)
      : (previousEmotion ?? DEFAULT_EMOTION),
  };
}

function parseLegacyJsonEnvelope(
  raw: string,
  previousEmotion?: AssistantEmotion,
): ParsedAssistantResponse | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    try {
      data = JSON.parse(jsonrepair(trimmed));
    } catch {
      return null;
    }
  }

  const parsed = legacyJsonSchema.safeParse(data);
  if (!parsed.success) {
    if (typeof data === "object" && data !== null && "message" in data) {
      const o = data as { message?: unknown };
      if (typeof o.message === "string") {
        return {
          message: o.message,
          memory: null,
          emotion: previousEmotion ?? DEFAULT_EMOTION,
        };
      }
    }
    return null;
  }

  return {
    message: parsed.data.message,
    memory: parsed.data.memory,
    emotion: parsed.data.emotion
      ? normalizeEmotion(parsed.data.emotion)
      : (previousEmotion ?? DEFAULT_EMOTION),
  };
}

export function parseAssistantResponse(
  raw: string,
  previousEmotion?: AssistantEmotion,
): ParsedAssistantResponse {
  const meta = parseMetaTrailer(raw, previousEmotion);
  const markerAt = raw.indexOf(ASSISTANT_META_MARKER);

  if (markerAt !== -1) {
    const message = raw.slice(0, markerAt).trim();
    return {
      message: message || "I couldn't format my response.",
      memory: meta?.memory ?? null,
      emotion: meta?.emotion ?? previousEmotion ?? DEFAULT_EMOTION,
    };
  }

  const legacy = parseLegacyJsonEnvelope(raw, previousEmotion);
  if (legacy) return legacy;

  return {
    message: raw.trim() || "I couldn't format my response.",
    memory: null,
    emotion: previousEmotion ?? DEFAULT_EMOTION,
  };
}

export function normalizeMemoryField(
  memory: string | string[] | null | undefined,
): string[] {
  if (memory == null) return [];
  const items = Array.isArray(memory) ? memory : [memory];
  return items.map((m) => m.trim()).filter(Boolean);
}
