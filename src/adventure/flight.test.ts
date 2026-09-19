import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import {
  ASK_AHEAD, END_CALM, GUST_SECONDS, LEGS, MEDALS, START_CALM, addLights, basePossible, gateLabel, gatePrompt, gateResult, makeGate,
  medalFor, missedGateText, multiplier, planLeg, recordRun, restoreFlight, rivalScore, type Gate,
} from "./flight";

describe("Lantern Flight plan", () => {
  it("builds four legs with three sky questions each, and keeps lights away from open questions", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = createRng(seed);
      LEGS.forEach((leg, i) => {
        const plan = planLeg(i, rng);
        const gates = plan.filter((e) => e.kind === "gate");
        expect(gates.map((g) => g.gate)).toEqual(leg.gates);
        expect(plan.map((e) => e.t)).toEqual([...plan.map((e) => e.t)].sort((a, b) => a - b));
        const quiet = (t: number) => gates.every((g) => t <= g.t - ASK_AHEAD - 0.3 || t >= g.t + 0.6);
        for (const e of plan) {
          expect(e.t).toBeGreaterThanOrEqual(START_CALM);
          expect(e.t).toBeLessThanOrEqual(leg.duration - END_CALM);
          if ("y" in e) {
            expect(e.y).toBeGreaterThanOrEqual(0.05);
            expect(e.y).toBeLessThanOrEqual(0.9);
          }
          if (e.kind === "cluster") {
            expect(quiet(e.t)).toBe(true);
            if (e.golden) expect(e.lights).toBe(5);
            else expect(e.lights >= 1 && e.lights <= leg.maxLights).toBe(true);
          }
          if (e.kind === "star") expect(quiet(e.t)).toBe(true);
          if (e.kind === "gust") {
            expect(e.t + GUST_SECONDS).toBeLessThanOrEqual(leg.duration - END_CALM);
            for (const g of gates) expect(g.t <= e.t - 1 || g.t >= e.t + GUST_SECONDS + 1).toBe(true);
          }
        }
        expect(plan.filter((e) => e.kind === "cluster" && e.golden)).toHaveLength(leg.golden);
        expect(plan.filter((e) => e.kind === "gust")).toHaveLength(leg.gusts);
        expect(plan.filter((e) => e.kind === "star")).toHaveLength(leg.stars);
        expect(plan.filter((e) => e.kind === "cluster").length).toBeGreaterThanOrEqual(12);
      });
    }
    expect(() => planLeg(4, createRng(1))).toThrow(RangeError);
  });
});

describe("sky questions", () => {
  it("offer three different rings with exactly one right answer, whatever the lantern holds", () => {
    const rng = createRng(7);
    for (let lights = 0; lights < 160; lights++) {
      for (const kind of ["nextTen", "tenMore"] as const) {
        const g = makeGate(kind, lights, rng);
        expect(new Set(g.options).size).toBe(3);
        expect(g.options.filter((n) => n === g.answer)).toHaveLength(1);
        expect(g.target).toBe(lights + g.answer);
        if (g.kind === "nextTen") {
          expect(g.target % 10).toBe(0);
          expect(g.answer).toBeLessThan(10);
        } else {
          expect(g.answer).toBe(10);
        }
        if (kind === "nextTen" && lights % 10 === 0) expect(g.kind).toBe("tenMore");
        for (const add of g.options) {
          expect(add).toBeGreaterThanOrEqual(1);
          expect(gateResult(g, add).correct).toBe(add === g.answer);
          expect(gateResult(g, add).total).toBe(lights + add);
        }
      }
    }
  });

  it("word each question and its feedback from the numbers", () => {
    const next: Gate = { kind: "nextTen", from: 27, answer: 3, target: 30, options: [2, 3, 4] };
    expect(gatePrompt(next)).toBe("Your lantern has 27 lights. Which ring makes 30?");
    expect(gateLabel(next, 4)).toBe("+4");
    expect(gateResult(next, 3)).toEqual({ correct: true, total: 30, text: "27 + 3 = 30. Perfect ten!" });
    expect(gateResult(next, 4).text).toBe("27 + 4 = 31, one past 30.");
    expect(gateResult(next, 2).text).toBe("27 + 2 = 29, one short of 30.");
    expect(missedGateText(next)).toBe("The rings floated past. 27 and 3 more make 30.");
    const more: Gate = { kind: "tenMore", from: 48, answer: 10, target: 58, options: [1, 10, 11] };
    expect(gatePrompt(more)).toBe("Your lantern has 48 lights. Which ring shows 10 more?");
    expect(gateLabel(more, 11)).toBe("59");
    expect(gateResult(more, 10).text).toBe("48 + 10 = 58. Ten more!");
    expect(gateResult(more, 1).text).toBe("48 + 1 = 49. Ten more than 48 is 58.");
    expect(missedGateText(more)).toBe("The rings floated past. Ten more than 48 is 58.");
  });
});

describe("lantern, score and records", () => {
  it("fills tens and carries extra lights into the next ten", () => {
    expect(addLights(7, 3)).toEqual({ lights: 10, tens: 1 });
    expect(addLights(8, 5)).toEqual({ lights: 13, tens: 1 });
    expect(addLights(19, 10)).toEqual({ lights: 29, tens: 1 });
    expect(addLights(0, 4)).toEqual({ lights: 4, tens: 0 });
    expect(addLights(95, 25)).toEqual({ lights: 120, tens: 3 });
  });

  it("grows the multiplier with a chain, up to ×4", () => {
    expect([0, 7, 8, 15, 16, 24, 80, -3].map(multiplier)).toEqual([1, 1, 2, 2, 3, 4, 4, 1]);
  });

  it("sets medals and Pip's score from what the flight made possible", () => {
    const rng = createRng(3);
    const base = basePossible(LEGS.map((_, i) => planLeg(i, rng)));
    expect(base).toBeGreaterThan(2000);
    expect(medalFor(base, base)).toBe("gold");
    expect(medalFor(Math.ceil(base * 0.6), base)).toBe("silver");
    expect(medalFor(10, base)).toBe("bronze");
    expect(rivalScore(base) % 10).toBe(0);
    expect(rivalScore(base)).toBeLessThan(base);
    expect(Object.keys(MEDALS)).toEqual(["gold", "silver", "bronze"]);
  });

  it("keeps a sanitized best score across flights", () => {
    expect(restoreFlight({ best: -3, runs: "x", medals: { gold: 2.5 } })).toEqual({ best: 0, runs: 0, medals: { gold: 0, silver: 0, bronze: 0 } });
    const first = recordRun(restoreFlight(undefined), 1234.4, "silver");
    expect(first).toEqual({ record: { best: 1234, runs: 1, medals: { gold: 0, silver: 1, bronze: 0 } }, newBest: true });
    const second = recordRun(first.record, 900, "bronze");
    expect(second.newBest).toBe(false);
    expect(second.record).toEqual({ best: 1234, runs: 2, medals: { gold: 0, silver: 1, bronze: 1 } });
  });
});
