import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const server = vi.hoisted(() => ({
  aiConfigured: vi.fn(() => true),
  writeJson: vi.fn(),
  providerInfo: vi.fn(() => null),
  classifyProviderError: vi.fn(() => "error" as const),
}));
vi.mock("../server/provider", () => server);

import { anyConfigured, askChain, chainConfigured, chainFor, hintChain } from "./chain";

const schema = z.object({ text: z.string() });
const system = "s";
const message = "m";
/** Stands in for a task's own validator: accepts anything that says "good". */
const accept = (d: { text: string } | null) => (d?.text === "good" ? d.text : null);
const channelsUsed = () => server.writeJson.mock.calls.map((call) => call[3]);
const only = (...set: string[]) => server.aiConfigured.mockImplementation((c?: string) => set.includes(String(c)));

describe("who stands in for whom", () => {
  it("pairs each job with an understudy", () => {
    expect(chainFor("default")).toEqual(["default", "default2"]);
    expect(chainFor("hint")).toEqual(["hint", "hint2"]);
    expect(chainFor("explain")).toEqual(["explain", "explain2"]);
    expect(chainFor("gen")).toEqual(["gen", "gen2"]);
    // An understudy has none of its own: a chain is two deep, never a loop.
    expect(chainFor("gen2")).toEqual(["gen2"]);
    expect(chainFor("hint2")).toEqual(["hint2"]);
  });

  it("counts a chain as available when either account is", () => {
    only("hint2");
    expect(chainConfigured("hint")).toBe(true);
    only("default");
    expect(chainConfigured("hint")).toBe(false);
    expect(anyConfigured()).toBe(true);
    only();
    expect(anyConfigured()).toBe(false);
  });

  it("gives hints their own accounts when they have some, and the general ones when they do not", () => {
    // The isolation is worth having, but it must never be the reason hints stop working on an install
    // that was set up before HINT_AI_* existed.
    only("hint", "default");
    expect(hintChain()).toEqual(["hint", "hint2"]);
    only("default");
    expect(hintChain()).toEqual(["default", "default2"]);
    only("hint2");
    expect(hintChain()).toEqual(["hint", "hint2"]);
  });
});

describe("asking a chain", () => {
  beforeEach(() => { server.writeJson.mockReset(); only("a", "b", "default", "default2", "hint", "hint2", "explain", "explain2", "gen", "gen2"); });

  it("stops at the first account that answers usefully", async () => {
    server.writeJson.mockResolvedValueOnce({ text: "good" });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept)).toBe("good");
    expect(channelsUsed()).toEqual(["gen"]);
  });

  it("moves on when a reply parses but the task's own guard refuses it", async () => {
    // By far the common case: the model wrote something unusable, and a second sample often fixes it.
    server.writeJson.mockResolvedValueOnce({ text: "no" }).mockResolvedValueOnce({ text: "good" });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept)).toBe("good");
    expect(channelsUsed()).toEqual(["gen", "gen2"]);
  });

  it("moves on when an account is out of credit, and does not report a failure that did not happen", async () => {
    server.writeJson.mockRejectedValueOnce(new Error("401")).mockResolvedValueOnce({ text: "good" });
    await expect(askChain(system, message, schema, ["hint", "hint2"], accept)).resolves.toBe("good");
  });

  it("rethrows when every account failed, so a dead key is still classified as one", async () => {
    const dead = new Error("401 invalid_api_key");
    server.writeJson.mockRejectedValue(dead);
    await expect(askChain(system, message, schema, ["hint", "hint2"], accept)).rejects.toBe(dead);
  });

  it("stays quiet when asked to, so a spent generation key cannot switch anything else off", async () => {
    server.writeJson.mockRejectedValue(new Error("401"));
    await expect(askChain(system, message, schema, ["gen", "gen2"], accept, { quiet: true })).resolves.toBeNull();
  });

  it("returns null, not an error, when everyone simply answered badly", async () => {
    server.writeJson.mockResolvedValue({ text: "no" });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept)).toBeNull();
    expect(channelsUsed()).toEqual(["gen", "gen2"]);
  });

  it("skips an account that is not configured instead of counting it as a try", async () => {
    only("gen2");
    server.writeJson.mockResolvedValueOnce({ text: "good" });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept)).toBe("good");
    expect(channelsUsed()).toEqual(["gen2"]);
  });

  it("asks nobody when nobody is configured", async () => {
    only();
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept)).toBeNull();
    expect(server.writeJson).not.toHaveBeenCalled();
  });

  it("will not spend a second account on an answer nobody is waiting for", async () => {
    let clock = 0;
    server.writeJson.mockImplementation(async () => { clock += 6000; return { text: "no" }; });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept, { budgetMs: 5000, now: () => clock })).toBeNull();
    expect(channelsUsed()).toEqual(["gen"]);
  });

  it("always makes the first attempt, however late the budget says it is", async () => {
    server.writeJson.mockResolvedValueOnce({ text: "good" });
    expect(await askChain(system, message, schema, ["gen", "gen2"], accept, { budgetMs: 0, now: () => 10_000 })).toBe("good");
    expect(channelsUsed()).toEqual(["gen"]);
  });

  it("repeats an account when the chain names it twice, which is how the explainer gets its retry", async () => {
    server.writeJson.mockResolvedValueOnce({ text: "no" }).mockResolvedValueOnce({ text: "no" }).mockResolvedValueOnce({ text: "good" });
    expect(await askChain(system, message, schema, ["explain", "explain2", "explain"], accept)).toBe("good");
    expect(channelsUsed()).toEqual(["explain", "explain2", "explain"]);
  });
});
