import { beforeEach, describe, expect, it, vi } from "vitest";

// The explainer answers on its own provider account. These tests pin the thing that makes that worth
// doing: the two channels are independent, so one being off or out of credit cannot silence the other.
const server = vi.hoisted(() => ({
  aiConfigured: vi.fn((channel?: string) => channel === "explain"),
  writeJson: vi.fn(),
  providerInfo: vi.fn(() => null),
  classifyProviderError: vi.fn(() => "error" as const),
}));
vi.mock("../server/provider", () => server);
const tokens = vi.hoisted(() => ({ taken: [] as string[] }));
vi.mock("../server/rateLimit", () => ({ takeToken: (key: string) => { tokens.taken.push(key); return true; } }));
import { GET, POST } from "../../app/api/adventure-ai/route";

const post = async (body: unknown) => {
  const res = await POST(new Request("http://localhost/api/adventure-ai", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  return { status: res.status, json: await res.json() };
};

const request = {
  task: "explain", grade: "2", skill: "Adding within 100",
  question: "Pip has 28 berries and finds 15 more. How many berries now?",
  answer: "43", given: "43", firstTry: true, board: "Two baskets of berries.",
};
const good = { steps: ["Start with 28 berries.", "Add the 15 more."], answerLine: "So Pip has 43 berries now." };

describe("the explainer's own channel", () => {
  beforeEach(() => {
    server.writeJson.mockReset();
    tokens.taken.length = 0;
    server.aiConfigured.mockImplementation((channel?: string) => channel === "explain");
  });

  it("answers when only the explain key is set, and asks that channel for the reply", async () => {
    server.writeJson.mockResolvedValue(good);
    const { status, json } = await post(request);
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true, data: good });
    // The fourth argument is the channel: without it the request would spend the main account's key.
    expect(server.writeJson.mock.calls[0]?.[3]).toBe("explain");
  });

  it("spends its own rate-limit bucket, not the one the rest of the game shares", async () => {
    server.writeJson.mockResolvedValue(good);
    await post(request);
    expect(tokens.taken).toEqual(["local|explain"]);
  });

  // Each of these names the exact account that is set, rather than "anything but explain" — there are
  // now understudy channels (explain2, hint2, default2) and a loose predicate quietly configures them.
  it("is unavailable when only the main key is set", async () => {
    server.aiConfigured.mockImplementation((channel?: string) => channel === "default");
    const { status, json } = await post(request);
    expect(status).toBe(503);
    expect(json).toEqual({ ok: false, reason: "unavailable" });
    expect(server.writeJson).not.toHaveBeenCalled();
  });

  it("reports the two channels separately, so the game knows whether to offer the button", async () => {
    server.aiConfigured.mockImplementation((channel?: string) => channel === "explain");
    expect(await GET().json()).toMatchObject({ enabled: false, explain: true });
    server.aiConfigured.mockImplementation((channel?: string) => channel === "default");
    expect(await GET().json()).toMatchObject({ enabled: true, explain: false });
  });

  it("drops an explanation that ends on a different answer than the game scored", async () => {
    server.writeJson.mockResolvedValue({ ...good, answerLine: "So Pip has 33 berries now." });
    expect(await post(request)).toEqual({ status: 200, json: { ok: false, reason: "rejected" } });
  });

  it("rejects an unbounded or malformed request before any model call", async () => {
    expect((await post({ ...request, question: "x".repeat(301) })).status).toBe(400);
    expect((await post({ ...request, grade: "7" })).status).toBe(400);
    expect(server.writeJson).not.toHaveBeenCalled();
  });
});
