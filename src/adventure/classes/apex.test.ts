import { describe, expect, it } from "vitest";
import {
  ALL_GEMS, APEX_GRADES, APEX_ROUNDS, GEMS, NOVA, apexLevelId, apexQuestOpen, apexQuests, apexQuestsDone,
  apexTask, apexUnlocked, chaptersLeft, gemsFound, isApexGrade, isStretchRound, recordApexQuest, restoreApex, starsFor,
  type ApexGrade, type ApexSave,
} from "./apex";
import { CLASSES } from "./catalog";
import { GRADE_IDS } from "./progress";
import { checkTask, correctResponse, validateTask } from "./tasks";

const finished = (grade: ApexGrade) => Object.fromEntries(CLASSES[grade].chapters.map((c) => [c.id, true]));

describe("who gets Apex at all", () => {
  it("is offered to Grades 3, 4 and 5 and to nobody else", () => {
    expect([...APEX_GRADES]).toEqual(["3", "4", "5"]);
    for (const grade of GRADE_IDS) expect(isApexGrade(grade)).toBe(["3", "4", "5"].includes(grade));
  });

  it("stays shut for the younger classes even with every chapter finished", () => {
    // A Kindergarten save with a completed island must still not unlock Apex.
    for (const grade of ["K", "1", "2"] as const) {
      const chapters = Object.fromEntries(CLASSES[grade].chapters.map((c) => [c.id, true]));
      expect(apexUnlocked(grade, chapters)).toBe(false);
    }
  });

  it("opens only when every chapter of that class is done", () => {
    for (const grade of APEX_GRADES) {
      const all = finished(grade);
      expect(apexUnlocked(grade, all)).toBe(true);
      expect(chaptersLeft(grade, all)).toBe(0);

      const oneLeft = { ...all };
      delete oneLeft[CLASSES[grade].chapters[4]!.id];
      expect(apexUnlocked(grade, oneLeft)).toBe(false);
      expect(chaptersLeft(grade, oneLeft)).toBe(1);

      expect(apexUnlocked(grade, {})).toBe(false);
      expect(apexUnlocked(grade, undefined)).toBe(false);
    }
  });
});

describe("the eight quests", () => {
  it("reuses the class's own chapters, in order, under ids that cannot collide with them", () => {
    for (const grade of APEX_GRADES) {
      const quests = apexQuests(grade), chapters = CLASSES[grade].chapters;
      expect(quests).toHaveLength(8);
      quests.forEach((quest, i) => {
        expect(quest.slot).toBe(i + 1);
        expect(quest.chapterId).toBe(chapters[i]!.id);
        expect(quest.title).toBe(chapters[i]!.title);
        expect(quest.id).toBe(`apex-${chapters[i]!.id}`);
        // The id must not be a catalog id, or finishing Apex would write into chapter progress.
        expect(chapters.some((c) => c.id === quest.id)).toBe(false);
      });
    }
  });

  it("opens in slot order, one at a time", () => {
    const grade: ApexGrade = "4";
    let save = restoreApex(null);
    expect(apexQuestOpen(save, grade, 1)).toBe(true);
    expect(apexQuestOpen(save, grade, 2)).toBe(false);
    save = recordApexQuest(save, grade, 1, 5).save;
    expect(apexQuestOpen(save, grade, 2)).toBe(true);
    expect(apexQuestOpen(save, grade, 3)).toBe(false);
  });
});

