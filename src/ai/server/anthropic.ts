// The Anthropic adapter: structured replies through the official SDK, with prompt caching and server-side fallback.
// Selected by AI_PROVIDER=anthropic (or by an ANTHROPIC_API_KEY with no provider named). See provider.ts.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { textOutputSchema } from "../schemas";

export const DEFAULT_MODEL = "claude-opus-5";

// Keyed by the key, not a single slot. There are now four channels, each able to be a different account:
// a one-slot cache handed every later channel the FIRST channel's key, so a second Anthropic account would
// have been billed to the first one with nothing anywhere to say so.
const clients = new Map<string, Anthropic>();
function getClient(apiKey: string, timeout: number): Anthropic {
  const cacheKey = `${apiKey}|${timeout}`;
  let client = clients.get(cacheKey);
  if (!client) {
    // Children are waiting on the answer: fail fast and let the game use its built-in text.
    client = new Anthropic({ apiKey, maxRetries: 0, timeout });
    if (clients.size > 8) clients.clear();
    clients.set(cacheKey, client);
  }
  return client;
}

export async function writeJson<T extends z.ZodType>(system: string, userContent: string, schema: T, config: { apiKey: string; model: string; timeout: number; maxTokens?: number }): Promise<z.infer<T> | null> {
  const response = await getClient(config.apiKey, config.timeout).beta.messages.parse({
    model: config.model,
    max_tokens: config.maxTokens ?? 1024,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") return null;
  return (response.parsed_output as z.infer<T> | null | undefined) ?? null;
}

export async function writeText(system: string, userContent: string, config: { apiKey: string; model: string; timeout: number }): Promise<string | null> {
  const response = await getClient(config.apiKey, config.timeout).beta.messages.parse({
    model: config.model,
    max_tokens: 2048,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent }],
    output_config: { effort: "low", format: betaZodOutputFormat(textOutputSchema) },
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.parsed_output?.text.trim();
  return text ? text : null;
}

/** Recognises the SDK's own error classes so the route can answer without importing the SDK. */
export function classify(error: unknown): "unauthorized" | "busy" | null {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "unauthorized";
  if (error instanceof Anthropic.RateLimitError) return "busy";
  return null;
}
