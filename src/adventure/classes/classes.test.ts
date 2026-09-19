import { describe, expect, it } from "vitest";
import { BONUS_BY_SLOT, CLASSES, CLASS_LIST, ROUNDS, SKILL_NAMES, chapterHome, chapterTask, engineChapter, practiceTask, type EngineChapter } from "./catalog";
import { CLASSIC_HOME, GRADE_IDS, assignFirstClass, recordClassWork, restoreClassWork, switchClass } from "./progress";
import { checkTask, correctResponse, normalizeAnswer, tickValue, validateTask, type Response, type Task } from "./tasks";
import { progressReport } from "../progressReport";

/** A response that must be wrong for this task. */
function wrongResponse(task: Task): Response {
  switch (task.kind) {
    case "world": return { kind: "world", moves: [] };
    case "scene": return { kind: "scene", selected: [] };
    case "choice": return { kind: "choice", id: task.options.find((o) => o.id !== task.answer)!.id };
    case "number": {
      const right = normalizeAnswer(task.answer, task.format, task.exact);
      const text = ["0", "1", "999999", "0 R 1", "(0, 0)", "1:01", "$0.01", "1/99", "2.5", "11:59"].find((t) => {
        const n = normalizeAnswer(t, task.format, task.exact);
        return n !== null && n !== right;
      })!;
      return { kind: "number", text };
    }
    case "line": {
      const other = Array.from({ length: task.ticks + 1 }, (_, i) => tickValue(task, i)).find((v) => Math.abs(v - task.answer) > 1e-9)!;
      return { kind: "line", value: other };
    }
    case "sort": {
      const placements = Object.fromEntries(task.items.map((i) => [i.id, i.bin]));
      const first = task.items[0]!;
      placements[first.id] = task.bins.find((b) => b.id !== first.bin)!.id;
      return { kind: "sort", placements };
    }
    case "build": return { kind: "build", values: Object.fromEntries(task.dials.map((d) => [d.id, d.start])) };
    case "order": return { kind: "order", ids: [...task.answer].reverse() };
  }
}

