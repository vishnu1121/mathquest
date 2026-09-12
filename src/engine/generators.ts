// Deterministic question generation. Every range rule below is checked in generators.test.ts.
import { totalBugAnswers } from "./misconceptions";
import type { Rng } from "./rng";
import { STORY_KINDS, templateStory } from "./stories";
import type { Challenge, Format, Level, Operands, SkillId, StoryTheme } from "./types";

const fromDigits = (tensDigit: number, onesDigit: number) => tensDigit * 10 + onesDigit;

function simpleOperands(level: Level, rng: Rng): Operands {
  switch (level) {
    case 1: {
      const a = rng.int(1, 4);
      return { a, b: rng.int(1, 5 - a) };
    }
    case 2: {
      const a = rng.int(1, 9);
      return { a, b: rng.int(1, 10 - a) };
    }
    case 3: {
      // Make-ten facts: two single digits that cross ten (8 + 5).
      const a = rng.int(6, 9);
      return { a, b: rng.int(11 - a, 9) };
    }
    case 4: {
      if (rng.next() < 0.5) {
        const a = rng.int(10, 15);
        return { a, b: rng.int(1, Math.min(9, 20 - a)) };
      }
      const a = rng.int(4, 9);
      return { a, b: rng.int(Math.max(2, 11 - a), 9) };
    }
  }
}

function twoDigitOperands(level: Level, rng: Rng): Operands {
  switch (level) {
    case 1: {
      const ao = rng.int(0, 8);
      return { a: fromDigits(rng.int(2, 8), ao), b: rng.int(1, 9 - ao) };
    }
    case 2: {
      const at = rng.int(1, 7);
      return { a: fromDigits(at, rng.int(1, 9)), b: rng.int(1, 9 - at) * 10 };
    }
    default: {
      const at = rng.int(1, 7);
      const ao = rng.int(0, 8);
      return { a: fromDigits(at, ao), b: fromDigits(rng.int(1, 8 - at), rng.int(0, 9 - ao)) };
    }
  }
}

function regroupOperands(level: Level, rng: Rng): Operands {
  switch (level) {
    case 1: {
      const ao = rng.int(5, 9);
      return { a: fromDigits(rng.int(1, 3), ao), b: rng.int(10 - ao, 9) };
    }
    case 2: {
      const ao = rng.int(3, 9);
      return { a: fromDigits(rng.int(2, 8), ao), b: rng.int(10 - ao, 9) };
    }
    case 3: {
      const at = rng.int(1, 7);
      const ao = rng.int(2, 9);
      return { a: fromDigits(at, ao), b: fromDigits(rng.int(1, 8 - at), rng.int(10 - ao, 9)) };
    }
    case 4: {
      // Both places regroup, so the sum passes 100 (68 + 57).
      const at = rng.int(4, 9);
      const ao = rng.int(2, 9);
      return { a: fromDigits(at, ao), b: fromDigits(rng.int(Math.max(1, 9 - at), 9), rng.int(10 - ao, 9)) };
    }
  }
}

function wordProblemOperands(level: Level, rng: Rng): Operands {
  switch (level) {
    case 1:
      return simpleOperands(2, rng);
    case 2:
      return simpleOperands(3, rng);
    case 3:
      return rng.next() < 0.5 ? twoDigitOperands(1, rng) : regroupOperands(1, rng);
    case 4:
      return regroupOperands(3, rng);
  }
}

export function generateOperands(skill: SkillId, level: Level, rng: Rng): Operands {
  switch (skill) {
    case "simple":
      return simpleOperands(level, rng);
    case "twoDigit":
      return twoDigitOperands(level, rng);
    case "regroup":
      return regroupOperands(level, rng);
    case "wordProblems":
      return wordProblemOperands(level, rng);
  }
}

/** Three wrong choices, preferring answers that real mistakes produce. */
export function buildChoices(a: number, b: number, rng: Rng): number[] {
  const correct = a + b;
  const picked: number[] = [];
  const offer = (value: number) => {
    if (value > 0 && value !== correct && !picked.includes(value) && picked.length < 3) picked.push(value);
  };
  for (const bug of totalBugAnswers(a, b)) {
    if (bug.id !== "offByOne" && bug.value < 1000) offer(bug.value);
  }
  for (const value of rng.shuffle([correct + 1, correct - 1, correct + 10, correct - 10, correct + 2])) offer(value);
  return rng.shuffle([correct, ...picked]);
}

export interface ChallengeRequest {
  skill: SkillId;
  level: Level;
  format: Exclude<Format, "pipPuzzle">;
  /** Theme for story problems; defaults to the forest. */
  theme?: StoryTheme;
}

function storyKindFor(format: ChallengeRequest["format"], rng: Rng) {
  if (format === "multipleChoice") return rng.pick(["addTo", "putTogether"] as const);
  if (format === "missingAddend") return "changeUnknown";
  return rng.pick(STORY_KINDS);
}

export function createChallenge(request: ChallengeRequest, rng: Rng, id: string): Challenge {
  const { skill, level, format } = request;
  const { a, b } = generateOperands(skill, level, rng);

  // Story problems can also use the picture or multiple-choice layouts, so the
  // story-problem skill can show independent success in more than one format.
  const story =
    format === "wordProblem" || skill === "wordProblems"
      ? templateStory(storyKindFor(format, rng), a, b, rng, request.theme)
      : undefined;
  const unknown = format === "missingAddend" || story?.kind === "changeUnknown" ? "addend" : "total";
  const choices = format === "multipleChoice" ? buildChoices(a, b, rng) : undefined;

  return {
    id,
    skill,
    level,
    format,
    a,
    b,
    total: a + b,
    unknown,
    answer: unknown === "addend" ? b : a + b,
    ...(story ? { story } : {}),
    ...(choices ? { choices } : {}),
  };
}
