import type { GradeId } from "./progress";

/** Bonus play has its own age-appropriate controls; it never counts as curriculum mastery. */
export const BONUS_PROFILE: Record<GradeId, { pairs: number; beats: number[]; popGoal: number; wind: number; instruments: number; songBeats: number; label: string }> = {
  K: { pairs: 2, beats: [2, 2, 3], popGoal: 20, wind: 0, instruments: 2, songBeats: 4, label: "Touch pictures · short turns · no reading race" },
  1: { pairs: 3, beats: [2, 3, 3], popGoal: 60, wind: 0, instruments: 2, songBeats: 4, label: "Small numbers · simple routes · short rhythms" },
  2: { pairs: 4, beats: [3, 3, 4], popGoal: 100, wind: 0, instruments: 3, songBeats: 8, label: "Plan a route · pairs and patterns" },
  3: { pairs: 5, beats: [3, 4, 5], popGoal: 180, wind: 1, instruments: 4, songBeats: 8, label: "Equal groups · planning · friendly competition" },
  4: { pairs: 6, beats: [4, 5, 6], popGoal: 240, wind: 2, instruments: 4, songBeats: 8, label: "Longer patterns · aiming and strategy" },
  5: { pairs: 8, beats: [4, 6, 7], popGoal: 320, wind: 2, instruments: 4, songBeats: 8, label: "Coordinate routes · memory and strategy" },
};

/**
 * What each bonus game actually asks of a player. One line per game, not per grade: the card used to print
 * the learner's grade label under all eight, so every game claimed the same skills.
 */
export const BONUS_SKILLS: Record<string, string> = {
  mist: "Looking closely · steady hands",
  flight: "Make ten · timing under pressure",
  dance: "Copy a pattern · remember a sequence",
  courier: "Routes and coordinates · planning ahead",
  bowls: "Aim and angle · reading the wind",
  starmatch: "Memory · taking turns",
  prismpop: "Group and clear · chain reactions",
  orchestra: "Beats and patterns · listening",
  chuteSort: "Multiples, factors and primes · fast decisions",
  chuteExact: "Add to an exact total · plan before you catch",
};
export const bonusSkill = (id: string) => BONUS_SKILLS[id] ?? "";
