import { describe, expect, it } from "vitest";
import { evaluateAnswer, GUESS_WINDOW_MS, isLikelyGuess, parseAnswer } from "./evaluate";
import type { Challenge } from "./types";

const challenge: Challenge = {
  id: "c1",
  skill: "regroup",
  level: 3,
  format: "equation",
  a: 47,
  b: 38,
  total: 85,
  unknown: "total",
  answer: 85,
};

describe("parseAnswer", () => {
  it.each([
    ["85", 85],
    [" 7 ", 7],
    ["0", 0],
    ["", null],
    ["8a", null],
    ["-3", null],
    ["12345", null],
    ["4.5", null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseAnswer(raw)).toBe(expected);
  });
});

describe("evaluateAnswer", () => {
  it("marks the right answer correct with no misconception", () => {
    expect(evaluateAnswer(challenge, "85")).toEqual({ correct: true, value: 85, misconception: null });
  });

  it("names the mistake behind a known wrong answer", () => {
    expect(evaluateAnswer(challenge, "715")).toEqual({ correct: false, value: 715, misconception: "columnConcat" });
    expect(evaluateAnswer(challenge, 75).misconception).toBe("droppedCarry");
  });

  it("treats unreadable input as not answered", () => {
    expect(evaluateAnswer(challenge, "abc")).toEqual({ correct: false, value: null, misconception: null });
    expect(evaluateAnswer(challenge, -1).value).toBeNull();
  });
});

describe("isLikelyGuess", () => {
  it("only flags fast wrong answers", () => {
    expect(isLikelyGuess(false, GUESS_WINDOW_MS - 1)).toBe(true);
    expect(isLikelyGuess(false, GUESS_WINDOW_MS)).toBe(false);
    expect(isLikelyGuess(true, 200)).toBe(false);
  });
});
