import { NextResponse } from "next/server";
import { getLlmConfig } from "@/lib/llm-config";
import { checkModelStatus } from "@/lib/model-status";
import { ensureDefaultUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await ensureDefaultUser();
  const llm = await getLlmConfig(user.id);
  const status = await checkModelStatus(llm);
  return NextResponse.json(status);
}
