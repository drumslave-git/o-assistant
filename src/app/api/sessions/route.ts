import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/user";
import { jsonError } from "@/lib/api";

export async function GET() {
  const user = await ensureDefaultUser();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ sessions });
}

const createSchema = z.object({
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = createSchema.safeParse(
    request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : {},
  );

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      title: parsed.success ? parsed.data.title : undefined,
    },
  });

  return NextResponse.json({ session }, { status: 201 });
}
