import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { getLlmConfig } from "@/lib/llm-config";
import { ensureDefaultUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  if (!checkApiAuth(request)) {
    return jsonError("Invalid API key", 401);
  }

  const user = await ensureDefaultUser();
  const llm = await getLlmConfig(user.id);
  const model = llm.model;
  return NextResponse.json({
    object: "list",
    data: [
      {
        id: model,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "o-assistant",
      },
      {
        id: "o-assistant",
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "o-assistant",
      },
    ],
  });
}
