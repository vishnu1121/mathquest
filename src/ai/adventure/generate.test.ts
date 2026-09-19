import { describe, expect, it } from "vitest";
import { acceptGenerated, numbersIn, parseRat, promptWords, runWork, specFromTask, type GenerateRequest } from "./generate";
import { CLASSES, chapterTask, engineChapter } from "../../adventure/classes/catalog";
import { apexTask } from "../../adventure/classes/apex";
import { checkTask, type Task } from "../../adventure/classes/tasks";

const req = (over: Partial<GenerateRequest> = {}): GenerateRequest => ({
  task: "generate",
  grade: "3",
  skill: "g3.oa.multiply",
  skillName: "Multiplication facts",
  topic: "Equal groups",
  quest: "Power the workshop.",
  kind: "number",
  format: "int",
  unit: "",
  example: { prompt: "There are 4 rows of 6 gears. How many gears?", answer: "24" },
  options: 0,
  apex: false,
  stretch: false,
  avoid: [],
  maxValue: 200,
  minSteps: 1,
  seed: 7,
  ...over,
});

/** A well-formed reply: the numbers are in the prompt and the work really does reach the answer. */
const good = {
  prompt: "Tinker loads 7 crates with 8 bolts each. How many bolts is that?",
  answer: "56",
  work: [{ op: "*" as const, a: "7", b: "8" }],
  hint: "Think of seven equal groups of eight.",
  explain: "Seven groups of eight bolts is 56 bolts.",
  options: [] as string[],
};

describe("exact arithmetic", () => {
  it("parses whole numbers, decimals, fractions and mixed numbers", () => {
    expect(parseRat("12")).toEqual({ n: 12, d: 1 });
    expect(parseRat("1.25")).toEqual({ n: 5, d: 4 });
    expect(parseRat("3/4")).toEqual({ n: 3, d: 4 });
    expect(parseRat("1 1/2")).toEqual({ n: 3, d: 2 });
    expect(parseRat("1,024")).toEqual({ n: 1024, d: 1 });
    expect(parseRat("apple")).toBeNull();
  });

  it("adds tenths exactly, where floating point does not", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in a float, and a child would be marked wrong.
    expect(runWork([{ op: "+", a: "0.1", b: "0.2" }], 10)!.result).toEqual({ n: 3, d: 10 });
  });

  it("chains steps through earlier results", () => {
    const ran = runWork([{ op: "*", a: "12", b: "3" }, { op: "-", a: "r0", b: "8" }], 100);
    expect(ran!.result).toEqual({ n: 28, d: 1 });
    expect(ran!.literals).toEqual([{ n: 12, d: 1 }, { n: 3, d: 1 }, { n: 8, d: 1 }]);
  });

  it("refuses a program that is not runnable", () => {
    expect(runWork([{ op: "+", a: "r0", b: "2" }], 100)).toBeNull(); // self reference
    expect(runWork([{ op: "+", a: "1", b: "2" }, { op: "+", a: "r5", b: "1" }], 100)).toBeNull(); // forward
    expect(runWork([{ op: "/", a: "8", b: "0" }], 100)).toBeNull();
    expect(runWork([], 100)).toBeNull();
  });

  it("refuses a route that goes below zero or past the ceiling", () => {
    // No grade here works with negative numbers, so a dip below zero is a route no child could walk.
    expect(runWork([{ op: "-", a: "3", b: "9" }], 100)).toBeNull();
    expect(runWork([{ op: "-", a: "3", b: "9" }, { op: "+", a: "r0", b: "10" }], 100)).toBeNull();
    expect(runWork([{ op: "*", a: "90", b: "90" }], 100)).toBeNull();
  });

  it("counts quantities the wording names in words", () => {
    expect(numbersIn("Half of the 18 apples")).toContainEqual({ n: 2, d: 1 });
    expect(numbersIn("a dozen eggs")).toContainEqual({ n: 12, d: 1 });
    expect(numbersIn("twice as many as 7")).toContainEqual({ n: 2, d: 1 });
  });
});

