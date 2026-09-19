import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { CATEGORIES } from "./elo";
import {
  BOSSES, BOSS_STEPS, COMPANION_MOMENTS, MISCONCEPTION_CODES, blockValue, bossFor, bossStepFits, bundleStart, bundleTen, classifyAnswer,
  companionLine, correctText, diagnosis, draftNote, generateProblem, isCorrect, leaksAnswer, parseAnswer, plausibleCode, shatterStart,
  shatterTen, sliceCounts, sliceOptions, sliceWorks, socraticFallback, socraticNumbers, takeOnes, takeTens, validProblem,
  type ArenaProblem, type MisconceptionCode,
} from "./arenaMath";

const add = (a: number, b: number) => ({ kind: "add", a, b }) as const;
const sub = (a: number, b: number) => ({ kind: "sub", a, b }) as const;
const frac = (a: number, b: number, c: number, d: number) => ({ kind: "frac", a, b, c, d }) as const;
const classify = (p: ArenaProblem, text: string) => {
  const parsed = parseAnswer(p, text);
  if (!parsed) throw new Error(`unparseable ${text}`);
  return classifyAnswer(p, parsed);
};
const numbersIn = (t: string) => (t.match(/\d+/g) ?? []).map(Number);

describe("generated arena problems", () => {
  it("fit their category across many seeds", () => {
    const rng = createRng(20260914);
    for (let i = 0; i < 400; i++) {
      for (const { id } of CATEGORIES) {
        const p = generateProblem(id, rng);
        expect(validProblem(p)).toBe(true);
        if (p.kind === "frac") {
          expect(p.a * p.d + p.c * p.b).toBeLessThan(p.b * p.d);
          expect(id === "frac_like" ? p.b === p.d : p.b !== p.d).toBe(true);
          continue;
        }
        const onesA = p.a % 10, onesB = p.b % 10;
        if (id === "add_small") expect(p.a < 10 && p.b < 10).toBe(true);
        if (id === "add_no_carry") expect(onesA + onesB < 10 && p.a >= 10 && p.b >= 10 && p.a + p.b < 100).toBe(true);
        if (id === "add_carry") expect(onesA + onesB >= 10 && p.a >= 10 && p.b >= 10 && p.a + p.b < 100).toBe(true);
        if (id === "sub_no_borrow") expect(p.kind === "sub" && onesA >= onesB && p.b >= 10 && p.a > p.b).toBe(true);
        if (id === "sub_borrow") expect(p.kind === "sub" && onesA < onesB && p.b >= 10 && p.a > p.b).toBe(true);
      }
    }
  });

  it("rejects out-of-range problems from a browser", () => {
    expect(validProblem(sub(17, 52))).toBe(false);
    expect(validProblem(frac(3, 2, 1, 3))).toBe(false);
    expect(validProblem(frac(1, 13, 1, 3))).toBe(false);
    expect(validProblem(add(1000, 1))).toBe(false);
    expect(validProblem(add(1.5, 1))).toBe(false);
  });
});

describe("answers", () => {
  it("parses whole numbers and fractions only where they belong", () => {
    expect(parseAnswer(add(45, 17), " 62 ")).toEqual({ whole: 62 });
    expect(parseAnswer(frac(1, 2, 1, 3), "5 / 6")).toEqual({ num: 5, den: 6 });
    for (const bad of ["", "abc", "12345", "5/6", "-3"]) expect(parseAnswer(add(45, 17), bad)).toBeNull();
    for (const bad of ["5", "1/0", "x/6", "1/2/3"]) expect(parseAnswer(frac(1, 2, 1, 3), bad)).toBeNull();
  });

  it("accepts equivalent fractions", () => {
    const p = frac(1, 3, 1, 6);
    expect(correctText(p)).toBe("1/2");
    expect(isCorrect(p, { num: 3, den: 6 })).toBe(true);
    expect(isCorrect(p, { num: 1, den: 2 })).toBe(true);
    expect(isCorrect(p, { whole: 1 })).toBe(false);
  });
});

