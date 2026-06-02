import { z } from "zod";

export const ASSISTANT_JSON_INSTRUCTIONS = `## Response format (required)

You MUST respond with a single JSON object only. No markdown, no code fences, no text outside the JSON.

Schema:
{
  "message": "your natural language reply to the user",
  "memory": null | "one new fact about the user" | ["fact 1", "fact 2"]
}

Field rules:
- "message": What you say to the user. Warm, helpful, concise unless they want depth. Never mention JSON or the memory field.
- "memory": NEW durable facts learned from this turn (location, job, skills, hobbies, goals, preferences). Use short standalone phrases (e.g. "Lives in Ukraine", "Front-end lead developer, 10+ years experience", "Hobby: PC gaming"). Use null when nothing new. Do not repeat facts already listed in your memory section below. String or array of strings.`;

const responseSchema = z.object({
  message: z.string().min(1),
  memory: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
});

export type ParsedAssistantResponse = z.infer<typeof responseSchema>;

export function parseAssistantResponse(raw: string): ParsedAssistantResponse {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    : trimmed;

  try {
    const data = JSON.parse(jsonText) as unknown;
    const parsed = responseSchema.safeParse(data);
    if (parsed.success) return parsed.data;
  } catch {
    // fall through
  }

  return { message: raw.trim() || "I couldn't format my response.", memory: null };
}

export function normalizeMemoryField(
  memory: string | string[] | null | undefined,
): string[] {
  if (memory == null) return [];
  const items = Array.isArray(memory) ? memory : [memory];
  return items.map((m) => m.trim()).filter(Boolean);
}
