export const config = {
  defaultUserId: process.env.DEFAULT_USER_ID ?? "me",
  modelTimeoutMs: Number(process.env.MODEL_REQUEST_TIMEOUT_MS) || 120_000,
  modelHealthTimeoutMs: Number(process.env.MODEL_HEALTH_TIMEOUT_MS) || 15_000,
  apiSecret: process.env.API_SECRET ?? "",
} as const;
