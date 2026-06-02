import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message, type: "invalid_request_error" } }, { status });
}
