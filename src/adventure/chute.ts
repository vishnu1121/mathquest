// Number Chute: the rules behind the two upper-class bonus games. Pure and seeded; runtime/mini-chute.js
// only draws the chute, moves the catcher and asks these functions. Bonus play never counts as mastery.
import type { Rng } from "../engine/rng";

export type ChuteMode = "sort" | "exact";
export type ChuteGrade = "3" | "4" | "5";

export interface Drop { id: number; lane: number; label: string; value: number; good: boolean }
export interface Wave { n: number; rule: string; hint: string; quota: number; fallMs: number; gapMs: number; target: number; drops: Drop[] }

export const LANES = 4;
export const WAVES = 4;
export const LIVES = 3;
export const CATCH_POINTS = 40;
export const WAVE_POINTS = 250;
export const EXACT_POINTS = 400;
export const MEDALS = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;
/** Five clean catches in a row doubles the value of the next one, to a ceiling of four. */
export const comboMultiplier = (chain: number) => Math.min(4, 1 + Math.floor(chain / 5));
/** Each wave falls faster and leaves less room to think. */
const fallMs = (grade: ChuteGrade, n: number) => Math.round((grade === "3" ? 4200 : grade === "4" ? 3900 : 3600) * Math.pow(0.88, n));
const gapMs = (grade: ChuteGrade, n: number) => Math.round((grade === "3" ? 1350 : 1250) * Math.pow(0.9, n));

const isPrime = (v: number) => { if (v < 2) return false; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true; };
const round1 = (v: number) => Math.round(v * 10) / 10;
const shuffle = <T,>(items: T[], rng: Rng) => { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = rng.int(0, i);[out[i], out[j]] = [out[j]!, out[i]!]; } return out; };

// ---------- Sort mode: catch what fits the rule, let the rest fall ----------
interface Rule { rule: string; hint: string; good: number[]; bad: number[] }
function makeRule(grade: ChuteGrade, rng: Rng): Rule {
  const kinds = grade === "3" ? ["multiple", "factor"] : grade === "4" ? ["multiple", "factor", "prime"] : ["multiple", "factor", "tenth"];
  const kind = kinds[rng.int(0, kinds.length - 1)]!;
  const upto = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  if (kind === "multiple") {
    const step = grade === "3" ? rng.int(3, 6) : grade === "4" ? rng.int(6, 9) : rng.int(7, 12);
    const top = step * 12;
    const all = upto(top).filter((v) => v > 1);
    return { rule: `Catch the multiples of ${step}`, hint: `A multiple of ${step} is what you land on when you count in ${step}s.`, good: all.filter((v) => v % step === 0), bad: all.filter((v) => v % step !== 0 && Math.abs(v % step) <= 2) };
  }
  if (kind === "factor") {
    const whole = grade === "3" ? rng.pick([12, 18, 24, 36]) : grade === "4" ? rng.pick([36, 48, 60, 72]) : rng.pick([48, 72, 90, 120]);
    const all = upto(Math.min(whole, 40)).filter((v) => v > 1);
    return { rule: `Catch the factors of ${whole}`, hint: `A factor divides ${whole} with nothing left over.`, good: all.filter((v) => whole % v === 0), bad: all.filter((v) => whole % v !== 0) };
  }
  if (kind === "prime") {
    const all = upto(60).filter((v) => v > 1);
    return { rule: "Catch the prime numbers", hint: "A prime has exactly two factors: one and itself.", good: all.filter(isPrime), bad: all.filter((v) => !isPrime(v)) };
  }
  const line = round1(rng.int(15, 45) / 10);
  const pool = Array.from({ length: 60 }, (_, i) => round1((i + 5) / 10));
  return { rule: `Catch the numbers greater than ${line}`, hint: `Compare the whole part first, then the tenths. ${line} itself is not greater than ${line}.`, good: pool.filter((v) => v > line), bad: pool.filter((v) => v <= line) };
}

// ---------- Exact mode: fill the order without going over ----------
// Every target is a whole number of steps of the smallest value on offer, so an exact fill always exists
// however the run has gone: 1s at Grade 3, 5s at Grade 4, halves at Grade 5.
export const exactStep = (grade: ChuteGrade) => (grade === "3" ? 1 : grade === "4" ? 5 : 0.5);
const exactTarget = (grade: ChuteGrade, n: number, rng: Rng) =>
  grade === "3" ? rng.int(4, 7) * 5 + n * 5 : grade === "4" ? rng.int(10, 18) * 10 + n * 10 : round1((rng.int(12, 24) + n) / 2);