describe("rule-based misconception diagnosis", () => {
  it("classifies addition mix-ups", () => {
    const p = add(45, 17);
    expect(classify(p, "62")).toBeNull();
    expect(classify(p, "52")).toBe("ERR_ADD_CARRY");
    expect(classify(p, "512")).toBe("ERR_ADD_CONCAT");
    expect(classify(p, "28")).toBe("ERR_WRONG_OPERATION");
    expect(classify(p, "61")).toBe("ERR_OFF_BY_ONE");
    expect(classify(p, "7")).toBe("ERR_UNKNOWN");
    expect(classify(add(8, 5), "3")).toBe("ERR_WRONG_OPERATION");
  });

  it("classifies subtraction borrowing mix-ups in both forms", () => {
    expect(classify(sub(52, 17), "35")).toBeNull();
    expect(classify(sub(52, 17), "45")).toBe("ERR_SUB_BORROW");
    expect(classify(sub(71, 38), "47")).toBe("ERR_SUB_BORROW");
    expect(classify(sub(71, 38), "43")).toBe("ERR_SUB_BORROW");
    expect(classify(sub(52, 17), "69")).toBe("ERR_WRONG_OPERATION");
    expect(classify(sub(52, 17), "34")).toBe("ERR_OFF_BY_ONE");
    expect(classify(sub(58, 23), "45")).toBe("ERR_UNKNOWN");
  });

  it("classifies fraction mix-ups, including equivalent forms of adding denominators", () => {
    const p = frac(1, 2, 1, 3);
    expect(classify(p, "5/6")).toBeNull();
    expect(classify(p, "10/12")).toBeNull();
    expect(classify(p, "2/5")).toBe("ERR_ADD_DENOMINATOR");
    expect(classify(p, "4/10")).toBe("ERR_ADD_DENOMINATOR");
    expect(classify(p, "2/3")).toBe("ERR_FRAC_KEEP_DENOMINATOR");
    expect(classify(p, "2/2")).toBe("ERR_FRAC_KEEP_DENOMINATOR");
    expect(classify(p, "1/6")).toBe("ERR_UNKNOWN");
    expect(classify(frac(1, 4, 2, 4), "3/8")).toBe("ERR_ADD_DENOMINATOR");
  });

  it("finds each category's signature mix-up on every generated problem", () => {
    const rng = createRng(99);
    for (let i = 0; i < 300; i++) {
      const carry = generateProblem("add_carry", rng) as ReturnType<typeof add>;
      expect(classify(carry, String(carry.a + carry.b - 10))).toBe("ERR_ADD_CARRY");
      const borrow = generateProblem("sub_borrow", rng) as ReturnType<typeof sub>;
      const flipped = (Math.floor(borrow.a / 10) - Math.floor(borrow.b / 10)) * 10 + (borrow.b % 10 - borrow.a % 10);
      expect(classify(borrow, String(flipped))).toBe("ERR_SUB_BORROW");
      for (const id of ["frac_like", "frac_unlike"] as const) {
        const f = generateProblem(id, rng) as ReturnType<typeof frac>;
        expect(classify(f, `${f.a + f.c}/${f.b + f.d}`)).toBe("ERR_ADD_DENOMINATOR");
      }
    }
  });

  it("accepts only classifications that can apply to the problem", () => {
    expect(plausibleCode(add(45, 17), "ERR_ADD_CARRY")).toBe(true);
    expect(plausibleCode(add(41, 17), "ERR_ADD_CARRY")).toBe(false);
    expect(plausibleCode(add(45, 17), "ERR_SUB_BORROW")).toBe(false);
    expect(plausibleCode(add(8, 5), "ERR_ADD_CONCAT")).toBe(false);
    expect(plausibleCode(sub(52, 17), "ERR_SUB_BORROW")).toBe(true);
    expect(plausibleCode(sub(58, 23), "ERR_SUB_BORROW")).toBe(false);
    expect(plausibleCode(frac(1, 2, 1, 3), "ERR_OFF_BY_ONE")).toBe(false);
    expect(plausibleCode(frac(1, 4, 2, 4), "ERR_FRAC_KEEP_DENOMINATOR")).toBe(false);
    expect(plausibleCode(frac(1, 4, 2, 4), "ERR_ADD_DENOMINATOR")).toBe(true);
    expect(plausibleCode(sub(52, 17), "ERR_UNKNOWN")).toBe(true);
  });

  it("maps codes to boss encounters and their mechanics", () => {
    expect(diagnosis("ERR_SUB_BORROW", "rules")).toEqual({ code: "ERR_SUB_BORROW", label: "Took the smaller digit from the larger", boss: "borrowing-behemoth", mechanic: "shatter-ten", event: "SPAWN_BORROWING_BEHEMOTH", source: "rules" });
    expect(diagnosis("ERR_ADD_DENOMINATOR", "ai")).toMatchObject({ boss: "denominator-demon", mechanic: "slice-pizza", event: "SPAWN_DENOMINATOR_DEMON", source: "ai" });
    expect(bossFor("ERR_ADD_CONCAT")).toBe("carry-colossus");
    expect(bossFor("ERR_OFF_BY_ONE")).toBeNull();
    for (const boss of Object.values(BOSSES)) for (const code of boss.codes) expect(MISCONCEPTION_CODES).toContain(code);
  });
});

