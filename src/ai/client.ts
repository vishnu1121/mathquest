// Browser side of the AI features. Every call is optional: on any error, timeout or refusal it
// returns null and the game keeps its built-in text. Once the server reports that AI is off,
// the client stops asking for the rest of the session.
import type { AiRequest, AiResponse } from "./schemas";

let unavailable = false;

export async function askAi(request: AiRequest, timeoutMs = 4000): Promise<string | null> {
  if (unavailable || typeof fetch === "undefined") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const data = (await response.json()) as AiResponse;
    if (data.ok) return data.text;
    if (data.reason === "unavailable") unavailable = true;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