const exactValues = (grade: ChuteGrade) =>
  grade === "3" ? Array.from({ length: 12 }, (_, i) => i + 1)
    : grade === "4" ? Array.from({ length: 16 }, (_, i) => (i + 1) * 5)
      : Array.from({ length: 12 }, (_, i) => round1((i + 1) / 2));

/**
 * One wave, planned up front so a run is reproducible from its seed. In sort mode `good` says whether a
 * drop belongs in the basket; in exact mode it is meaningless, because that depends on what is in the
 * basket already — the runtime asks `judge` instead.
 */
export function planWave(mode: ChuteMode, grade: ChuteGrade, index: number, rng: Rng): Wave {
  const quota = mode === "sort" ? 5 + index : 0;
  const base = { n: index, quota, fallMs: fallMs(grade, index), gapMs: gapMs(grade, index) };
  if (mode === "exact") {
    const target = exactTarget(grade, index, rng), values = exactValues(grade), step = exactStep(grade);
    // Every fourth crystal is the smallest value, so a child who is one step short always gets a chance.
    const drops: Drop[] = Array.from({ length: 20 + index * 4 }, (_, id) => {
      const value = id % 4 === 3 ? step : values[rng.int(0, values.length - 1)]!;
      return { id, lane: rng.int(0, LANES - 1), label: String(value), value, good: value <= target };
    });
    return { ...base, target, rule: `Fill the order: exactly ${target}`, hint: `Add what you catch. Going over spills the load, so leave the big ones when you are close.`, drops };
  }
  const r = makeRule(grade, rng), count = quota * 2 + 4;
  const picks = shuffle(Array.from({ length: count }, (_, i) => {
    const fromGood = i < quota + 1 || rng.int(0, 2) > 0;
    const pool = fromGood && r.good.length ? r.good : r.bad.length ? r.bad : r.good;
    const value = pool[rng.int(0, pool.length - 1)]!;
    return { value, good: r.good.includes(value) };
  }), rng);
  // Two drops never share a lane back to back, so the catcher always has somewhere to be.
  let last = -1;
  const drops: Drop[] = picks.map((p, id) => {
    let lane = rng.int(0, LANES - 1);
    if (lane === last) lane = (lane + 1) % LANES;
    last = lane;
    return { id, lane, label: String(p.value), value: p.value, good: p.good };
  });
  return { ...base, target: 0, rule: r.rule, hint: r.hint, drops };
}

/** In exact mode: what catching this value would do to the load. */
export function judge(total: number, value: number, target: number): "exact" | "take" | "over" {
  const next = round1(total + value);
  if (next === target) return "exact";
  return next > target ? "over" : "take";
}
export const remaining = (total: number, target: number) => round1(target - total);

/** The best a perfect run could score, used to set the medals and the rival. */
export function basePossible(mode: ChuteMode, waves: Wave[]): number {
  return waves.reduce((sum, w) => sum + (mode === "sort" ? w.quota * CATCH_POINTS * 2 + WAVE_POINTS : EXACT_POINTS + WAVE_POINTS), 0);
}
export function medalFor(score: number, base: number): keyof typeof MEDALS | null {
  if (base <= 0) return null;
  if (score >= base) return "gold";
  if (score >= base * 0.6) return "silver";
  return score > 0 ? "bronze" : null;
}
export const rivalScore = (base: number) => Math.round((base * 0.7) / 10) * 10;

/** The saved record for one chute game: the best score and the best medal, nothing about the child. */
export interface ChuteRecord { best: number; medal: keyof typeof MEDALS | null }
export function restoreChute(raw: unknown): ChuteRecord {
  const r = raw as Partial<ChuteRecord> | undefined;
  const best = Number.isFinite(r?.best) ? Math.max(0, Math.min(999999, Math.floor(r!.best as number))) : 0;
  const medal = r?.medal === "gold" || r?.medal === "silver" || r?.medal === "bronze" ? r.medal : null;
  return { best, medal };
}
export function recordRun(record: ChuteRecord, score: number, medal: keyof typeof MEDALS | null): { record: ChuteRecord; newBest: boolean } {
  const order = { bronze: 1, silver: 2, gold: 3 } as const;
  const newBest = score > record.best;
  const keep = !record.medal || (medal && order[medal] > order[record.medal]) ? medal ?? record.medal : record.medal;
  return { record: { best: Math.max(record.best, score), medal: keep }, newBest };
}
