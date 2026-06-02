import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/user";
import { jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await ensureDefaultUser();

  const session = await prisma.session.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return jsonError("Session not found", 404);
  }

  return NextResponse.json({ session });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await ensureDefaultUser();

  const session = await prisma.session.findFirst({
    where: { id, userId: user.id },
  });

  if (!session) {
    return jsonError("Session not found", 404);
  }

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
