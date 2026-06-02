import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDefaultUser } from "@/lib/user";
import { getCustomInstructions, setCustomInstructions } from "@/lib/instructions";
import { jsonError } from "@/lib/api";

export async function GET() {
  const user = await ensureDefaultUser();
  const instructions = await getCustomInstructions(user.id);
  return NextResponse.json({ instructions });
}

const updateSchema = z.object({
  instructions: z.string().max(8000),
});

export async function PUT(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const instructions = await setCustomInstructions(
    user.id,
    parsed.data.instructions,
  );
  return NextResponse.json({ instructions });
}