describe("Apex questions from the built-in bank", () => {
  it("produces a sound, solvable question for every grade, quest and round", () => {
    // Apex has to be playable with no AI configured at all, so the fallback is a real question bank.
    for (const grade of APEX_GRADES) {
      for (let slot = 1; slot <= 8; slot++) {
        for (let round = 0; round < APEX_ROUNDS; round++) {
          const task = apexTask(grade, slot, 12345, round);
          expect(validateTask(task), `${grade} apex ${slot} round ${round}: ${task.prompt}`).toEqual([]);
          expect(checkTask(task, correctResponse(task))).toBe(true);
          expect(task.skill.startsWith(grade === "3" ? "g3." : grade === "4" ? "g4." : "g5.")).toBe(true);
        }
      }
    }
  });

  it("is the same question every time for the same seed, so a saved run resumes correctly", () => {
    const a = apexTask("5", 3, 777, 2), b = apexTask("5", 3, 777, 2);
    expect(a.prompt).toBe(b.prompt);
    expect(apexTask("5", 3, 778, 2).prompt === a.prompt).toBe(false);
  });

  it("draws the chapter's hardest rounds, and combines topics at the end of the quest", () => {
    const grade: ApexGrade = "3", slot = 1;
    const own = CLASSES[grade].chapters[slot - 1]!;
    // The last two rounds bring in a different chapter, so the quest ends by combining ideas.
    const laterSkills = new Set([apexTask(grade, slot, 5, 3).skill, apexTask(grade, slot, 5, 4).skill, apexTask(grade, slot, 9, 3).skill, apexTask(grade, slot, 9, 4).skill]);
    const ownSkills = new Set(own.kind === "engine" ? own.rounds.map((make, i) => apexTask(grade, slot, 5, Math.min(i, 2)).skill) : []);
    expect([...laterSkills].some((skill) => !ownSkills.has(skill))).toBe(true);
  });
});

describe("the stretch ration", () => {
  it("keeps next-grade questions inside the 5-15% the owner asked for", () => {
    for (const grade of APEX_GRADES) {
      let stretch = 0;
      const total = 8 * APEX_ROUNDS;
      for (let slot = 1; slot <= 8; slot++) for (let round = 0; round < APEX_ROUNDS; round++) if (isStretchRound(grade, slot, round)) stretch += 1;
      const share = stretch / total;
      expect(share, `grade ${grade} stretch share ${share}`).toBeGreaterThanOrEqual(0.05);
      expect(share).toBeLessThanOrEqual(0.15);
    }
  });

  it("keeps Grade 5 the most careful of the three, and spreads them out", () => {
    const count = (grade: ApexGrade) => { let n = 0; for (let s = 1; s <= 8; s++) for (let r = 0; r < APEX_ROUNDS; r++) if (isStretchRound(grade, s, r)) n += 1; return n; };
    expect(count("5")).toBeLessThan(count("3"));
    // Never two in a row: a run of stretch questions would stop being a stretch and start being a wall.
    for (const grade of APEX_GRADES) {
      const flags = Array.from({ length: 40 }, (_, i) => isStretchRound(grade, Math.floor(i / APEX_ROUNDS) + 1, i % APEX_ROUNDS));
      expect(flags.some((on, i) => on && flags[i + 1])).toBe(false);
    }
  });
});

