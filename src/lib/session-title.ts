import { prisma } from "./db";
import { getLlmConfig } from "./llm-config";
import { withOllamaKeepAlive } from "./ollama";
import { createOpenAIClient } from "./openai";

const TITLE_PROMPT = `You create short chat titles for a sidebar (like ChatGPT).
Given the opening exchange, output JSON only: {"title": "Your Title Here"}

Rules:
- 3–6 words, concise, specific to the topic
- Same language as the user's message
- No quotes, emojis, or trailing punctuation
- Not generic ("Chat", "Conversation", "Question")`;

function fallbackTitle(userMessage: string): string {
  const line = userMessage.trim().split(/\n/)[0] ?? "New chat";
  return line.length > 48 ? `${line.slice(0, 45)}…` : line || "New chat";
}

function parseTitleJson(raw: string): string | null {
  try {
    const data = JSON.parse(raw.trim()) as { title?: string };
    const title = data.title?.trim();
    if (!title) return null;
    return title.length > 80 ? `${title.slice(0, 77)}…` : title;
  } catch {
    const match = raw.trim().match(/"title"\s*:\s*"([^"]+)"/);
    return match?.[1]?.trim() ?? null;
  }
}

export async function generateSessionTitle(
  userId: string,
  userMessage: string,
  assistantMessage: string,
): Promise<string> {
  const trimmedUser = userMessage.trim().slice(0, 800);
  const trimmedAssistant = assistantMessage.trim().slice(0, 800);

  try {
    const llm = await getLlmConfig(userId);
    const client = createOpenAIClient(llm);

    const completion = await client.chat.completions.create(
      withOllamaKeepAlive(llm.baseURL, {
        model: llm.model,
        messages: [
          { role: "system", content: TITLE_PROMPT },
          {
            role: "user",
            content: `User:\n${trimmedUser}\n\nAssistant:\n${trimmedAssistant || "(no reply yet)"}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 40,
      }),
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    const title = parseTitleJson(raw);
    if (title) return title;
  } catch {
    // use fallback
  }

  return fallbackTitle(trimmedUser);
}

/** Generate a title once after the first exchange, if the session has none. */
export async function maybeGenerateSessionTitle(
  sessionId: string,
  userId: string,
): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { title: true },
  });
  if (session?.title?.trim()) return null;

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 4,
    select: { role: true, content: true },
  });

  const userMsg = messages.find((m) => m.role === "user")?.content;
  if (!userMsg?.trim()) return null;

  const assistantMsg =
    messages.find((m) => m.role === "assistant")?.content ?? "";

  const title = await generateSessionTitle(userId, userMsg, assistantMsg);

  await prisma.session.update({
    where: { id: sessionId },
    data: { title },
  });

  return title;
}