describe("Socratic companion safety", () => {
  it("never lets built-in questions reveal the answer across generated problems and every code", () => {
    const rng = createRng(5);
    for (let i = 0; i < 250; i++) {
      for (const { id } of CATEGORIES) {
        const p = generateProblem(id, rng);
        for (const code of MISCONCEPTION_CODES) {
          const q = socraticFallback(p, code as MisconceptionCode);
          expect(q.endsWith("?")).toBe(true);
          expect(/[.!?]/.test(q.slice(0, -1))).toBe(false);
          expect(leaksAnswer(p, q)).toBe(false);
          expect(numbersIn(q).every((n) => socraticNumbers(p).includes(n))).toBe(true);
          expect(q.split(" ").length).toBeLessThanOrEqual(26);
        }
      }
    }
  });

  it("detects stated answers, including equivalent fractions", () => {
    expect(leaksAnswer(add(45, 17), "Is it 62?")).toBe(true);
    expect(leaksAnswer(add(45, 17), "What do 5 and 7 ones make?")).toBe(false);
    expect(leaksAnswer(frac(1, 2, 1, 3), "Could it be 5/6?")).toBe(true);
    expect(leaksAnswer(frac(1, 2, 1, 3), "Is it 10 over 12?")).toBe(true);
    expect(leaksAnswer(frac(1, 2, 1, 3), "Are 1/2 and 1/3 slices the same size?")).toBe(false);
    expect(socraticNumbers(sub(42, 21))).not.toContain(21);
  });
});

