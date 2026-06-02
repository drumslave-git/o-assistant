import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { ensureDefaultUser } from "@/lib/user";
import { getLlmConfig, setLlmConfig } from "@/lib/llm-config";

export async function GET() {
  const user = await ensureDefaultUser();
  const config = await getLlmConfig(user.id);
  return NextResponse.json({ config });
}

const updateSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

export async function PUT(request: NextRequest) {
  const user = await ensureDefaultUser();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const config = await setLlmConfig(user.id, parsed.data);
  return NextResponse.json({ config });
}
