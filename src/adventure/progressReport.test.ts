import { describe, expect, it } from "vitest";
import { progressReport, reportLines } from "./progressReport";
import { restoreCurriculum, recordPractice } from "./curriculum";
import { restoreVoyage } from "./voyage";

describe("adult progress evidence", () => {
  it("shows an honest empty snapshot for absent or damaged saves", () => {
    for (const input of [null, {}, { learning: "bad", curriculum: false, voyage: [] }]) {
      const report = progressReport(input); expect(report.hasEvidence).toBe(false); expect(report.independent).toBe(0); expect(report.explored).toBe(0); expect(report.chapters).toBe(8); expect(reportLines(report)).toEqual([]);
    }
  });
  it("separates wrong, supported and independent attempts without double-counting mirrored voyage evidence", () => {
    let curriculum = restoreCurriculum(null);
    curriculum = recordPractice(curriculum, "fractions", false, 1, false, 1, "bridge-composition");
    curriculum = recordPractice(curriculum, "fractions", true, 2, false, 1, "bridge-composition");
    curriculum = recordPractice(curriculum, "fractions", true, 1, false, 1, "bridge-composition");
    const voyage = restoreVoyage(null); voyage.recent = [{ skill: "fractions", correct: true, independent: true }, { skill: "operation sequences", correct: true, independent: true }];
    const report = progressReport({ curriculum, voyage, chapters: { garden: true, "dream-garden": true }, best: { frog: 999999 } });
    expect(report.completed).toBe(1); expect(report.recent).toBe(4); expect(report.independent).toBe(2); expect(report.supported).toBe(1); expect(report.retry).toBe(1);
    expect(report.rows.find((r) => r.id === "fractions")?.marks).toEqual(["retry", "supported", "independent"]);
    expect(report.priority.id).toBe("fractions");
  });
  it("reports only the retained window rather than claiming a full history", () => {
    let curriculum = restoreCurriculum(null);
    for (let i = 0; i < 25; i++) curriculum = recordPractice(curriculum, "geometry", true, 1, false, 1, "area-perimeter-design");
    const report = progressReport({ curriculum }); expect(report.recent).toBe(8); expect(report.independent).toBe(8); expect(report.rows.find((r) => r.id === "geometry")?.attempts).toBe(25);
  });
  it("preserves existing checkpoints when later chapters are added", () => {
    const save = restoreVoyage({ ...restoreVoyage(null), promise: "listen", runs: { skyrail: { seed: 12, round: 2, independent: 1, helped: true } } });
    expect(save.runs.skyrail?.round).toBe(2); expect(save.runs.garden).toBeUndefined(); expect(save.promise).toBe("listen");
  });
});
