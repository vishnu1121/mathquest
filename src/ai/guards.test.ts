import { describe, expect, it } from "vitest";
import { createLearnerModel } from "@/engine/learnerModel";
import { buildTutorFacts, templateNote } from "@/engine/tutorNote";
import { acceptHint, acceptStory, acceptTutorNote, type HintCase } from "./guards";

const carry: HintCase = {
  a: 47,
  b: 38,
  total: 85,
  answer: 85,
  unknown: "total",
  level: 2,
  builtInHint: "7 + 8 makes 15 ones. That's too many for the ones place! Trade 10 ones for 1 ten.",
};

describe("acceptHint", () => {
  it("accepts a short, kind rewording that stays with the built-in numbers", () => {
    expect(acceptHint("Look at the ones: 7 and 8 make 15. Can you trade 10 of them for a ten?", carry)).toBe(true);
  });

  it("rejects hints that reveal the answer before the final explanation", () => {
    expect(acceptHint("Trade a ten and you get 85!", carry)).toBe(false);
    expect(acceptHint("The ones make 5 after you trade, and the tens make 8.", carry)).toBe(false);
  });

  it("allows the answer in the final explanation", () => {
    const explanation = "7 + 8 = 15. Trade 10 ones for a ten, leaving 5 ones. Then 4 + 3 + 1 = 8 tens. So 47 + 38 = 85.";
    expect(acceptHint("So 47 + 38 = 85. You traded 10 ones for a ten!", { ...carry, level: 5, builtInHint: explanation })).toBe(true);
  });

  it("rejects long, shaming or unsafe hints", () => {
    expect(acceptHint("That is wrong. Try again.", carry)).toBe(false);
    expect(acceptHint(Array.from({ length: 40 }, () => "word").join(" "), carry)).toBe(false);
    expect(acceptHint("Visit www.example.com for help.", carry)).toBe(false);
  });

  it("doesn't count a number already on screen as a leak", () => {
    const missing: HintCase = { a: 1, b: 1, total: 2, answer: 1, unknown: "addend", level: 1, builtInHint: "What number goes with 1 to make 2?" };
    expect(acceptHint("Start at 1. How many more to reach 2?", missing)).toBe(true);
  });
});

describe("acceptStory", () => {
  it("accepts a story with exactly the game's numbers that ends in the question", () => {
    expect(acceptStory("The dinosaurs find 47 shiny eggs. Then they find 38 more. How many eggs do they have now?", 47, 38, "addTo")).toBe(true);
    expect(acceptStory("The rockets carry 28 stars. They pick up some more. Now they carry 45 stars. How many did they pick up?", 28, 17, "changeUnknown")).toBe(true);
  });

  it("rejects stories with extra or missing numbers", () => {
    expect(acceptStory("3 foxes find 47 berries and 38 more. How many berries now?", 47, 38, "addTo")).toBe(false);
    expect(acceptStory("The foxes find 47 berries. How many berries now?", 47, 38, "addTo")).toBe(false);
  });

  it("rejects subtraction stories, statements without a question, and long stories", () => {
    expect(acceptStory("The bears had 47 berries and ate 38. How many are left?", 47, 38, "addTo")).toBe(false);
    expect(acceptStory("The bears have 47 berries and find 38 more.", 47, 38, "addTo")).toBe(false);
    expect(acceptStory(`The bears have 47 berries. ${"They walk far. ".repeat(10)}They find 38 more. How many now?`, 47, 38, "addTo")).toBe(false);
  });
});

describe("acceptTutorNote", () => {
  const facts = buildTutorFacts(createLearnerModel(2), [], "Nova", "regroup");

  it("accepts the template and a faithful rewording", () => {
    expect(acceptTutorNote(templateNote(facts), facts)).toBe(true);
    expect(acceptTutorNote("Nova is just starting out. A good next step is 10 minutes of carrying practice.", facts)).toBe(true);
  });

  it("rejects notes that invent numbers or leave out the child", () => {
    expect(acceptTutorNote("Nova answered 93% correctly.", facts)).toBe(false);
    expect(acceptTutorNote("The child is doing fine.", facts)).toBe(false);
  });
});
