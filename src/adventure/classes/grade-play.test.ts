import { describe, expect, it } from "vitest";
import { createRng } from "../../engine/rng";
import { CLASSES, CLASS_LIST, chapterHome, chapterTask, practiceTask } from "./catalog";
import { checkTask, correctResponse, validateTask } from "./tasks";
import { classArenaTask, recordClassArena, restoreClassArena } from "./arena";
import { GRADE_IDS, switchClass, restoreRun } from "./progress";
import { fractionBridge, gateRun, patch, replayWorld, sharing, worldSolved } from "./worlds";
import { seedRows, coordinateRescue } from "./scenes";
import { equalSignSort, moneyWord } from "./familiesNumber";
import { riverRound } from "../riverLearning";

describe("grade boundaries across every activity", () => {
  it("keeps Grade 1 frog replays within 100 even with an advanced old save", () => {
    for(let seed=0;seed<200;seed++) for(let round=0;round<3;round++) {
      const r=riverRound({round,replay:true,overshoots:0,usedBig:true,learningLevel:4,maxTotal:100},createRng(seed));
      expect(r.start+r.hop).toBeLessThanOrEqual(100); expect(r.start).toBeGreaterThanOrEqual(0);
    }
  });
  it("never sends a class into another class's practice or arena, even at extreme ratings", () => {
    for (const grade of GRADE_IDS) for (const rating of [400, 800, 1000, 1500, 2000]) {
      let session = { ...restoreClassArena(grade), rating };
      for (let seed = 0; seed < 25; seed++) {
        const pick = classArenaTask(grade, seed * 65537, session);
        expect(chapterHome(pick.chapter)?.grade).toBe(grade);
        expect(validateTask(pick.task)).toEqual([]);
        expect(checkTask(pick.task, correctResponse(pick.task))).toBe(true);
        if (session.recent.length) expect(pick.chapter).not.toBe(session.recent.at(-1));
        session = recordClassArena(session, pick.chapter, pick.rating, seed % 2 === 0);
      }
    }
    for (const c of CLASS_LIST) for (const p of c.practice) {
      expect(p.kind).toBe("engine");
      if (p.kind !== "engine") continue;
      for (const source of p.sources) expect(chapterHome(source)?.grade).toBe(c.id);
      for (let seed = 0; seed < 20; seed++) expect(practiceTask(p.sources, seed, 0).skill.startsWith(c.id === "K" ? "k." : `g${c.id}.`)).toBe(true);
    }
  });
  it("isolates bonus records and checkpoint support while preserving shared cosmetics", () => {
    const original = { grade: "K", coins: 42, hat: "🧢", minis: { flight: true }, best: { flight: 8 }, classRuns: { fireflies: { seed: 17, round: 2, independent: 1, supported: true } }, voyage: { camp: { tent: true }, keepsakes: [], orchestra: { pattern: [1] } } };
    const other = switchClass(original, "5");
    expect(other.minis).toBeUndefined(); expect(other.best).toBeUndefined();
    expect(other.coins).toBe(42); expect(other.hat).toBe("🧢");
    const back = switchClass(other, "K");
    expect(back.minis).toEqual(original.minis); expect(back.classRuns).toEqual(original.classRuns);
    expect(restoreRun(original.classRuns.fireflies)?.supported).toBe(true);
    expect(restoreClassArena("5", restoreClassArena("K")).grade).toBe("5");
  });
});

describe("playable worlds", () => {
  it("generates legal solutions with age-appropriate operations across randomized worlds", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const r = createRng(seed * 7919);
      const tasks = [patch(r,"K",false,"k.oa.add"),patch(r,"K",true,"k.oa.sub"),patch(r,"1",true,"g1.oa.word"),patch(r,"2",true,"g2.nbt.sub1000"),sharing(r,"3","g3.oa.divide"),sharing(r,"4","g4.nbt.divide"),gateRun(r,"2","g2.oa.word"),gateRun(r,"3","g3.oa.twostep"), ...(["1","2","3","4","5"] as const).flatMap(g=>[fractionBridge(r,g,"test"),fractionBridge(r,g,"test",Number(g)>=4)])];
      for (const t of tasks) {
        expect(validateTask(t), `${seed}: ${t.prompt}`).toEqual([]);
        expect(worldSolved(t.world,[])).toBe(false);
        expect(worldSolved(t.world,t.solution)).toBe(true);
        expect(replayWorld(t.world,[{action:"give",index:-1,unit:Infinity}]).valid).toBe(false);
      }
      for (const t of tasks.slice(0,2)) if(t.world.game === "patch") expect(Math.max(t.world.start,t.world.target)).toBeLessThanOrEqual(10);
      const g2=tasks[6]!; if(g2.world.game === "gates") expect(g2.world.gates.flat().every(g=>g.op === "+" || g.op === "−")).toBe(true);
    }
  });
  it("rejects unequal sharing, illegal moves, repeated cells and an unvisited coordinate", () => {
    const share=sharing(createRng(11),"3","g3.oa.divide");
    expect(worldSolved(share.world,share.solution.map(m=>({...m,index:0})))).toBe(false);
    const rows=seedRows(createRng(42),"3");
    expect(checkTask(rows,{kind:"scene",selected:Array(rows.target).fill(0)})).toBe(false);
    expect(checkTask(rows,{kind:"scene",selected:[-1]})).toBe(false);
    const map=coordinateRescue(createRng(10)); expect(checkTask(map,{kind:"scene",selected:[]})).toBe(false);
  });
  it("has addition AND subtraction in Kindergarten, division in Grade 3, and unlike fractions in Grade 5", () => {
    const k=CLASSES.K.chapters.find(c=>c.id==="k-bunny")!;
    if(k.kind!=="engine") throw Error("missing chapter");
    expect(chapterTask(k,42,0).skill).toBe("k.oa.add");expect(chapterTask(k,42,1).skill).toBe("k.oa.sub");
    const g3=CLASSES["3"].chapters[0]!;if(g3.kind!=="engine") throw Error("missing chapter");
    expect(chapterTask(g3,42,1)).toMatchObject({kind:"world",world:{game:"share"}});
    const g5=fractionBridge(createRng(3),"5","g5.nf.add");
    expect(g5.world.game==="bridge"&&g5.world.recipe).toMatch(/\/(2|4) \+ 1\/3/);
  });
  it("handles tiny equality puzzles without a loop and keeps Grade 2 money in whole cents", () => {
    for(let seed=0;seed<500;seed++) {
      expect(validateTask(equalSignSort(createRng(seed),"g1.oa.equal",5))).toEqual([]);
      const t=moneyWord(createRng(seed),"g2.md.money");
      if(t.kind==="number"){expect(Number(t.answer)).toBeLessThan(100);expect(t.format).toBe("int");}
    }
  });
});