describe("the treasure", () => {
  it("has seven hidden gems plus the Nova, each named after a real element", () => {
    expect(GEMS).toHaveLength(7);
    expect(ALL_GEMS).toHaveLength(8);
    expect(new Set(ALL_GEMS.map((g) => g.id)).size).toBe(8);
    expect(new Set(GEMS.map((g) => g.slot)).size).toBe(7);
    expect(GEMS.every((g) => g.element && g.fact.includes(g.element.toLowerCase()))).toBe(true);
    expect(NOVA.tier).toBe("ultimate");
    expect(NOVA.slot).toBe(0);
  });

  it("leaves at least one quest hiding nothing at all", () => {
    const slots = new Set(GEMS.map((g) => g.slot));
    const empty = [1, 2, 3, 4, 5, 6, 7, 8].filter((slot) => !slots.has(slot));
    expect(empty.length).toBeGreaterThanOrEqual(1);
  });

  it("never gives a gem just for entering Apex, and never the same gem twice", () => {
    const grade: ApexGrade = "3";
    let save = restoreApex(null);
    expect(gemsFound(save)).toBe(0);

    const first = recordApexQuest(save, grade, 1, 5);
    expect(first.found?.id).toBe("luna");
    save = first.save;
    // Replaying a quest you have already taken the gem from does not hand it over again.
    const again = recordApexQuest(save, grade, 1, 5);
    expect(again.found).toBeNull();
    expect(gemsFound(again.save)).toBe(1);
  });

  it("makes the rare ones need a good run, and says so by leaving them behind", () => {
    const grade: ApexGrade = "3";
    const base = recordApexQuest(restoreApex(null), grade, 1, 5).save;

    const scraped = recordApexQuest(base, grade, 2, 1);
    expect(scraped.found).toBeNull();
    expect(scraped.missed?.id).toBe("cerium"); // the reason to come back
    expect(scraped.save.quests[apexLevelId(CLASSES[grade].chapters[1]!.id)]).toBeTruthy();

    const sharp = recordApexQuest(scraped.save, grade, 2, 4);
    expect(sharp.found?.id).toBe("cerium");
  });

  it("holds the hardest gems back for a nearly perfect run", () => {
    const grade: ApexGrade = "5";
    let save = restoreApex(null);
    for (let slot = 1; slot <= 6; slot++) save = recordApexQuest(save, grade, slot, 5).save;
    expect(recordApexQuest(save, grade, 7, 3).found).toBeNull();
    expect(recordApexQuest(save, grade, 7, 4).found?.id).toBe("europium");
  });

  it("opens the island's own treasure only when every Apex quest is finished", () => {
    const grade: ApexGrade = "4";
    let save = restoreApex(null);
    for (let slot = 1; slot <= 7; slot++) {
      const step = recordApexQuest(save, grade, slot, 5);
      expect(step.nova).toBeNull();
      save = step.save;
    }
    expect(save.nova).toBe(false);
    const last = recordApexQuest(save, grade, 8, 5);
    expect(last.nova?.id).toBe("nova");
    expect(last.save.nova).toBe(true);
    expect(apexQuestsDone(last.save, grade)).toBe(8);
    // And it is given once, not on every replay of the last quest.
    expect(recordApexQuest(last.save, grade, 8, 5).nova).toBeNull();
  });

  it("gives the Nova even to a child who left gems behind, because it is for finishing", () => {
    const grade: ApexGrade = "3";
    let save = restoreApex(null);
    for (let slot = 1; slot <= 8; slot++) save = recordApexQuest(save, grade, slot, 0).save;
    expect(save.nova).toBe(true);
    // The rare ones are still out there.
    expect(save.gems.length).toBeLessThan(GEMS.length);
  });
});

describe("saved Apex progress", () => {
  it("starts over from nothing, which is what a class switch leaves behind", () => {
    // switchClass deletes a per-class field the incoming class has never written.
    for (const raw of [undefined, null, {}, "nonsense", { version: 2 }, { version: 1, quests: "no" }]) {
      const save = restoreApex(raw);
      expect(save).toEqual({ version: 1, quests: {}, gems: [], nova: false });
    }
  });

  it("keeps a real save, drops an invented gem, and never stores the Nova as an ordinary one", () => {
    const stored: ApexSave = { version: 1, quests: { "apex-g3-facts": { stars: 3, independent: 5, plays: 2 } }, gems: ["luna", "diamond", "luna", "nova"], nova: true };
    const save = restoreApex(stored);
    expect(save.gems).toEqual(["luna"]);
    expect(save.nova).toBe(true);
    expect(save.quests["apex-g3-facts"]!.stars).toBe(3);
    expect(gemsFound(save)).toBe(2);
  });

  it("keeps a child's best run when they replay a quest", () => {
    const grade: ApexGrade = "3";
    const strong = recordApexQuest(restoreApex(null), grade, 1, 5).save;
    const weak = recordApexQuest(strong, grade, 1, 1).save;
    const record = weak.quests[apexLevelId(CLASSES[grade].chapters[0]!.id)]!;
    expect(record.stars).toBe(3);
    expect(record.independent).toBe(5);
    expect(record.plays).toBe(2);
  });

  it("maps first-try answers to stars the same way a chapter does", () => {
    expect([0, 1, 2, 3, 4, 5].map(starsFor)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
