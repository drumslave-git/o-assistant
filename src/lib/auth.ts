import { NextRequest } from "next/server";
import { config } from "./config";

export function checkApiAuth(request: NextRequest): boolean {
  if (!config.apiSecret) return true;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  return header.slice(7) === config.apiSecret;
}
