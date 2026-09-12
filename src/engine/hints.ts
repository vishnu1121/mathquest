// Hoot's hint ladder (spec §18). Built-in hints show instantly; AI may reword them for the
// child, but levels 1 to 4 never reveal the answer, which hints.test.ts checks.
import type { Challenge, HintLevel, MisconceptionId } from "./types";

export type HintKind = "nudge" | "strategy" | "visual" | "steps" | "explain";

export interface Hint {
  level: Exclude<HintLevel, 0>;
  kind: HintKind;
  text: string;
  /** Guided questions for level 4. */
  steps?: string[];
  /** Level 3 shows base-ten blocks or a ten-frame. */
  showBlocks?: boolean;
}

export const MAX_HINT_LEVEL = 5;

const tensOf = (n: number) => Math.floor(n / 10);
const onesOf = (n: number) => n % 10;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function facts(c: Challenge) {
  const ao = onesOf(c.a);
  const bo = onesOf(c.b);
  const onesSum = ao + bo;
  return {
    ao,
    bo,
    at: tensOf(c.a),
    bt: tensOf(c.b),
    onesSum,
    multiDigit: c.a >= 10 || c.b >= 10,
    regroups: (c.a >= 10 || c.b >= 10) && onesSum >= 10,
    bigger: Math.max(c.a, c.b),
    smaller: Math.min(c.a, c.b),
  };
}

function strategyText(c: Challenge, misconception: MisconceptionId | null): string {
  const f = facts(c);
  switch (misconception) {
    case "columnConcat":
      return `${f.ao} + ${f.bo} makes ${f.onesSum} ones. That's too many for the ones place! Trade 10 ones for 1 ten.`;
    case "droppedCarry":
      return "You traded 10 ones for a ten. Don't forget to add that ten to the tens!";
    case "extraTen":
      return "The traded ten only gets added once.";
    case "placeValueShift":
      return `${c.b < 10 ? c.b : c.a} is just ones. Line it up under the ones.`;
    case "digitSum":
      return `The ${f.at} in ${c.a} means ${plural(f.at, "ten")}, not ${f.at} ones.`;
    case "subtracted":
      return "Adding makes more. Put the two groups together.";
    case "addedInsteadOfFinding":
    case "gaveTotal":
      return `${c.total} is the whole amount. How many more do you need to get from ${c.a} to ${c.total}?`;
    case "offByOne":
      return "So close! Count again, one step at a time.";
    case null:
      if (c.unknown === "addend") return `Start at ${c.a} and count up to ${c.total}.`;
      if (f.regroups) return "Add the ones first. Is that 10 or more?";
      if (f.multiDigit) return "Add the ones, then add the tens.";
      return `Start at ${f.bigger} and count up ${f.smaller} more.`;
  }
}

function steps(c: Challenge): string[] {
  const f = facts(c);
  if (c.unknown === "addend") {
    return [`Start at ${c.a}.`, `Count up until you reach ${c.total}.`, "How many did you count?"];
  }
  if (f.regroups) {
    const tensPart = f.bt > 0 ? `${plural(f.at, "ten")} + ${plural(f.bt, "ten")} + 1 ten` : `${plural(f.at, "ten")} + 1 ten`;
    return [`What is ${f.ao} + ${f.bo}?`, `${f.onesSum} ones = 1 ten and how many ones?`, `${tensPart} = how many tens?`];
  }
  if (f.multiDigit) {
    return [`What is ${f.ao} + ${f.bo}?`, `What is ${plural(f.at, "ten")} + ${plural(f.bt, "ten")}?`, "Put the tens and ones together."];
  }
  return [`Start at ${f.bigger}.`, `Count up ${f.smaller} more.`, "Where did you land?"];
}

function explanation(c: Challenge): string {
  const f = facts(c);
  if (c.unknown === "addend") return `From ${c.a}, count up ${c.b} to reach ${c.total}. The missing number is ${c.b}.`;
  if (f.regroups) {
    const tens = f.at + f.bt + 1;
    return `${f.ao} + ${f.bo} = ${f.onesSum}. Trade 10 ones for a ten, leaving ${f.onesSum - 10} ones. Then ${f.at} + ${f.bt} + 1 = ${tens} tens. So ${c.a} + ${c.b} = ${c.total}.`;
  }
  return `${c.a} + ${c.b} = ${c.total}.`;
}

export function hintFor(challenge: Challenge, level: Exclude<HintLevel, 0>, misconception: MisconceptionId | null = null): Hint {
  const f = facts(challenge);
  switch (level) {
    case 1:
      return {
        level,
        kind: "nudge",
        text:
          challenge.unknown === "addend"
            ? `What number goes with ${challenge.a} to make ${challenge.total}?`
            : f.multiDigit
              ? "Start with the ones."
              : "Try counting on from the bigger number.",
      };
    case 2:
      return { level, kind: "strategy", text: strategyText(challenge, misconception) };
    case 3:
      return {
        level,
        kind: "visual",
        text: f.multiDigit ? "Let's build it with blocks." : "Let's count it with a ten-frame.",
        showBlocks: true,
      };
    case 4:
      return { level, kind: "steps", text: "Let's go one step at a time.", steps: steps(challenge) };
    case 5:
      return { level, kind: "explain", text: explanation(challenge) };
  }
}