describe("Hoot, the always-present companion", () => {
  it("has a safe built-in line for every moment, help level, mix-up and boss move", () => {
    const rng = createRng(8);
    for (let i = 0; i < 40; i++) {
      for (const { id } of CATEGORIES) {
        const p = generateProblem(id, rng);
        const codes = [null, ...MISCONCEPTION_CODES.filter((c) => plausibleCode(p, c))];
        const steps = [null, ...BOSS_STEPS.filter((s) => bossStepFits(p, s))];
        // Many combinations share a line, so each distinct line is checked once.
        const lines = new Map<string, boolean>();
        for (const moment of COMPANION_MOMENTS) for (const tier of [0, 1, 2, 3]) for (const code of codes) for (const bossStep of steps) {
          lines.set(companionLine({ moment, problem: p, wrongAnswers: code ? ["1"] : [], code, tier, bossStep }), moment === "solved");
        }
        for (const [line, cheer] of lines) {
          expect(/[.!?]/.test(line.slice(0, -1)), line).toBe(false);
          expect(line.endsWith(cheer ? "!" : "?"), line).toBe(true);
          expect(leaksAnswer(p, line), line).toBe(false);
          expect(numbersIn(line).every((n) => socraticNumbers(p).includes(n)), line).toBe(true);
          expect(line.split(" ").length, line).toBeLessThanOrEqual(26);
        }
      }
    }
  });

  it("reads a typed draft without judging whether a new answer is right", () => {
    const pizza = frac(1, 2, 1, 3), carry = add(45, 17);
    expect(draftNote(pizza, "56", [])).toContain("slash");
    expect(draftNote(pizza, "5", [])).toBeNull();
    expect(draftNote(pizza, "5/6", [])).toBeNull();
    expect(draftNote(pizza, "2/5", ["2/5"])).toContain("already tried 2/5");
    expect(draftNote(pizza, "4/10", ["2/5"])).toContain("same amount as 2/5");
    expect(draftNote(carry, "52", ["52"])).toContain("already tried 52");
    expect(draftNote(carry, "62", ["52"])).toBeNull();
    expect(draftNote(carry, "53", ["52"])).toBeNull();
    expect(draftNote(carry, "6/2", [])).toContain("whole number");
    expect(draftNote(carry, " ", [])).toBeNull();
  });

  it("offers boss moves only for the matching kind of problem", () => {
    expect(bossStepFits(add(45, 17), "bundle")).toBe(true);
    expect(bossStepFits(add(45, 17), "shatter")).toBe(false);
    expect(bossStepFits(sub(52, 17), "takeTens")).toBe(true);
    expect(bossStepFits(frac(1, 2, 1, 3), "slice")).toBe(true);
    expect(bossStepFits(frac(1, 2, 1, 3), "bundle")).toBe(false);
    for (const p of [add(45, 17), sub(52, 17), frac(1, 2, 1, 3)]) expect(bossStepFits(p, "count")).toBe(true);
  });
});

describe("boss mechanics", () => {
  it("bundles ten ones into a ten against the Carry Colossus", () => {
    const start = bundleStart(add(45, 17));
    expect(start).toEqual({ tens: 5, ones: 12, bundled: false });
    const bundled = bundleTen(start);
    expect(bundled).toEqual({ tens: 6, ones: 2, bundled: true });
    expect(bundleTen(bundled!)).toBeNull();
    expect(blockValue(bundled!)).toBe(62);
  });

  it("shatters a ten before taking away ones against the Borrowing Behemoth", () => {
    const p = sub(52, 17);
    const start = shatterStart(p);
    expect(takeOnes(p, start)).toBeNull();
    expect(takeTens(p, start)).toBeNull();
    const shattered = shatterTen(start)!;
    expect(shattered).toMatchObject({ tens: 4, ones: 12 });
    expect(shatterTen(shattered)).toBeNull();
    const ones = takeOnes(p, shattered)!;
    const tens = takeTens(p, ones)!;
    expect(blockValue(tens)).toBe(35);
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const q = generateProblem("sub_borrow", rng) as ReturnType<typeof sub>;
      const done = takeTens(q, takeOnes(q, shatterTen(shatterStart(q))!)!)!;
      expect(blockValue(done)).toBe(q.a - q.b);
    }
  });

  it("slices both pizzas into matching pieces against the Denominator Demon", () => {
    const p = frac(1, 2, 1, 3);
    expect(sliceOptions(p)).toEqual([3, 4, 5, 6, 12]);
    expect(sliceWorks(p, 5)).toBe(false);
    expect(sliceWorks(p, 6)).toBe(true);
    expect(sliceWorks(p, 12)).toBe(true);
    expect(sliceCounts(p, 6)).toEqual([3, 2]);
    const rng = createRng(11);
    for (let i = 0; i < 200; i++) {
      for (const id of ["frac_like", "frac_unlike"] as const) {
        const f = generateProblem(id, rng) as ReturnType<typeof frac>;
        const options = sliceOptions(f);
        expect(options.some((s) => sliceWorks(f, s))).toBe(true);
        expect(options.some((s) => !sliceWorks(f, s))).toBe(true);
        const size = options.find((s) => sliceWorks(f, s))!;
        const [left, right] = sliceCounts(f, size);
        expect(isCorrect(f, { num: left + right, den: size })).toBe(true);
      }
    }
  });
});
