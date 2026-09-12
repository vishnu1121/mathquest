// The bug library: wrong answers that common addition mistakes produce.
// Code detects mistakes; AI only rewords the hint. The same library builds multiple-choice
// distractors and Pip's Puzzle mistakes.
import type { Challenge, MisconceptionId } from "./types";

export interface BugAnswer {
  id: MisconceptionId;
  value: number;
}

export interface MisconceptionInfo {
  /** Plain description for grown-ups and the tutor note. */
  grownUp: string;
  /** Whether this mistake is about place value, which the base-ten blocks scaffold targets. */
  placeValue: boolean;
}

export const MISCONCEPTIONS: Readonly<Record<MisconceptionId, MisconceptionInfo>> = {
  columnConcat: { grownUp: "Wrote the tens sum and the ones sum side by side instead of trading 10 ones for a ten", placeValue: true },
  droppedCarry: { grownUp: "Traded 10 ones for a ten but forgot to add that ten", placeValue: true },
  extraTen: { grownUp: "Added the traded ten twice", placeValue: true },
  placeValueShift: { grownUp: "Lined up a ones digit under the tens", placeValue: true },
  digitSum: { grownUp: "Added every digit as if they were all ones", placeValue: true },
  subtracted: { grownUp: "Subtracted instead of adding", placeValue: false },
  addedInsteadOfFinding: { grownUp: "Added both numbers instead of finding the missing part", placeValue: false },
  gaveTotal: { grownUp: "Gave the total instead of the missing part", placeValue: false },
  offByOne: { grownUp: "Counted one too many or one too few", placeValue: false },
};

const digitSum = (n: number): number =>
  String(Math.abs(n))
    .split("")
    .reduce((sum, d) => sum + Number(d), 0);

function collector(correct: number) {
  const bugs: BugAnswer[] = [];
  const add = (id: MisconceptionId, value: number) => {
    const valid = Number.isInteger(value) && value >= 0 && value !== correct;
    if (valid && !bugs.some((bug) => bug.value === value)) bugs.push({ id, value });
  };
  return { bugs, add };
}

/** Wrong totals for a + b, most specific mistake first. Never includes the correct total. */
export function totalBugAnswers(a: number, b: number): BugAnswer[] {
  const total = a + b;
  const { bugs, add } = collector(total);
  const onesSum = (a % 10) + (b % 10);
  const tensSum = Math.floor(a / 10) + Math.floor(b / 10);
  const multiDigit = a >= 10 || b >= 10;

  if (multiDigit && onesSum >= 10) {
    add("columnConcat", Number(`${tensSum}${onesSum}`));
    add("droppedCarry", total - 10);
    add("extraTen", total + 10);
  }
  if (a >= 10 && b < 10) add("placeValueShift", a + b * 10);
  if (b >= 10 && a < 10) add("placeValueShift", b + a * 10);
  if (multiDigit) add("digitSum", digitSum(a) + digitSum(b));
  add("subtracted", Math.abs(a - b));
  add("offByOne", total - 1);
  add("offByOne", total + 1);
  return bugs;
}

/** Wrong answers for a + ? = total, where the missing addend is the answer. */
export function addendBugAnswers(a: number, total: number): BugAnswer[] {
  const missing = total - a;
  const { bugs, add } = collector(missing);
  add("addedInsteadOfFinding", a + total);
  add("gaveTotal", total);
  add("offByOne", missing - 1);
  add("offByOne", missing + 1);
  return bugs;
}

export function bugAnswersFor(challenge: Pick<Challenge, "a" | "b" | "total" | "unknown">): BugAnswer[] {
  return challenge.unknown === "total"
    ? totalBugAnswers(challenge.a, challenge.b)
    : addendBugAnswers(challenge.a, challenge.total);
}

/** Names the mistake behind a wrong answer, or null when it is correct or not a known pattern. */
export function detectMisconception(
  challenge: Pick<Challenge, "a" | "b" | "total" | "unknown" | "answer">,
  given: number,
): MisconceptionId | null {
  if (given === challenge.answer) return null;
  return bugAnswersFor(challenge).find((bug) => bug.value === given)?.id ?? null;
}
