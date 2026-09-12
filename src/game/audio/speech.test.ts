import { describe, expect, it } from "vitest";
import type { Challenge } from "@/engine/types";
import { challengeSpeech, toSpeech } from "./speech";

const base: Challenge = { id: "c", skill: "regroup", level: 3, format: "equation", a: 47, b: 38, total: 85, unknown: "total", answer: 85 };

describe("toSpeech", () => {
  it("reads math symbols as words", () => {
    expect(toSpeech("28 + ? = 45")).toBe("28 plus what number equals 45");
    expect(toSpeech("7 + 8 makes 15 ones.")).toBe("7 plus 8 makes 15 ones.");
  });

  it("drops emoji and keeps real question marks", () => {
    expect(toSpeech("Great job! ⭐ How many logs now?")).toBe("Great job! How many logs now?");
  });
});

describe("challengeSpeech", () => {
  it("asks the question in words", () => {
    expect(challengeSpeech(base)).toBe("What is 47 plus 38?");
    expect(challengeSpeech({ ...base, unknown: "addend", answer: 38 })).toBe("47 plus what number equals 85?");
  });

  it("reads the story for story problems", () => {
    const story = { kind: "addTo" as const, text: "The beavers have 47 logs.", source: "template" as const };
    expect(challengeSpeech({ ...base, story })).toBe("The beavers have 47 logs.");
  });
});