describe("acceptGenerated", () => {
  it("accepts a question whose work really reaches its answer", () => {
    const got = acceptGenerated(good, req());
    expect(got).not.toBeNull();
    expect(got!.task.kind).toBe("number");
    expect(got!.task.prompt).toBe(good.prompt);
    // The skill is the one the GAME asked for, never one the model chose: the learner model is keyed on it.
    expect(got!.task.skill).toBe("g3.oa.multiply");
    expect(checkTask(got!.task, { kind: "number", text: "56" })).toBe(true);
  });

  it("DROPS a question whose stated answer is not what its own work computes", () => {
    // The whole feature rests on this one: a wrong answer key marks a correct child wrong.
    expect(acceptGenerated({ ...good, answer: "54" }, req())).toBeNull();
    expect(acceptGenerated({ ...good, work: [{ op: "+", a: "7", b: "8" }] }, req())).toBeNull();
  });

  it("drops a question that uses a number it never shows the child", () => {
    expect(acceptGenerated({
      ...good,
      prompt: "Tinker loads 7 crates with 8 bolts each. How many bolts is that?",
      answer: "63",
      work: [{ op: "*", a: "7", b: "9" }],
    }, req())).toBeNull();
  });

  it("drops a question that prints its own answer", () => {
    expect(acceptGenerated({
      ...good,
      prompt: "Tinker loads 7 crates with 8 bolts each, making 56 bolts. How many bolts is that?",
      answer: "56",
    }, req())).toBeNull();
  });

  it("drops a question whose numbers leave the grade", () => {
    expect(acceptGenerated({
      ...good,
      prompt: "Tinker loads 700 crates with 800 bolts each. How many bolts is that?",
      answer: "560000",
      work: [{ op: "*", a: "700", b: "800" }],
    }, req())).toBeNull();
  });

  it("drops markup, code fences and empty text", () => {
    expect(acceptGenerated({ ...good, prompt: "<b>Tinker</b> loads 7 crates with 8 bolts each. How many?" }, req())).toBeNull();
    expect(acceptGenerated({ ...good, hint: "Use `7 * 8`." }, req())).toBeNull();
    expect(acceptGenerated({ ...good, explain: "" }, req())).toBeNull();
    expect(acceptGenerated(null, req())).toBeNull();
    expect(acceptGenerated({ prompt: "x", answer: "1" }, req())).toBeNull();
  });

  it("drops a question already asked this session", () => {
    expect(acceptGenerated(good, req({ avoid: [good.prompt.toUpperCase()] }))).toBeNull();
  });

  it("keeps a sentence inside the grade's reading budget", () => {
    const long = `Tinker loads 7 crates with 8 bolts each ${"and counts them again ".repeat(6)}so how many bolts is that?`;
    expect(promptWords("K")).toBeLessThan(promptWords("5"));
    expect(acceptGenerated({ ...good, prompt: long }, req({ grade: "K" }))).toBeNull();
  });

  it("enforces Apex's two-step floor in code, not in the prompt text", () => {
    expect(acceptGenerated(good, req({ apex: true, minSteps: 2 }))).toBeNull();
    const twoStep = {
      ...good,
      prompt: "Tinker loads 7 crates with 8 bolts each, then uses 6 bolts. How many are left?",
      answer: "50",
      work: [{ op: "*" as const, a: "7", b: "8" }, { op: "-" as const, a: "r0", b: "6" }],
    };
    expect(acceptGenerated(twoStep, req({ apex: true, minSteps: 2 }))).not.toBeNull();
  });

  it("verifies a fraction question exactly", () => {
    const fraction = {
      ...good,
      prompt: "Pip pours 1/2 of a jug, then 1/3 more. How much of the jug is that?",
      answer: "5/6",
      work: [{ op: "+" as const, a: "1/2", b: "1/3" }],
    };
    expect(acceptGenerated(fraction, req({ format: "fraction", maxValue: 20 }))).not.toBeNull();
    expect(acceptGenerated({ ...fraction, answer: "2/5" }, req({ format: "fraction", maxValue: 20 }))).toBeNull();
  });

  describe("multiple choice", () => {
    const choice = {
      ...good,
      options: ["56", "48", "63", "15"],
    };
    const choiceReq = () => req({ kind: "choice", options: 4 });

    it("accepts exactly one correct option and shuffles the position", () => {
      const got = acceptGenerated(choice, choiceReq());
      expect(got).not.toBeNull();
      const task = got!.task as Extract<Task, { kind: "choice" }>;
      expect(task.options).toHaveLength(4);
      expect(task.options.filter((o) => o.label === "56")).toHaveLength(1);
      expect(task.options.find((o) => o.id === task.answer)!.label).toBe("56");
    });

    it("drops a board with two right answers, a duplicate, or a label that is not a number", () => {
      expect(acceptGenerated({ ...choice, options: ["56", "56.0", "63", "15"] }, choiceReq())).toBeNull();
      expect(acceptGenerated({ ...choice, options: ["56", "56", "63", "15"] }, choiceReq())).toBeNull();
      expect(acceptGenerated({ ...choice, options: ["56", "lots", "63", "15"] }, choiceReq())).toBeNull();
      expect(acceptGenerated({ ...choice, options: ["48", "63", "15", "12"] }, choiceReq())).toBeNull();
      expect(acceptGenerated({ ...choice, options: ["56", "48"] }, choiceReq())).toBeNull(); // wrong count
    });

    it("drops choices offered for a typed answer", () => {
      expect(acceptGenerated({ ...good, options: ["56", "48"] }, req())).toBeNull();
    });
  });
});

