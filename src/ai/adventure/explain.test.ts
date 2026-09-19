import { describe, expect, it } from "vitest";
import { acceptExplain, explainMessage, explainRequest, maxSteps, maxWords, type ExplainRequest } from "./explain";

const req = (over: Partial<ExplainRequest> = {}): ExplainRequest => ({
  task: "explain",
  grade: "2",
  skill: "Adding within 100",
  question: "Pip has 28 berries and finds 15 more. How many berries now?",
  answer: "43",
  given: "43",
  firstTry: true,
  board: "Two baskets of berries, one with 28 and one with 15.",
  ...over,
});

const ok = { steps: ["Start with 28 berries in the first basket.", "Add the 15 from the second basket."], answerLine: "So Pip has 43 berries now." };

describe("explain request", () => {
  it("accepts a real request and rejects unbounded text", () => {
    expect(explainRequest.safeParse(req()).success).toBe(true);
    expect(explainRequest.safeParse(req({ question: "x".repeat(301) })).success).toBe(false);
    expect(explainRequest.safeParse(req({ board: "x".repeat(601) })).success).toBe(false);
    expect(explainRequest.safeParse({ ...req(), task: "hint" }).success).toBe(false);
  });

  it("sends the answer and the caps, and never the raw instruction text", () => {
    const message = JSON.parse(explainMessage(req()));
    expect(message.answer).toBe("43");
    expect(message.maxSteps).toBe(3);
    expect(message.maxWordsPerStep).toBe(16);
    expect(message.solvedFirstTry).toBe(true);
  });
});

describe("step budget by grade", () => {
  it("gives the youngest the fewest steps and the shortest sentences", () => {
    expect([maxSteps("K"), maxSteps("1"), maxSteps("2"), maxSteps("3"), maxSteps("4"), maxSteps("5")]).toEqual([2, 2, 3, 3, 4, 4]);
    expect([maxWords("K"), maxWords("3"), maxWords("5")]).toEqual([12, 16, 20]);
  });
});

describe("acceptExplain", () => {
  it("accepts a well-formed explanation and tidies whitespace", () => {
    const got = acceptExplain({ steps: ["  Start with 28   berries. ", "Add the 15 more."], answerLine: " So Pip has 43 berries. " }, req());
    expect(got).toEqual({ steps: ["Start with 28 berries.", "Add the 15 more."], answerLine: "So Pip has 43 berries." });
  });

  it("drops an explanation that walks to a different answer than the code computed", () => {
    // The one failure that would actually mislead a child, and the one that is checkable.
    expect(acceptExplain({ ...ok, answerLine: "So Pip has 33 berries now." }, req())).toBeNull();
    expect(acceptExplain({ ...ok, answerLine: "So Pip has lots of berries." }, req())).toBeNull();
  });

  it("matches a grouped number against an ungrouped answer", () => {
    // Found live on "Multiply: 9,056 x 3": the code's answer is 27168 and the model writes 27,168.
    expect(acceptExplain({ steps: ["Multiply 9056 by 3.", "Three lots of nine thousand and fifty-six."], answerLine: "The product is 27,168." }, req({ grade: "4", answer: "27168" }))).not.toBeNull();
  });

  it("matches the answer through spacing and case", () => {
    expect(acceptExplain({ steps: ok.steps, answerLine: "So the share is 1 / 2 of the cake." }, req({ answer: "1/2" }))).not.toBeNull();
    expect(acceptExplain({ steps: ok.steps, answerLine: "So the shape is a Triangle." }, req({ answer: "triangle" }))).not.toBeNull();
  });

  it("enforces the grade's step budget", () => {
    const three = ["One.", "Two.", "Three."];
    expect(acceptExplain({ steps: three, answerLine: "So Pip has 43 berries." }, req({ grade: "2" }))).not.toBeNull();
    expect(acceptExplain({ steps: three, answerLine: "So Pip has 43 berries." }, req({ grade: "K" }))).toBeNull();
    expect(acceptExplain({ steps: ["Only one step."], answerLine: "So Pip has 43 berries." }, req())).toBeNull();
  });

  it("enforces the grade's sentence length", () => {
    const long = Array.from({ length: 17 }, (_, i) => `w${i}`).join(" ");
    expect(acceptExplain({ steps: [long, "Add the 15 more."], answerLine: "So Pip has 43 berries." }, req({ grade: "2" }))).toBeNull();
    expect(acceptExplain({ steps: [long, "Add the 15 more."], answerLine: "So Pip has 43 berries." }, req({ grade: "5" }))).not.toBeNull();
  });

  it("allows the comparison signs that are themselves answers", () => {
    // Found on a live run: "Which sign makes this true?" has the answer ">", and the first filter here
    // banned every "<" and ">" — so the closing line had to contain a character the same check then
    // rejected, and every comparison question failed. The guard catches tags, not maths.
    expect(acceptExplain({ steps: ["Compare the tens first.", "Eight tens beat three tens."], answerLine: "The correct sign is >." }, req({ answer: ">" }))).not.toBeNull();
    expect(acceptExplain({ steps: ["Compare the tens first.", "Three tens are fewer."], answerLine: "So 34 < 82 is true." }, req({ answer: "<" }))).not.toBeNull();
    expect(acceptExplain({ steps: ["Count both sides.", "They match exactly."], answerLine: "So 7 = 7 is correct." }, req({ answer: "=" }))).not.toBeNull();
  });

  it("rejects markup and malformed replies", () => {
    expect(acceptExplain({ ...ok, steps: ["<b>Start</b> with 28.", "Add 15."] }, req())).toBeNull();
    expect(acceptExplain({ ...ok, steps: ["Start </p> with 28.", "Add 15."] }, req())).toBeNull();
    expect(acceptExplain({ steps: ok.steps }, req())).toBeNull();
    expect(acceptExplain(null, req())).toBeNull();
    expect(acceptExplain({ steps: [], answerLine: "So Pip has 43 berries." }, req())).toBeNull();
    expect(acceptExplain({ ...ok, answerLine: "" }, req())).toBeNull();
  });
});
