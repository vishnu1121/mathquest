import { describe, expect, it } from "vitest";
import { deriveWorld } from "@/engine/world";
import { buildScenario, isScenarioId } from "./scenarios";

describe("buildScenario", () => {
  it("drops into the forest with a challenge", () => {
    const state = buildScenario("forest", 1000);
    expect(state.screen).toBe("forest");
    expect(state.turn?.kind).toBe("challenge");
    expect(state.profile?.name).toBe("Nova");
  });

  it("starts a Pip's Puzzle", () => {
    const state = buildScenario("pip", 1000);
    expect(state.turn?.kind).toBe("pip");
  });

  it("opens the Guardian gate", () => {
    const state = buildScenario("gate", 1000);
    expect(state.turn).toBeNull();
    expect(state.model && deriveWorld(state.model, false).gateOpen).toBe(true);
  });

  it("opens a picture problem for Build-it blocks", () => {
    const state = buildScenario("blocks", 1000);
    expect(state.turn?.kind === "challenge" && state.turn.challenge.format).toBe("visual");
  });

  it("only accepts known scenario names", () => {
    expect(isScenarioId("pip")).toBe(true);
    expect(isScenarioId("boss")).toBe(false);
    expect(isScenarioId(null)).toBe(false);
  });
});
