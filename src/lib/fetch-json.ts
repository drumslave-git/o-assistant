export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  const text = await res.text();

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: { message?: string } };
        message = body.error?.message ?? message;
      } catch {
        message = text.slice(0, 200);
      }
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
