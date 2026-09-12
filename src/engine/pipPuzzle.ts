// Pip's Puzzle: Pip shows worked column addition containing a real mistake from the bug
// library, with fresh numbers. The child finds the wrong part, then picks the fix.
// Pip's wrong work is always computed here, never written by AI.
import { generateOperands } from "./generators";
import { totalBugAnswers } from "./misconceptions";
import type { Rng } from "./rng";
import type { MisconceptionId } from "./types";

export type PipMistake = Extract<
  MisconceptionId,
  "columnConcat" | "droppedCarry" | "extraTen" | "placeValueShift" | "digitSum"
>;

export const PIP_MISTAKES: readonly PipMistake[] = [
  "columnConcat",
  "droppedCarry",
  "extraTen",
  "placeValueShift",
  "digitSum",
];

/** The part of Pip's work the child should tap. */
export type MistakePart = "ones" | "tens" | "setup" | "whole";

/** An explanation card for Teach Pip. The right card names the mistake Pip actually made. */
export interface TeachCard {
  mistake: PipMistake;
  text: string;
}

const TEACH_TEXT: Readonly<Record<PipMistake, string>> = {
  columnConcat: "Too many ones in one spot. Pip needed to trade 10 ones for a ten.",
  droppedCarry: "Pip traded 10 ones for a ten, then forgot to add that ten.",
  extraTen: "Pip added the traded ten two times.",
  placeValueShift: "Pip put a ones number under the tens.",
  digitSum: "Pip added every digit as if they were all ones.",
};

const PIP_THANKS: Readonly<Record<PipMistake, string>> = {
  columnConcat: "Ohh, I get it! I need to trade 10 ones for a ten. Thank you for teaching me!",
  droppedCarry: "Oops, I forgot the ten I traded! Thank you for teaching me!",
  extraTen: "Oh no, I counted that ten twice! Thank you for teaching me!",
  placeValueShift: "Aha! Ones go under the ones. Thank you for teaching me!",
  digitSum: "I see! The tens digit means tens. Thank you for teaching me!",
};

export interface PipPuzzle {
  id: string;
  mistake: PipMistake;
  a: number;
  b: number;
  correct: number;
  pipAnswer: number;
  /** Pip lined the bottom number's ones digit up under the tens. */
  bottomShifted: boolean;
  /** What Pip wrote under the line, ones place first. Empty when Pip wrote one whole number. */
  resultCells: string[];
  mistakePart: MistakePart;
  /** Three answers to pick from: the fix, Pip's answer and one other mistake. */
  choices: number[];
  pipLine: string;
  /** Why Pip's work is wrong, said once the child finds the mistake. */
  explanation: string;
  /** Three explanation cards for Teach Pip, exactly one of them right. */
  teachCards: TeachCard[];
  /** What Pip says after the child picks the right explanation. */
  thanks: string;
}

export const isPipMistake = (m: MisconceptionId): m is PipMistake => (PIP_MISTAKES as readonly string[]).includes(m);

const tensOf = (n: number) => Math.floor(n / 10);
const onesOf = (n: number) => n % 10;

export function createPipPuzzle(mistake: PipMistake, rng: Rng, id: string): PipPuzzle {
  const { a, b } = generateOperands("regroup", mistake === "placeValueShift" ? 2 : 3, rng);
  const correct = a + b;
  const onesSum = onesOf(a) + onesOf(b);
  const tensSum = tensOf(a) + tensOf(b);
  const digitTotal = onesSum + tensSum;

  const work: Record<
    PipMistake,
    { pipAnswer: number; cells: string[]; part: MistakePart; line: string; explanation: string }
  > = {
    columnConcat: {
      pipAnswer: Number(`${tensSum}${onesSum}`),
      cells: [String(onesSum), String(tensSum)],
      part: "ones",
      line: `I fixed the bridge with ${tensSum}${onesSum} logs, but now it's way too long! What went wrong?`,
      explanation: `${onesSum} ones can't fit in the ones place. Pip needed to trade 10 ones for a ten.`,
    },
    droppedCarry: {
      pipAnswer: correct - 10,
      cells: [String(onesOf(onesSum)), String(tensSum)],
      part: "tens",
      line: "My bridge is one plank short! What did I forget?",
      explanation: "Pip traded 10 ones for a ten, then forgot to add that ten to the tens.",
    },
    extraTen: {
      pipAnswer: correct + 10,
      cells: [String(onesOf(onesSum)), String(tensSum + 2)],
      part: "tens",
      line: "My bridge has one extra plank! Where did it come from?",
      explanation: "Pip added the traded ten twice. It only gets added once.",
    },
    placeValueShift: {
      pipAnswer: a + b * 10,
      cells: [String(onesOf(a)), String(tensOf(a) + b)],
      part: "setup",
      line: "I lined up my numbers super fast. Is something in the wrong spot?",
      explanation: `${b} means ${b} ones, so it goes under the ones, not the tens.`,
    },
    digitSum: {
      pipAnswer: digitTotal,
      cells: [],
      part: "whole",
      line: `I added all the digits and got ${digitTotal}. That seems too small!`,
      explanation: `The ${tensOf(a)} in ${a} means ${tensOf(a)} tens, not ${tensOf(a)} ones.`,
    },
  };

  const chosen = work[mistake];
  const otherMistake = totalBugAnswers(a, b).find(
    (bug) => bug.value !== chosen.pipAnswer && bug.id !== "offByOne" && bug.id !== "subtracted",
  );
  const distractor = otherMistake?.value ?? correct + 1;

  return {
    id,
    mistake,
    a,
    b,
    correct,
    pipAnswer: chosen.pipAnswer,
    bottomShifted: mistake === "placeValueShift",
    resultCells: chosen.cells,
    mistakePart: chosen.part,
    choices: rng.shuffle([correct, chosen.pipAnswer, distractor]),
    pipLine: chosen.line,
    explanation: chosen.explanation,
    teachCards: rng
      .shuffle([mistake, ...rng.shuffle(PIP_MISTAKES.filter((m) => m !== mistake)).slice(0, 2)])
      .map((m) => ({ mistake: m, text: TEACH_TEXT[m] })),
    thanks: PIP_THANKS[mistake],
  };
}
