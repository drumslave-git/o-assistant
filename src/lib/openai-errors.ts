import OpenAI from "openai";

export function formatOpenAIError(error: unknown): { message: string; status: number } {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      const quota =
        error.code === "insufficient_quota" || error.type === "insufficient_quota";
      return {
        status: 429,
        message: quota
          ? "OpenAI quota exceeded. Add billing at platform.openai.com/account/billing, or switch to a local provider in Settings → Model (e.g. Ollama)."
          : "Rate limit exceeded. Wait a moment and try again.",
      };
    }
    if (error.status === 401) {
      const detail = error.message?.trim();
      return {
        status: 401,
        message:
          detail && detail !== "Unauthorized"
            ? detail
            : "Provider returned unauthorized. Check base URL and API key in Settings → Model.",
      };
    }
    return {
      status: error.status ?? 502,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes("Timed out") || error.name === "TimeoutError") {
      return {
        status: 504,
        message:
          "Model request timed out. If using Ollama, the model may still be loading — wait and try again, or run `ollama run <model>` in a terminal first.",
      };
    }
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "An unexpected error occurred" };
}
