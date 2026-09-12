import type { Grade, Level, SkillId } from "./types";

export interface SkillDefinition {
  id: SkillId;
  /** Name shown to grown-ups. */
  name: string;
  /** Name shown to the child on the map and progress screens. */
  kidName: string;
  maxLevel: Level;
  prerequisites: readonly SkillId[];
  /** Computation skills form the main trail; application skills (story problems) build on them. */
  kind: "computation" | "application";
}

export const SKILLS: Readonly<Record<SkillId, SkillDefinition>> = {
  simple: {
    id: "simple",
    name: "Adding within 20",
    kidName: "Adding within 20",
    maxLevel: 4,
    prerequisites: [],
    kind: "computation",
  },
  twoDigit: {
    id: "twoDigit",
    name: "2-digit adding without carrying",
    kidName: "Big-number adding",
    maxLevel: 3,
    prerequisites: ["simple"],
    kind: "computation",
  },
  regroup: {
    id: "regroup",
    name: "Carrying (regrouping)",
    kidName: "Trading tens",
    maxLevel: 4,
    prerequisites: ["twoDigit"],
    kind: "computation",
  },
  wordProblems: {
    id: "wordProblems",
    name: "Story problems",
    kidName: "Story problems",
    maxLevel: 4,
    prerequisites: ["simple"],
    kind: "application",
  },
};

/** Order skills appear on the trail and in progress views. */
export const SKILL_ORDER: readonly SkillId[] = ["simple", "twoDigit", "regroup", "wordProblems"];

export interface StartingPoint {
  skill: SkillId;
  level: Level;
}

/** Grade only sets where the warm-up starts. The warm-up itself decides the real placement. */
export function startingPoint(grade: Grade): StartingPoint {
  switch (grade) {
    case 0:
      return { skill: "simple", level: 1 };
    case 1:
      return { skill: "simple", level: 3 };
    case 2:
      return { skill: "twoDigit", level: 1 };
    default:
      return { skill: "regroup", level: 2 };
  }
}

export function clampLevel(skill: SkillId, level: number): Level {
  const max = SKILLS[skill].maxLevel;
  return Math.min(max, Math.max(1, Math.round(level))) as Level;
}
