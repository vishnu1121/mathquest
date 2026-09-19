import { describe, expect, it } from "vitest";
import { REFERENCE_CARDS, cardsFor, type Card } from "./reference";
import { CLASSES } from "./catalog";
import { GRADE_IDS } from "./progress";
import { parseRat } from "../../ai/adventure/generate";

// A reference a child checks their own answer against has to be right every time. These are hand-written
// cards, so the test re-solves every equation in every worked example rather than trusting the author.

const OPS = { "+": (a: number, b: number) => a + b, "-": (a: number, b: number) => a - b, "×": (a: number, b: number) => a * b, "÷": (a: number, b: number) => a / b } as const;
/** A number, optionally a fraction written without spaces: 12, 1,024, 0.75, 3/4. */
const NUM = String.raw`\d[\d,]*(?:\.\d+)?(?:\/\d+)?`;
/** One side of an equation: a number, or several joined by spaced operators. */
const SIDE = `${NUM}(?:\\s[+\\-×÷]\\s${NUM})*`;
const EQUATION = new RegExp(`(${SIDE})\\s=\\s(${SIDE})`, "g");

/** Exact value of one side, or null when it mixes operators (then there is nothing unambiguous to check). */
function value(side: string): number | null {
  const parts = side.split(/\s([+\-×÷])\s/);
  const ops = parts.filter((_, i) => i % 2 === 1);
  if (ops.length && new Set(ops).size > 1) return null; // precedence would be a guess
  const numbers = parts.filter((_, i) => i % 2 === 0).map((n) => parseRat(n.trim()));
  if (numbers.some((n) => !n)) return null;
  let total = numbers[0]!.n / numbers[0]!.d;
  for (let i = 0; i < ops.length; i++) total = OPS[ops[i]! as keyof typeof OPS](total, numbers[i + 1]!.n / numbers[i + 1]!.d);
  return total;
}

function equations(card: Card): { text: string; left: number | null; right: number | null }[] {
  return [...card.example.matchAll(EQUATION)].map((m) => ({ text: m[0], left: value(m[1]!), right: value(m[2]!) }));
}

const every = Object.values(REFERENCE_CARDS).flat();

describe("maths cards", () => {
  it("gives every class a set, and never repeats a card id", () => {
    for (const grade of GRADE_IDS) expect(cardsFor(grade).length, `grade ${grade}`).toBeGreaterThanOrEqual(6);
    expect(new Set(every.map((c) => c.id)).size).toBe(every.length);
  });

  it("says something, and says it briefly enough to read on a card", () => {
    for (const card of every) {
      expect(card.title.trim(), card.id).toBeTruthy();
      expect(card.rule.trim(), card.id).toBeTruthy();
      expect(card.example.trim(), card.id).toBeTruthy();
      expect(card.icon.trim(), card.id).toBeTruthy();
      expect(card.title.length, card.id).toBeLessThanOrEqual(46);
      expect(card.rule.length, card.id).toBeLessThanOrEqual(130);
      expect(card.example.length, card.id).toBeLessThanOrEqual(150);
    }
  });

  // The one that matters: every sum a child might copy off a card is re-solved here.
  it("re-solves every equation in every worked example", () => {
    for (const card of every) {
      for (const { text, left, right } of equations(card)) {
        if (left === null || right === null) continue; // mixed operators: nothing unambiguous to check
        expect(Math.abs(left - right), `${card.id}: "${text}" does not balance (${left} vs ${right})`).toBeLessThan(1e-9);
      }
    }
  });

  it("actually works examples, rather than only describing them", () => {
    // A set of pure prose would pass the check above by having nothing to check.
    const worked = every.filter((card) => equations(card).some((e) => e.left !== null && e.right !== null));
    expect(worked.length / every.length).toBeGreaterThan(0.6);
    for (const grade of GRADE_IDS) {
      const gradeWorked = cardsFor(grade).filter((card) => equations(card).some((e) => e.left !== null));
      expect(gradeWorked.length, `grade ${grade} has too few worked examples`).toBeGreaterThanOrEqual(3);
    }
  });

  it("only teaches what this class's own chapters teach", () => {
    // Relevance, checked rather than asserted: a card's domain has to appear in the standards the class's
    // chapters already cite, so a Grade 3 card cannot quietly carry Grade 5 content.
    for (const grade of GRADE_IDS) {
      const cited = CLASSES[grade].chapters.map((c) => c.standards).join(" ");
      for (const card of cardsFor(grade)) {
        expect(card.standard.startsWith(`${grade}.`), `${card.id} is not a grade ${grade} standard`).toBe(true);
        expect(cited.includes(card.standard), `${card.id}: ${card.standard} is not taught in grade ${grade}`).toBe(true);
      }
    }
  });

  it("spreads across a class's domains instead of drilling one", () => {
    for (const grade of GRADE_IDS) {
      const domains = new Set(cardsFor(grade).map((c) => c.standard));
      expect(domains.size, `grade ${grade} covers only ${[...domains].join(", ")}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the examples free of markup, so they can be rendered as text", () => {
    for (const card of every) {
      for (const text of [card.title, card.rule, card.example]) {
        expect(/[<>{}]/.test(text), `${card.id}: ${text}`).toBe(false);
      }
    }
  });
});
