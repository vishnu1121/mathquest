// Any provider that speaks the OpenAI chat-completions shape: OpenAI, Groq, OpenRouter, Together,
// Google's OpenAI compatibility endpoint, or a local model. Plain fetch, so no extra dependency.
// The reply is parsed and validated against the same zod schema the Anthropic adapter uses.
import { toJSONSchema, type z } from "zod";

export interface ChatConfig { apiKey: string; baseUrl: string; model: string; timeout: number; maxTokens?: number }

/** A provider answered with an HTTP error; the status decides how the route replies. */
export class ProviderHttpError extends Error {
  constructor(readonly status: number, readonly detail: string) {
    super(`Provider responded ${status}`);
    this.name = "ProviderHttpError";
  }
}

interface ChatMessage { role: "system" | "user"; content: string }
interface ChatReply { choices?: { message?: { content?: string | null } }[] }

async function chat(config: ChatConfig, messages: ChatMessage[], maxTokens: number, responseFormat?: unknown): Promise<string | null> {
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages, max_tokens: maxTokens, temperature: 0.7, ...(responseFormat ? { response_format: responseFormat } : {}) }),
    signal: AbortSignal.timeout(config.timeout),
  });
  if (!response.ok) throw new ProviderHttpError(response.status, (await response.text().catch(() => "")).slice(0, 300));
  const data = (await response.json()) as ChatReply;
  const text = data.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/** Models often wrap JSON in a code fence; take the first balanced object either way. */
function parseObject(raw: string): unknown {
  const text = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const unsupportedFormat = (error: unknown) => error instanceof ProviderHttpError && [400, 404, 415, 422, 501].includes(error.status);

export async function writeJson<T extends z.ZodType>(system: string, userContent: string, schema: T, config: ChatConfig): Promise<z.infer<T> | null> {
  const jsonSchema = toJSONSchema(schema, { io: "output" });
  const budget = config.maxTokens ?? 1024;
  const messages: ChatMessage[] = [{ role: "system", content: system }, { role: "user", content: userContent }];
  let raw: string | null;
  try {
    raw = await chat(config, messages, budget, { type: "json_schema", json_schema: { name: "reply", strict: true, schema: jsonSchema } });
  } catch (error) {
    // Not every model supports a strict schema; ask for plain JSON and let the schema check below do the work.
    if (!unsupportedFormat(error)) throw error;
    const described: ChatMessage[] = [{ role: "system", content: `${system}\n\nReply with JSON only, matching this schema:\n${JSON.stringify(jsonSchema)}` }, messages[1]!];
    raw = await chat(config, described, budget, { type: "json_object" }).catch((second) => {
      if (!unsupportedFormat(second)) throw second;
      return chat(config, described, budget);
    });
  }
  if (!raw) return null;
  const parsed = schema.safeParse(parseObject(raw));
  return parsed.success ? (parsed.data as z.infer<T>) : null;
}

export async function writeText(system: string, userContent: string, config: ChatConfig): Promise<string | null> {
  const raw = await chat(config, [{ role: "system", content: system }, { role: "user", content: userContent }], 2048);
  return raw ? raw.replace(/^```(?:\w+)?/i, "").replace(/```$/, "").trim() || null : null;
}

export function classify(error: unknown): "unauthorized" | "busy" | null {
  if (error instanceof ProviderHttpError) {
    if (error.status === 401 || error.status === 403) return "unauthorized";
    if (error.status === 429 || error.status >= 500) return "busy";
    return null;
  }
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) return "busy";
  return null;
}