describe("specFromTask: what may be regenerated at all", () => {
  const ctx = { grade: "3" as const, skillName: "Multiplication facts", topic: "Equal groups", quest: "Power up.", apex: false, stretch: false, avoid: [], seed: 3 };
  const numberTask: Task = { kind: "number", skill: "g3.oa.multiply", prompt: "What is 4 x 6?", answer: "24", format: "int", hint: "h", explain: "e" };

  it("builds a brief from a written question", () => {
    const spec = specFromTask(numberTask, ctx);
    expect(spec).not.toBeNull();
    expect(spec!.kind).toBe("number");
    expect(spec!.format).toBe("int");
    expect(spec!.example.answer).toBe("24");
    expect(spec!.minSteps).toBe(1);
    expect(spec!.maxValue).toBeGreaterThanOrEqual(24);
  });

  it("leaves a picture board exactly as the code drew it", () => {
    // A ten frame, a clock face or a set of blocks cannot be restated in words without becoming a
    // different and worse question, so those are never sent to a model at all.
    expect(specFromTask({ ...numberTask, visual: { type: "tenFrame", count: 7 } }, ctx)).toBeNull();
    expect(specFromTask({ ...numberTask, visual: { type: "clock", hour: 3, minute: 30 } }, ctx)).toBeNull();
    expect(specFromTask({ ...numberTask, visual: { type: "objects", groups: [{ emoji: "🍎", count: 4 }] } }, ctx)).toBeNull();
    expect(specFromTask({ ...numberTask, visual: { type: "text", text: "4 x 6" } }, ctx)).not.toBeNull();
  });

  it("leaves every board whose answer is an arrangement rather than a value", () => {
    const sort: Task = { kind: "sort", skill: "k.md.sort", prompt: "Sort these.", hint: "h", explain: "e", bins: [{ id: "a", label: "A" }, { id: "b", label: "B" }], items: [{ id: "1", label: "x", bin: "a" }, { id: "2", label: "y", bin: "b" }, { id: "3", label: "z", bin: "a" }] };
    expect(specFromTask(sort, ctx)).toBeNull();
  });

  it("leaves a multiple choice whose options are words, and takes one whose options are numbers", () => {
    const words: Task = { kind: "choice", skill: "k.g.name", prompt: "Which is a hexagon?", hint: "h", explain: "e", options: [{ id: "a", label: "Hexagon" }, { id: "b", label: "Square" }], answer: "a" };
    expect(specFromTask(words, ctx)).toBeNull();
    const numbers: Task = { ...words, options: [{ id: "a", label: "24" }, { id: "b", label: "18" }], answer: "a" };
    const spec = specFromTask(numbers, ctx);
    expect(spec!.kind).toBe("choice");
    expect(spec!.options).toBe(2);
  });

  it("asks for two steps and more room in Apex", () => {
    const spec = specFromTask(numberTask, { ...ctx, apex: true });
    expect(spec!.minSteps).toBe(2);
    expect(spec!.apex).toBe(true);
    expect(spec!.maxValue).toBeGreaterThan(specFromTask(numberTask, ctx)!.maxValue);
  });

  it("never leaks a real chapter question past its own ceiling", () => {
    // Walk real generated questions and check the brief always bounds the numbers it saw.
    const chapter = engineChapter("g4-express")!;
    for (let round = 0; round < 5; round++) {
      const task = chapterTask(chapter, 2024, round);
      const spec = specFromTask(task, { ...ctx, grade: "4" });
      if (!spec) continue;
      const largest = Math.max(...numbersIn(`${task.prompt} ${spec.example.answer}`).map((r) => r.n / r.d), 0);
      expect(spec.maxValue).toBeGreaterThanOrEqual(largest);
      expect(spec.skill).toBe(task.skill);
    }
  });
});

