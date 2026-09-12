// World reactivity (spec §26). The forest is derived only from the learner model, so grinding
// easy questions or leaning on hints can't advance it. Planks earned with help stay wobbly until
// the child solves that skill alone. Planks follow the best progress shown, so a mistake never
// takes one away, and they fill the bridge from the near bank outward.
import type { LearnerModel, SkillState } from "./learnerModel";
import { SKILL_ORDER } from "./skills";

export type PlankState = "missing" | "wobbly" | "solid" | "gold";
export type Weather = "fog" | "cloudy" | "sunny";

export interface WorldState {
  /** Left to right: solid planks, then wobbly ones, then gaps; the last plank is the Guardian's. */
  planks: PlankState[];
  masteredCount: number;
  /** One fog bank per skill that is not mastered yet. */
  fogLayers: number;
  weather: Weather;
  gateOpen: boolean;
  regionComplete: boolean;
}

export const PLANKS_PER_SKILL = 2;
/** Progress needed for each of a skill's planks. A mastered skill always fills both. */
export const PLANK_THRESHOLDS = [0.3, 0.6] as const;
const BRIDGE_PLANKS = SKILL_ORDER.length * PLANKS_PER_SKILL;
export const TOTAL_PLANKS = BRIDGE_PLANKS + 1;

function plankCounts(state: SkillState): { solid: number; wobbly: number } {
  if (state.mastered) return { solid: PLANKS_PER_SKILL, wobbly: 0 };
  const earned = PLANK_THRESHOLDS.filter((t) => state.peakMastery >= t).length;
  const solid = Math.min(earned, PLANK_THRESHOLDS.filter((t) => state.peakSolo >= t).length);
  return { solid, wobbly: earned - solid };
}

const repeat = (state: PlankState, count: number): PlankState[] => Array.from({ length: count }, () => state);

export function deriveWorld(model: LearnerModel, bossPassed: boolean): WorldState {
  const masteredCount = SKILL_ORDER.filter((id) => model.skills[id].mastered).length;
  const gateOpen = masteredCount === SKILL_ORDER.length;
  const regionComplete = gateOpen && bossPassed;
  const fogLayers = SKILL_ORDER.length - masteredCount;

  let planks: PlankState[];
  if (regionComplete) {
    planks = repeat("gold", TOTAL_PLANKS);
  } else {
    const counts = SKILL_ORDER.map((id) => plankCounts(model.skills[id]));
    const solid = counts.reduce((sum, c) => sum + c.solid, 0);
    const wobbly = counts.reduce((sum, c) => sum + c.wobbly, 0);
    planks = [...repeat("solid", solid), ...repeat("wobbly", wobbly), ...repeat("missing", BRIDGE_PLANKS - solid - wobbly), "missing"];
  }

  return {
    planks,
    masteredCount,
    fogLayers,
    weather: fogLayers >= 3 ? "fog" : fogLayers >= 1 ? "cloudy" : "sunny",
    gateOpen,
    regionComplete,
  };
}
