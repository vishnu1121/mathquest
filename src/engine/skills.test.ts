import { describe, expect, it } from "vitest";
import { clampLevel, SKILL_ORDER, SKILLS, startingPoint } from "./skills";
import { SKILL_IDS } from "./types";

describe("skills", () => {
  it("defines every skill exactly once, in trail order", () => {
    expect([...SKILL_ORDER].sort()).toEqual([...SKILL_IDS].sort());
    for (const id of SKILL_IDS) expect(SKILLS[id].id).toBe(id);
  });

  it("only lists prerequisites that exist and come earlier on the trail", () => {
    for (const id of SKILL_ORDER) {
      for (const pre of SKILLS[id].prerequisites) {
        expect(SKILL_ORDER.indexOf(pre)).toBeLessThan(SKILL_ORDER.indexOf(id));
      }
    }
  });

  it("starts younger grades on easier skills", () => {
    expect(startingPoint(0)).toEqual({ skill: "simple", level: 1 });
    expect(startingPoint(1)).toEqual({ skill: "simple", level: 3 });
    expect(startingPoint(2)).toEqual({ skill: "twoDigit", level: 1 });
    expect(startingPoint(5)).toEqual({ skill: "regroup", level: 2 });
  });

  it("clamps levels to each skill's range", () => {
    expect(clampLevel("twoDigit", 9)).toBe(3);
    expect(clampLevel("regroup", 0)).toBe(1);
    expect(clampLevel("simple", 2.4)).toBe(2);
  });
});
