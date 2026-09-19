import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { aiConfigured, classifyProviderError, providerInfo, settings, writeJson, writeText } from "./provider";
import { ProviderHttpError } from "./openaiCompatible";

const schema = z.object({ hint: z.string().max(40) });
const reply = (content: string) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });
const failure = (status: number) => ({ ok: false, status, text: async () => "no" });

function useProvider(env: Record<string, string>) {
  // Every channel's names, or a developer's real .env values leak into the assertions below.
  const names = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "AI_ENABLED"];
  for (const prefix of ["", "EXPLAIN_", "GEN_", "GEN2_"]) for (const key of names) vi.stubEnv(`${prefix}${key}`, "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("provider selection", () => {
  it("needs a provider, a key and, away from Anthropic, a model and a URL", () => {
    useProvider({});
    expect(aiConfigured()).toBe(false);
    useProvider({ ANTHROPIC_API_KEY: "sk-test" });
    expect(aiConfigured()).toBe(true);
    expect(settings()).toMatchObject({ name: "anthropic", anthropic: true, model: "claude-opus-5" });
    useProvider({ AI_PROVIDER: "groq", AI_API_KEY: "gsk-test" });
    expect(aiConfigured()).toBe(false); // no model named
    useProvider({ AI_PROVIDER: "groq", AI_API_KEY: "gsk-test", AI_MODEL: "llama-3.3-70b-versatile" });
    expect(aiConfigured()).toBe(true);
    expect(settings().baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(providerInfo()).toEqual({ provider: "groq", model: "llama-3.3-70b-versatile" });
    useProvider({ AI_PROVIDER: "custom", AI_API_KEY: "k", AI_MODEL: "m" });
    expect(aiConfigured()).toBe(false); // a custom provider must say where
    useProvider({ AI_PROVIDER: "custom", AI_API_KEY: "k", AI_MODEL: "m", AI_BASE_URL: "http://localhost:1234/v1" });
    expect(aiConfigured()).toBe(true);
    useProvider({ AI_PROVIDER: "groq", AI_API_KEY: "gsk", AI_MODEL: "m", AI_ENABLED: "false" });
    expect(aiConfigured()).toBe(false);
    expect(providerInfo()).toBeNull();
  });

  it("never reports key material", () => {
    useProvider({ AI_PROVIDER: "openai", AI_API_KEY: "sk-secret", AI_MODEL: "gpt-4.1-mini" });
    expect(JSON.stringify(providerInfo())).not.toContain("sk-secret");
  });
});

describe("an OpenAI-compatible provider", () => {
  it("asks for the schema, sends the key as a bearer token and validates the reply", async () => {
    useProvider({ AI_PROVIDER: "openai", AI_API_KEY: "sk-test", AI_MODEL: "gpt-4.1-mini" });
    const fetchMock = vi.fn().mockResolvedValue(reply('{"hint":"Count the tens first."}'));
    vi.stubGlobal("fetch", fetchMock);
    expect(await writeJson("system", "user", schema)).toEqual({ hint: "Count the tens first." });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "gpt-4.1-mini", messages: [{ role: "system", content: "system" }, { role: "user", content: "user" }] });
    expect(body.response_format.json_schema.schema.properties.hint).toBeTruthy();
  });

  it("falls back to plain JSON when a model cannot take a strict schema", async () => {
    useProvider({ AI_PROVIDER: "groq", AI_API_KEY: "gsk", AI_MODEL: "llama" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failure(400))
      .mockResolvedValueOnce(reply('```json\n{"hint":"Try a smaller group."}\n```'));
    vi.stubGlobal("fetch", fetchMock);
    expect(await writeJson("system", "user", schema)).toEqual({ hint: "Try a smaller group." });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).response_format).toEqual({ type: "json_object" });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).messages[0].content).toContain("Reply with JSON only");
  });

  it("returns nothing usable rather than guessing", async () => {
    useProvider({ AI_PROVIDER: "openai", AI_API_KEY: "sk", AI_MODEL: "m" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply("I cannot help with that.")));
    expect(await writeJson("system", "user", schema)).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply('{"hint":"' + "x".repeat(80) + '"}')));
    expect(await writeJson("system", "user", schema)).toBeNull(); // the schema still decides
  });

  it("returns plain text for the text tasks", async () => {
    useProvider({ AI_PROVIDER: "openai", AI_API_KEY: "sk", AI_MODEL: "m" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply("  Two tens make twenty.  ")));
    expect(await writeText("system", "user")).toBe("Two tens make twenty.");
  });
});

describe("failures", () => {
  it("separates a rejected key from a temporary problem", () => {
    expect(classifyProviderError(new ProviderHttpError(401, ""))).toBe("unauthorized");
    expect(classifyProviderError(new ProviderHttpError(403, ""))).toBe("unauthorized");
    expect(classifyProviderError(new ProviderHttpError(429, ""))).toBe("busy");
    expect(classifyProviderError(new ProviderHttpError(503, ""))).toBe("busy");
    expect(classifyProviderError(new ProviderHttpError(400, ""))).toBe("error");
    expect(classifyProviderError(new DOMException("slow", "TimeoutError"))).toBe("busy");
    expect(classifyProviderError(new Error("boom"))).toBe("error");
  });
});
