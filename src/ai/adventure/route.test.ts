import { beforeEach, describe, expect, it, vi } from "vitest";
import { adventureRequestSchema } from "./schemas";
import { acceptNote } from "./validate";

// The route's own behaviour, exercised through one ordinary task: what it does with a request it cannot
// parse, a provider that is not configured, a reply the guard refuses, and a provider that throws. These
// used to hang off the Story Lab's `mission` task, which no longer exists.
const server = vi.hoisted(() => ({ aiConfigured: vi.fn(() => true), writeJson: vi.fn(), providerInfo: vi.fn(() => null), classifyProviderError: vi.fn(() => "error" as const) }));
vi.mock("../server/provider", () => server);
vi.mock("../server/rateLimit", () => ({ takeToken: () => true }));
import { GET, POST } from "../../app/api/adventure-ai/route";

const lines = ["Solved 28 + 15 without a hint.", "Asked Hoot once, then finished the set."];
const request = { task: "journey", lines };
const note = { note: "You worked through 28 + 15 on your own, and you asked for help once and kept going." };
const send = (body: unknown) => POST(new Request("http://local/api/adventure-ai", { method: "POST", body: JSON.stringify(body) }));

describe("the adventure AI route", () => {
  beforeEach(() => { server.aiConfigured.mockReturnValue(true); server.writeJson.mockReset(); });

  it("accepts a real request and refuses an unknown task or unbounded text", () => {
    expect(adventureRequestSchema.safeParse(request).success).toBe(true);
    expect(adventureRequestSchema.safeParse({ task: "unlock-everything", lines }).success).toBe(false);
    expect(adventureRequestSchema.safeParse({ task: "journey", lines: [] }).success).toBe(false);
    expect(adventureRequestSchema.safeParse({ task: "journey", lines: ["x".repeat(161)] }).success).toBe(false);
    // The Story Lab's task is gone, and the schema is what makes that true rather than a comment.
    expect(adventureRequestSchema.safeParse({ task: "mission", kind: "garden", theme: "moon", promise: "listen", practice: "with_support" }).success).toBe(false);
  });

  it("returns a validated reply, built from what the child actually did", async () => {
    server.writeJson.mockResolvedValue(note);
    expect(await (await send(request)).json()).toEqual({ ok: true, data: note.note });
    expect(server.writeJson.mock.calls[0]?.[1]).toContain("28");
  });

  it("refuses a note that invents a number or claims something about the child", () => {
    expect(acceptNote(note.note, [28, 15])).toBe(note.note);
    expect(acceptNote("You solved 99 problems today.", [28, 15])).toBeNull();
    expect(acceptNote("This child has dyscalculia.", [])).toBeNull();
  });

  it("keeps unavailable, malformed and rejected results explicit", async () => {
    // Each channel is reported separately, because each has its own account: see explain.route.test.ts.
    server.aiConfigured.mockReturnValue(false);
    expect(await GET().json()).toEqual({ enabled: false, explain: false, generate: false });
    expect((await send(request)).status).toBe(503);
    expect(server.writeJson).not.toHaveBeenCalled();

    server.aiConfigured.mockReturnValue(true);
    expect((await send({ task: "journey", lines: "not a list" })).status).toBe(400);

    server.writeJson.mockResolvedValue({ note: "You finished all 400 of them." });
    expect(await (await send(request)).json()).toEqual({ ok: false, reason: "rejected" });
  });

  it("reports a provider failure as temporary rather than as a broken game", async () => {
    server.writeJson.mockRejectedValue(new Error("timeout"));
    const result = await send(request);
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ ok: false, reason: "busy" });
  });
});
