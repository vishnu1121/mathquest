import { describe, expect, it } from "vitest";
import { createChallenge } from "./generators";
import { hintFor } from "./hints";
import { bugAnswersFor } from "./misconceptions";
import { createRng } from "./rng";
import { SKILLS, SKILL_ORDER } from "./skills";
import type { Challenge, Format, Level } from "./types";

const mentions = (text: string, n: number) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(text);
const hintText = (c: Challenge, level: 1 | 2 | 3 | 4 | 5, m: Parameters<typeof hintFor>[2] = null) => {
  const hint = hintFor(c, level, m);
  return [hint.text, ...(hint.steps ?? [])].join(" ");
};

describe("hintFor", () => {
  it("never reveals the answer before the final explanation", () => {
    const rng = createRng(77);
    const formats: Exclude<Format, "pipPuzzle">[] = ["equation", "visual", "missingAddend", "wordProblem"];
    for (const skill of SKILL_ORDER) {
      for (let level = 1; level <= SKILLS[skill].maxLevel; level++) {
        for (const format of formats) {
          for (let i = 0; i < 25; i++) {
            const c = createChallenge({ skill, level: level as Level, format }, rng, "h");
            // A number already on screen (like 1 in "1 + ? = 2") is not a leak.
            const shown = c.unknown === "total" ? [c.a, c.b] : [c.a, c.total];
            if (shown.includes(c.answer)) continue;
            const mistakes = [null, ...bugAnswersFor(c).map((bug) => bug.id)];
            for (const m of mistakes) {
              for (const hintLevel of [1, 2, 3, 4] as const) {
                expect(mentions(hintText(c, hintLevel, m), c.answer), `${skill} L${level} ${format} ${c.a}+${c.b} hint ${hintLevel} ${m}`).toBe(false);
              }
            }
          }
        }
      }
    }
  });

  it("targets the exact mistake at the strategy level", () => {
    const c: Challenge = { id: "x", skill: "regroup", level: 3, format: "equation", a: 47, b: 38, total: 85, unknown: "total", answer: 85 };
    expect(hintFor(c, 2, "columnConcat").text).toBe("7 + 8 makes 15 ones. That's too many for the ones place! Trade 10 ones for 1 ten.");
    expect(hintFor(c, 4).steps).toEqual(["What is 7 + 8?", "15 ones = 1 ten and how many ones?", "4 tens + 3 tens + 1 ten = how many tens?"]);
    expect(hintFor(c, 3).showBlocks).toBe(true);
  });

  it("explains fully at level 5", () => {
    const c: Challenge = { id: "x", skill: "regroup", level: 3, format: "equation", a: 47, b: 38, total: 85, unknown: "total", answer: 85 };
    expect(hintFor(c, 5).text).toContain("So 47 + 38 = 85.");
  });
});
