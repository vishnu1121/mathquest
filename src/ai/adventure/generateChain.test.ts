import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateRequest } from "./generate";

// The chain's whole job is to keep going when a provider does not. These tests pin the three things that
// make it safe: the second account is really tried, a dead key never escapes as an error, and when both
// come up short the answer is a plain null so the caller draws the built-in question.
const server = vi.hoisted(() => ({
  aiConfigured: vi.fn((channel?: string) => channel === "gen" || channel === "gen2"),
  writeJson: vi.fn(),
  providerInfo: vi.fn(() => null),
  classifyProviderError: vi.fn(() => "error" as const),
}));
vi.mock("../server/provider", () => server);
vi.mock("../server/rateLimit", () => ({ takeToken: () => true }));

import { CHAIN_BUDGET_MS, generationConfigured, writeQuestion } from "./generateChain";
import { GET, POST } from "../../app/api/adventure-ai/route";

const request: GenerateRequest = {
  task: "generate", grade: "3", skill: "g3.oa.multiply", skillName: "Multiplication facts",
  topic: "Equal groups", quest: "Power the workshop.", kind: "number", format: "int", unit: "",
  example: { prompt: "What is 4 x 6?", answer: "24" }, options: 0, apex: false, stretch: false,
  avoid: [], maxValue: 200, minSteps: 1, seed: 11,
};

const good = {
  prompt: "Tinker loads 7 crates with 8 bolts each. How many bolts is that?",
  answer: "56",
  work: [{ op: "*", a: "7", b: "8" }],
  hint: "Think of seven equal groups of eight.",
  explain: "Seven groups of eight bolts is 56 bolts.",
  options: [],
};
/** Schema-valid, and wrong: the work says 56 but the answer key says 54. */
const wrongAnswer = { ...good, answer: "54" };

const channelsUsed = () => server.writeJson.mock.calls.map((call) => call[3]);

describe("primary then secondary then the bank", () => {
  beforeEach(() => {
    server.writeJson.mockReset();
    server.aiConfigured.mockImplementation((channel?: string) => channel === "gen" || channel === "gen2");
  });

  it("reports itself configured when either writer has an account", () => {
    expect(generationConfigured()).toBe(true);
    server.aiConfigured.mockImplementation((channel?: string) => channel === "gen2");
    expect(generationConfigured()).toBe(true);
    server.aiConfigured.mockImplementation(() => false);
    expect(generationConfigured()).toBe(false);
  });

  it("uses the primary and does not touch the secondary when the primary works", async () => {
    server.writeJson.mockResolvedValueOnce(good);
    const got = await writeQuestion(request);
    expect(got!.task.prompt).toBe(good.prompt);
    expect(channelsUsed()).toEqual(["gen"]);
  });

  it("falls to the secondary when the primary's key is dead, without letting the error out", async () => {
    // A thrown error here would reach the route's catch, which turns a 401 into "AI is off for this
    // session" — and a spent free-tier generation key must never be able to silence hints or coaching.
    server.writeJson.mockRejectedValueOnce(new Error("401 invalid_api_key")).mockResolvedValueOnce(good);
    const got = await writeQuestion(request);
    expect(got!.task.prompt).toBe(good.prompt);
    expect(channelsUsed()).toEqual(["gen", "gen2"]);
  });

  it("falls to the secondary when the primary returns a question that does not check out", async () => {
    server.writeJson.mockResolvedValueOnce(wrongAnswer).mockResolvedValueOnce(good);
    const got = await writeQuestion(request);
    expect(got!.task.prompt).toBe(good.prompt);
    expect(channelsUsed()).toEqual(["gen", "gen2"]);
  });

  it("returns null when both come up short, so the caller draws the built-in question", async () => {
    server.writeJson.mockResolvedValueOnce(wrongAnswer).mockResolvedValueOnce(null);
    expect(await writeQuestion(request)).toBeNull();
    expect(channelsUsed()).toEqual(["gen", "gen2"]);
  });

  it("returns null without calling anyone when no writer is configured", async () => {
    server.aiConfigured.mockImplementation(() => false);
    expect(await writeQuestion(request)).toBeNull();
    expect(server.writeJson).not.toHaveBeenCalled();
  });

  it("skips the unconfigured writer instead of counting it as an attempt", async () => {
    server.aiConfigured.mockImplementation((channel?: string) => channel === "gen2");
    server.writeJson.mockResolvedValueOnce(good);
    await writeQuestion(request);
    expect(channelsUsed()).toEqual(["gen2"]);
  });

  it("gives up rather than spending the second account on an answer nobody is waiting for", async () => {
    // The browser stops listening well before two full provider timeouts have gone by.
    let now = 0;
    server.writeJson.mockImplementation(async () => { now += CHAIN_BUDGET_MS + 1000; return wrongAnswer; });
    expect(await writeQuestion(request, () => now)).toBeNull();
    expect(channelsUsed()).toEqual(["gen"]);
  });
});

describe("the route", () => {
  const post = async (body: unknown) => {
    const res = await POST(new Request("http://localhost/api/adventure-ai", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    return { status: res.status, json: (await res.json()) as { ok: boolean; data?: { task?: { prompt?: string } }; reason?: string } };
  };

  beforeEach(() => {
    server.writeJson.mockReset();
    server.aiConfigured.mockImplementation((channel?: string) => channel === "gen" || channel === "gen2");
  });

  it("tells the game generation is available without naming a key", async () => {
    const status = await GET().json();
    expect(status).toMatchObject({ generate: true });
    expect(JSON.stringify(status)).not.toMatch(/key/i);
  });

  it("answers a generation request with a real task", async () => {
    server.writeJson.mockResolvedValueOnce(good);
    const { status, json } = await post(request);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data!.task!.prompt).toBe(good.prompt);
  });

  it("answers 'rejected', not an error, when the writers cannot produce a sound question", async () => {
    server.writeJson.mockResolvedValue(wrongAnswer);
    const { status, json } = await post(request);
    expect(status).toBe(200);
    expect(json).toEqual({ ok: false, reason: "rejected" });
  });

  it("refuses a request that is not a real brief", async () => {
    expect((await post({ ...request, grade: "7" })).status).toBe(400);
    expect((await post({ ...request, minSteps: 99 })).status).toBe(400);
    expect((await post({ ...request, example: { prompt: "x".repeat(301), answer: "1" } })).status).toBe(400);
  });

  it("serves generation even when the main and explain accounts are both off", async () => {
    // The three channels are independent: a game with only generation keys still generates.
    server.aiConfigured.mockImplementation((channel?: string) => channel === "gen");
    server.writeJson.mockResolvedValueOnce(good);
    expect((await post(request)).json.ok).toBe(true);
    expect(await GET().json()).toMatchObject({ enabled: false, explain: false, generate: true });
  });

  it("says unavailable when generation has no account, without touching the other channels", async () => {
    server.aiConfigured.mockImplementation((channel?: string) => channel === "default");
    const { status, json } = await post(request);
    expect(status).toBe(503);
    expect(json).toEqual({ ok: false, reason: "unavailable" });
    expect(server.writeJson).not.toHaveBeenCalled();
  });
});
