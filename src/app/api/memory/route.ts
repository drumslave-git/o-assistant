import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/user";
import { jsonError } from "@/lib/api";

export async function GET() {
  const user = await ensureDefaultUser();
  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ memories });
}

const createSchema = z.object({
  content: z.string().min(1),
  category: z.string().optional(),
  importance: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const memory = await prisma.memory.create({
    data: {
      userId: user.id,
      content: parsed.data.content,
      category: parsed.data.category ?? "fact",
      importance: parsed.data.importance ?? 3,
    },
  });

  return NextResponse.json({ memory }, { status: 201 });
}

const deleteSchema = z.object({ id: z.string() });

export async function DELETE(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const memory = await prisma.memory.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });
  if (!memory) {
    return jsonError("Memory not found", 404);
  }

  await prisma.memory.delete({ where: { id: memory.id } });
  return NextResponse.json({ deleted: true });
}
