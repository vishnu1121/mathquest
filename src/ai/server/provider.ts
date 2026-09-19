// Server-only model access. The game asks for one small structured reply; which provider answers is configuration,
// not code. Keys never leave the server. Nothing downstream (prompts, validators, guards, routes) is provider-aware.
//
//   AI_PROVIDER   anthropic (default) | openai | groq | openrouter | together | gemini | ollama | custom
//   AI_MODEL      the model name at that provider (Anthropic defaults to claude-opus-5)
//   AI_API_KEY    the key for that provider (ANTHROPIC_API_KEY still works for Anthropic)
//   AI_BASE_URL   only for AI_PROVIDER=custom, or to override a known provider's URL
//   AI_ENABLED    set to "false" to switch every AI helper off while keeping the key in place
//
// The step-by-step explainer runs on its OWN account, so a child asking "how?" can never eat the
// budget the rest of the game needs. Same five names, EXPLAIN_ prefixed:
//
//   EXPLAIN_AI_PROVIDER / EXPLAIN_AI_API_KEY / EXPLAIN_AI_MODEL / EXPLAIN_AI_BASE_URL / EXPLAIN_AI_ENABLED
//
// There is deliberately NO fallback from the explain channel to the default key. Falling back would
// quietly reintroduce exactly the shared-quota problem the second account exists to remove: one
// curious class could drain the key that hints, coaching and Story Lab all depend on.
//
// Fresh question generation is the highest-volume call in the game — one per question answered — so it gets
// its own pair of accounts for the same reason, and for one more: a chain needs somewhere to fall to.
//
//   GEN_AI_*    the PRIMARY question writer
//   GEN2_AI_*   the SECONDARY, tried only when the primary fails or answers with something unusable
//
// Neither falls back to the default or explain keys. With both unset, generation is simply off and every
// question comes from the built-in bank, which is exactly what is supposed to happen when AI is unavailable.
import type { z } from "zod";
import * as anthropic from "./anthropic";
import * as openai from "./openaiCompatible";

/** Base URLs for providers that speak the OpenAI chat shape, so a key and a model name are enough. */
const OPENAI_COMPATIBLE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  ollama: "http://localhost:11434/v1",
};
const TIMEOUT = 8000;
/**
 * How many tokens a reply may use.
 *
 * On a reasoning model the thinking counts against this too, so the ceiling is not really "how long may
 * the answer be" — it is "how long may the answer plus the working out be". Measured against Groq's
 * gpt-oss-120b: at 1024 the short tasks are fine, but a question-writing request — a long brief, a
 * worked program to produce, and Apex's extra rules on top — reasons past the limit and the JSON arrives
 * truncated, which the provider rejects with a 400 before this code ever sees it. Five Apex requests in
 * six failed that way. It is a ceiling, not a spend: a short reply still costs a short reply.
 */
const REPLY_TOKENS = 1024;
const WRITER_REPLY_TOKENS = 3000;

/**
 * Which account answers.
 *
 * Four jobs, each with an understudy (ai/adventure/chain.ts holds the pairing). The understudy exists
 * because a free-tier key does not fail politely: it runs out mid-session, and without a second account
 * the feature it was carrying goes quiet until somebody notices.
 *
 *   default / default2   everything general — Hoot's coaching, Story Lab, narration, diagnosis
 *   hint / hint2         Hoot's hints, the helper a stuck child reaches for most
 *   explain / explain2   "You wanna know how?"
 *   gen / gen2           fresh questions, one per question answered
 */
export type Channel = "default" | "default2" | "hint" | "hint2" | "explain" | "explain2" | "gen" | "gen2";

