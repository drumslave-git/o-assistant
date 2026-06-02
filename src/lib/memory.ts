import { prisma } from "./db";
import { normalizeMemoryField } from "./assistant-format";

export type MemoryCandidate = {
  category: string;
  content: string;
  importance: number;
};

export async function getMemoriesForPrompt(userId: string, limit = 30) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export function formatMemoriesForSystem(memories: { category: string; content: string }[]) {
  if (memories.length === 0) {
    return "Stored memories about the user: (none yet)";
  }
  const lines = memories.map((m) => `- ${m.content}`);
  return `Stored memories about the user (do not duplicate in the memory field):\n${lines.join("\n")}`;
}

export async function storeMemoryCandidates(
  userId: string,
  candidates: MemoryCandidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;

  const existing = await getMemoriesForPrompt(userId, 100);
  const existingKeys = new Set(existing.map((m) => m.content.toLowerCase()));
  let added = 0;

  for (const mem of candidates) {
    const content = mem.content.trim();
    if (!content) continue;

    const key = content.toLowerCase();
    if (existingKeys.has(key)) continue;

    await prisma.memory.create({
      data: {
        userId,
        category: mem.category,
        content,
        importance: Math.min(5, Math.max(1, mem.importance)),
      },
    });
    existingKeys.add(key);
    added += 1;
  }

  return added;
}

export async function storeAssistantMemories(
  userId: string,
  memory: string | string[] | null | undefined,
): Promise<number> {
  const items = normalizeMemoryField(memory);
  const candidates: MemoryCandidate[] = items.map((content) => ({
    category: "fact",
    content,
    importance: 3,
  }));
  return storeMemoryCandidates(userId, candidates);
}
