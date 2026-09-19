/** Dynamic scaffolding for one active problem: a small state machine that raises visual help as the player
 * hesitates or makes errors. Help never drops back during a problem, so the screen does not flicker between
 * supports. Tier 1 is only visual emphasis after a pause, so thinking time never marks an answer as supported;
 * tiers 2 and 3 follow incorrect attempts, which the evidence model already records as retries. */

export type ScaffoldTier = 0 | 1 | 2 | 3;
export type ScaffoldAction = "equation" | "highlight" | "blocks" | "groupedBlocks";

export const HESITATION_SECONDS = 5;

export const SCAFFOLD_TIERS: readonly { tier: ScaffoldTier; trigger: string; action: ScaffoldAction }[] = [
  { tier: 0, trigger: "Default", action: "equation" },
  { tier: 1, trigger: `Time on task > ${HESITATION_SECONDS} seconds`, action: "highlight" },
  { tier: 2, trigger: "1 incorrect attempt", action: "blocks" },
  { tier: 3, trigger: "2 incorrect attempts", action: "groupedBlocks" },
];

const ACTIONS: Record<ScaffoldTier, ScaffoldAction> = { 0: "equation", 1: "highlight", 2: "blocks", 3: "groupedBlocks" };

/** The tier the rules call for, before applying the no-drop rule. */
export function tierFor(timeSpentSeconds: number, errorCount: number, hesitationSeconds = HESITATION_SECONDS): ScaffoldTier {
  if (errorCount >= 2) return 3;
  if (errorCount === 1) return 2;
  return timeSpentSeconds > hesitationSeconds ? 1 : 0;
}

export class ScaffoldEngine {
  private seconds = 0;
  private errors = 0;
  private peak: ScaffoldTier = 0;
  private readonly hesitation: number;

  constructor(hesitationSeconds = HESITATION_SECONDS) {
    this.hesitation = hesitationSeconds;
  }

  get timeSpentSeconds(): number {
    return this.seconds;
  }

  get errorCount(): number {
    return this.errors;
  }

  get tier(): ScaffoldTier {
    return this.peak;
  }

  get action(): ScaffoldAction {
    return ACTIONS[this.peak];
  }

  /** Adds visible time on task. Negative or non-finite values are ignored. */
  addTime(seconds: number): ScaffoldTier {
    if (Number.isFinite(seconds) && seconds > 0) this.seconds += seconds;
    return this.settle();
  }

  recordError(): ScaffoldTier {
    this.errors += 1;
    return this.settle();
  }

  /** Starts a new problem. */
  reset(): void {
    this.seconds = 0;
    this.errors = 0;
    this.peak = 0;
  }

  snapshot(): { tier: ScaffoldTier; action: ScaffoldAction; timeSpentSeconds: number; errorCount: number } {
    return { tier: this.peak, action: this.action, timeSpentSeconds: Math.round(this.seconds * 10) / 10, errorCount: this.errors };
  }

  private settle(): ScaffoldTier {
    const next = tierFor(this.seconds, this.errors, this.hesitation);
    if (next > this.peak) this.peak = next;
    return this.peak;
  }
}