/** Env var names per channel, so the configurations cannot be confused for one another. */
const ENV: Record<Channel, { provider: string; key: string; model: string; baseUrl: string; enabled: string }> = {
  default: { provider: "AI_PROVIDER", key: "AI_API_KEY", model: "AI_MODEL", baseUrl: "AI_BASE_URL", enabled: "AI_ENABLED" },
  explain: { provider: "EXPLAIN_AI_PROVIDER", key: "EXPLAIN_AI_API_KEY", model: "EXPLAIN_AI_MODEL", baseUrl: "EXPLAIN_AI_BASE_URL", enabled: "EXPLAIN_AI_ENABLED" },
  gen: { provider: "GEN_AI_PROVIDER", key: "GEN_AI_API_KEY", model: "GEN_AI_MODEL", baseUrl: "GEN_AI_BASE_URL", enabled: "GEN_AI_ENABLED" },
  gen2: { provider: "GEN2_AI_PROVIDER", key: "GEN2_AI_API_KEY", model: "GEN2_AI_MODEL", baseUrl: "GEN2_AI_BASE_URL", enabled: "GEN2_AI_ENABLED" },
  default2: { provider: "AI2_PROVIDER", key: "AI2_API_KEY", model: "AI2_MODEL", baseUrl: "AI2_BASE_URL", enabled: "AI2_ENABLED" },
  hint: { provider: "HINT_AI_PROVIDER", key: "HINT_AI_API_KEY", model: "HINT_AI_MODEL", baseUrl: "HINT_AI_BASE_URL", enabled: "HINT_AI_ENABLED" },
  hint2: { provider: "HINT2_AI_PROVIDER", key: "HINT2_AI_API_KEY", model: "HINT2_AI_MODEL", baseUrl: "HINT2_AI_BASE_URL", enabled: "HINT2_AI_ENABLED" },
  explain2: { provider: "EXPLAIN2_AI_PROVIDER", key: "EXPLAIN2_AI_API_KEY", model: "EXPLAIN2_AI_MODEL", baseUrl: "EXPLAIN2_AI_BASE_URL", enabled: "EXPLAIN2_AI_ENABLED" },
};

export interface ProviderSettings {
  name: string;
  anthropic: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  maxTokens: number;
}

/** Reads the environment on every call, so a changed .env.local takes effect on the next request in dev. */
export function settings(channel: Channel = "default"): ProviderSettings {
  const env = ENV[channel];
  // ANTHROPIC_API_KEY is only ever a shorthand for the default channel; the explain channel has to be
  // configured explicitly, or it is off.
  const legacyKey = channel === "default" ? process.env.ANTHROPIC_API_KEY : undefined;
  const named = (process.env[env.provider] || "").trim().toLowerCase();
  const name = named || (legacyKey ? "anthropic" : "");
  const isAnthropic = name === "anthropic";
  // The shorthand key is an Anthropic key, so it is only ever offered to Anthropic. It used to stand in for a
  // missing AI_API_KEY whatever the provider was, which meant a half-configured groq or openrouter setup sent
  // an Anthropic key as a bearer token to somebody else's host.
  const apiKey = (isAnthropic ? legacyKey || process.env[env.key] : process.env[env.key]) || "";
  return {
    name,
    anthropic: isAnthropic,
    apiKey,
    baseUrl: (process.env[env.baseUrl] || OPENAI_COMPATIBLE[name] || "").trim(),
    model: (process.env[env.model] || (isAnthropic ? anthropic.DEFAULT_MODEL : "")).trim(),
    timeout: TIMEOUT,
    maxTokens: channel.startsWith("gen") ? WRITER_REPLY_TOKENS : REPLY_TOKENS,
  };
}

/** True when a provider, a key and (for OpenAI-compatible providers) a URL and model are all present. */
export function aiConfigured(channel: Channel = "default"): boolean {
  if (process.env[ENV[channel].enabled] === "false") return false;
  const s = settings(channel);
  if (!s.apiKey || !s.name) return false;
  return s.anthropic ? Boolean(s.model) : Boolean(s.baseUrl && s.model);
}

/** One small structured reply, shaped and then re-checked by the caller's zod schema. Null means unusable. */
export async function writeJson<T extends z.ZodType>(system: string, userContent: string, schema: T, channel: Channel = "default"): Promise<z.infer<T> | null> {
  const s = settings(channel);
  return s.anthropic ? anthropic.writeJson(system, userContent, schema, s) : openai.writeJson(system, userContent, schema, s);
}

/** One short piece of plain text. Null means unusable. */
export async function writeText(system: string, userContent: string, channel: Channel = "default"): Promise<string | null> {
  const s = settings(channel);
  return s.anthropic ? anthropic.writeText(system, userContent, s) : openai.writeText(system, userContent, s);
}

/**
 * How a failed request should be answered: a rejected key turns AI off for the session, a rate limit or a
 * timeout is temporary, and anything else is treated as temporary too.
 */
export function classifyProviderError(error: unknown): "unauthorized" | "busy" | "error" {
  return anthropic.classify(error) ?? openai.classify(error) ?? "error";
}

/** For the grown-ups panel and logs: which provider and model would answer, with no key material. */
export function providerInfo(channel: Channel = "default"): { provider: string; model: string } | null {
  const s = settings(channel);
  return aiConfigured(channel) ? { provider: s.name, model: s.model } : null;
}