describe("how much of the game a question writer can actually reach", () => {
  const ctx = (grade: GenerateRequest["grade"], apex = false) => ({ grade, skillName: "", topic: "", quest: "", apex, stretch: false, avoid: [], seed: 1 });
  const share = (tasks: Task[], grade: GenerateRequest["grade"], apex = false) =>
    tasks.filter((task) => specFromTask(task, ctx(grade, apex))).length / tasks.length;

  const chapterRounds = (grade: GenerateRequest["grade"]) => {
    const out: Task[] = [];
    for (const chapter of CLASSES[grade].chapters) {
      if (chapter.kind !== "engine") continue;
      for (let round = 0; round < 5; round++) for (const seed of [1, 99, 12345]) out.push(chapterTask(chapter, seed, round));
    }
    return out;
  };

  // These numbers are the honest reach of the feature and belong in a test rather than a claim: the rest of
  // each island is hands-on boards — ten frames, clocks, coins, arrays, fraction bars, world puzzles — which
  // are deliberately never rewritten, because their question lives in the picture.
  it("reaches the written questions, and leaves the hands-on boards alone", () => {
    expect(share(chapterRounds("5"), "5")).toBeGreaterThan(0.45);
    expect(share(chapterRounds("4"), "4")).toBeGreaterThan(0.35);
    expect(share(chapterRounds("3"), "3")).toBeGreaterThan(0.15);
    expect(share(chapterRounds("2"), "2")).toBeGreaterThan(0.15);
    // Kindergarten is nearly all touching and counting, and that is the right answer for five-year-olds.
    expect(share(chapterRounds("K"), "K")).toBeLessThan(0.15);
  });

  it("reaches more of Apex than of the ordinary chapters, because Apex is where the written work is", () => {
    const apexRounds = (grade: "3" | "4" | "5") => {
      const out: Task[] = [];
      for (let slot = 1; slot <= 8; slot++) for (let round = 0; round < 5; round++) for (const seed of [1, 99, 12345]) out.push(apexTask(grade, slot, seed, round));
      return out;
    };
    for (const grade of ["3", "4", "5"] as const) expect(share(apexRounds(grade), grade, true), `apex ${grade}`).toBeGreaterThan(0.4);
    expect(share(apexRounds("3"), "3", true)).toBeGreaterThan(share(chapterRounds("3"), "3"));
  });
});