describe("class catalog", () => {
  it("gives every class the same structure: 8 chapters in slots 1–8, 6 practice trails and an expedition", () => {
    expect(CLASS_LIST.map((c) => c.id)).toEqual([...GRADE_IDS]);
    const ids = new Set<string>();
    for (const info of CLASS_LIST) {
      expect(info.chapters.map((c) => c.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(info.practice).toHaveLength(6);
      expect(info.expedition.sources.length).toBeGreaterThanOrEqual(5);
      for (const id of [...info.chapters.map((c) => c.id), ...info.practice.map((p) => p.id), info.expedition.id]) {
        expect(ids.has(id), id).toBe(false);
        ids.add(id);
      }
      for (const p of info.practice) if (p.kind === "engine") for (const source of p.sources) expect(engineChapter(source), source).toBeDefined();
      for (const source of info.expedition.sources) expect(engineChapter(source)?.id).toBe(source);
    }
    expect(BONUS_BY_SLOT).toHaveLength(8);
  });

  it("keeps every existing chapter in its original slot, in the class it now belongs to", () => {
    const original = ["frog", "fireflies", "guardian", "skyrail", "robotworks", "cloudbridge", "garden", "water"];
    original.forEach((id, i) => {
      const home = chapterHome(id)!;
      expect(home.chapter.kind).toBe(id === "fireflies" ? "engine" : "classic");
      expect(home.chapter.slot).toBe(i + 1);
      expect(home.grade).toBe(CLASSIC_HOME[id]);
    });
    expect(CLASS_LIST.flatMap((c) => c.chapters).filter((c) => c.kind === "engine")).toHaveLength(41);
  });

  it("generates sound tasks with exactly one right answer for every chapter round", () => {
    const chapters = CLASS_LIST.flatMap((c) => c.chapters).filter((c): c is EngineChapter => c.kind === "engine");
    for (const chapter of chapters) {
      expect(chapter.rounds, chapter.id).toHaveLength(ROUNDS);
      expect(chapter.intro.length).toBeGreaterThan(0);
      expect(chapter.outro.length).toBeGreaterThan(0);
      for (let round = 0; round < ROUNDS; round++) {
        for (let seed = 1; seed <= 40; seed++) {
          const task = chapterTask(chapter, seed * 2654435761 >>> 0, round);
          const label = `${chapter.id} round ${round + 1} seed ${seed}: ${task.prompt}`;
          expect(validateTask(task), label).toEqual([]);
          expect(checkTask(task, correctResponse(task)), label).toBe(true);
          expect(checkTask(task, wrongResponse(task)), label).toBe(false);
          expect(SKILL_NAMES[task.skill], `${label} (skill ${task.skill})`).toBeDefined();
        }
      }
    }
  });

  it("is deterministic for a seed, so saved checkpoints replay the same task", () => {
    const chapter = engineChapter("g3-fractions")!;
    expect(chapterTask(chapter, 42, 2)).toEqual(chapterTask(chapter, 42, 2));
    expect(practiceTask(CLASSES["5"].expedition.sources, 9, 3)).toEqual(practiceTask(CLASSES["5"].expedition.sources, 9, 3));
  });
});

describe("answers", () => {
  it("normalizes each answer format", () => {
    expect(normalizeAnswer("1,250", "int")).toBe("1250");
    expect(normalizeAnswer("12a", "int")).toBeNull();
    expect(normalizeAnswer("03.50", "decimal")).toBe("3.5");
    expect(normalizeAnswer(".25", "decimal")).toBe("0.25");
    expect(normalizeAnswer("6/8", "fraction")).toBe("3/4");
    expect(normalizeAnswer("1 1/2", "fraction")).toBe("3/2");
    expect(normalizeAnswer("4/2", "fraction")).toBe("2");
    expect(normalizeAnswer("6/8", "fraction", true)).toBe("6/8");
    expect(normalizeAnswer("3/0", "fraction")).toBeNull();
    expect(normalizeAnswer("3:05", "time")).toBe("3:05");
    expect(normalizeAnswer("13:05", "time")).toBeNull();
    expect(normalizeAnswer("$1.5", "money")).toBe("150");
    expect(normalizeAnswer("75¢", "money")).toBe("75");
    expect(normalizeAnswer("12 r 3", "remainder")).toBe("12R3");
    expect(normalizeAnswer("12", "remainder")).toBe("12R0");
    expect(normalizeAnswer("( 3 , 4 )", "pair")).toBe("3,4");
  });
});

describe("class progress report", () => {
  it("shows the current class's chapters and skills, keeping supported answers apart", () => {
    const report = progressReport({ grade: "3", chapters: { "g3-facts": true, frog: true }, classWork: { skills: { "g3.oa.multiply": { attempts: 3, recent: [{ correct: true, independent: true }, { correct: true, independent: false }, { correct: false, independent: false }] } } } });
    expect(report).toMatchObject({ grade: "Grade 3", completed: 1, chapters: 8, independent: 1, supported: 1, retry: 1 });
    const ids = report.rows.map((r) => r.id);
    expect(ids).toContain("g3.oa.multiply");
    expect(ids).toContain("g3.oa.divide");
    expect(ids).not.toContain("patterns");
    expect(ids).not.toContain("k.cc.count");
    expect(ids).not.toContain("sequences");
    expect(report.rows.every((r) => r.activity)).toBe(true);
    expect(progressReport({ chapters: { frog: true } }).chapters).toBe(8);
  });
});

describe("class progress", () => {
  it("keeps each class's chapters and learning separate while sharing coins, badges and the camp", () => {
    const start = { grade: "2", coins: 30, badges: { a: true }, chapters: { guardian: true }, stars: { guardian: 3 }, learning: { x: 1 }, voyage: { version: 1, camp: ["flower"], runs: { skyrail: { round: 2 } } } };
    const inThird = switchClass(start, "3");
    expect(inThird).toMatchObject({ grade: "3", coins: 30, badges: { a: true }, chapters: {}, stars: {} });
    expect(inThird.learning).toBeUndefined();
    expect((inThird.voyage as { camp: string[] }).camp).toEqual(["flower"]);
    expect((inThird.classes as Record<string, unknown>)["2"]).toMatchObject({ chapters: { guardian: true }, learning: { x: 1 } });
    const back = switchClass({ ...inThird, chapters: { robotworks: true }, coins: 45 }, "2");
    expect(back).toMatchObject({ grade: "2", coins: 45, chapters: { guardian: true }, stars: { guardian: 3 }, learning: { x: 1 } });
    expect((back.voyage as { runs: object }).runs).toEqual({ skyrail: { round: 2 } });
    expect((back.classes as Record<string, { chapters: object }>)["3"]!.chapters).toEqual({ robotworks: true });
    expect(switchClass(back, "2")).toEqual(back);
  });

  it("moves an older single-story save's chapters to the classes they now belong to", () => {
    const old = { coins: 12, chapters: { frog: true, fireflies: true, guardian: true, garden: true }, stars: { frog: 2, fireflies: 3 }, learning: { y: 2 } };
    const picked = assignFirstClass(old, "1");
    expect(picked).toMatchObject({ grade: "1", coins: 12, chapters: { frog: true }, stars: { frog: 2 }, learning: { y: 2 } });
    const classes = picked.classes as Record<string, { chapters: object; stars: object }>;
    expect(classes.K!.chapters).toEqual({ fireflies: true });
    expect(classes.K!.stars).toEqual({ fireflies: 3 });
    expect(classes["2"]!.chapters).toEqual({ guardian: true });
    expect(classes["3"]!.chapters).toEqual({ garden: true });
    expect(switchClass(picked, "K")).toMatchObject({ grade: "K", chapters: { fireflies: true }, stars: { fireflies: 3 } });
  });

  it("records bounded evidence that keeps supported answers separate", () => {
    let work = restoreClassWork({ skills: { bad: "x" } });
    expect(work).toEqual({ skills: {} });
    for (let i = 0; i < 10; i++) work = recordClassWork(work, "k.cc.count", i % 2 === 0, i < 5);
    expect(work.skills["k.cc.count"]!.attempts).toBe(10);
    expect(work.skills["k.cc.count"]!.recent).toHaveLength(8);
    expect(recordClassWork({ skills: {} }, "g1.md.time", false, true).skills["g1.md.time"]!.recent[0]).toEqual({ correct: false, independent: false });
  });
});
