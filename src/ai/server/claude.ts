// Server-only Claude client. Imported only by the /api/ai route, so the API key never reaches the browser.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { textOutputSchema } from "../schemas";

export const MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_ENABLED !== "false";
}

function getClient(): Anthropic {
  // Children are waiting on the answer: fail fast and let the game use its built-in text.
  client ??= new Anthropic({ maxRetries: 0, timeout: 8000 });
  return client;
}

/** Asks Claude for one short piece of text. Returns null on a refusal or an unusable reply. */
export async function writeText(system: string, userContent: string): Promise<string | null> {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
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
