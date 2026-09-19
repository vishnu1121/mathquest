/** In-session Elo rating for the Muddle Monster Arena. There is no history to load: a session starts at a
 * baseline rating, the first answer to each problem updates it once, and the next problem comes from the
 * category whose fixed difficulty rating best matches the player. Pure functions; the runtime keeps the
 * session in sessionStorage, so it ends with the browser tab and never becomes long-term evidence. */
import type { Rng } from "../engine/rng";

export const BASELINE_RATING = 1000;
export const K_FACTOR = 32;
export const MIN_RATING = 400;
export const MAX_RATING = 2000;
const HISTORY_LIMIT = 50;

export const CATEGORIES = [
  { id: "add_small", kind: "add", rating: 700, label: "Adding within 20" },
  { id: "add_no_carry", kind: "add", rating: 800, label: "Addition without carrying" },
  { id: "sub_no_borrow", kind: "sub", rating: 900, label: "Subtraction without borrowing" },
  { id: "add_carry", kind: "add", rating: 1000, label: "Addition with carrying" },
  { id: "sub_borrow", kind: "sub", rating: 1100, label: "Subtraction with borrowing" },
  { id: "frac_like", kind: "frac", rating: 1200, label: "Adding fractions with the same denominator" },
  { id: "frac_unlike", kind: "frac", rating: 1350, label: "Adding fractions with different denominators" },
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryId = Category["id"];

export function categoryById(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[3];
}

/** Probability that a player of this rating answers a problem of this rating correctly. */
export function expectedScore(playerElo: number, problemElo: number): number {
  return 1 / (1 + Math.pow(10, (problemElo - playerElo) / 400));
}

/** Standard Elo update: move by K times the difference between the result and the expectation. */
export function updateRating(playerElo: number, problemElo: number, isCorrect: boolean, k = K_FACTOR): number {
  const next = playerElo + k * ((isCorrect ? 1 : 0) - expectedScore(playerElo, problemElo));
  return Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, next)));
}

/** The best-matched category. After the first problem, sometimes serve the next-closest category for a little
 * interleaving, and never serve the same category three times in a row. */
export function chooseCategory(playerElo: number, recent: readonly CategoryId[], rng: Rng): Category {
  const ranked = [...CATEGORIES].sort((a, b) => Math.abs(a.rating - playerElo) - Math.abs(b.rating - playerElo) || a.rating - b.rating);
  const last = recent[recent.length - 1];
  const repeated = recent.length >= 2 && last === recent[recent.length - 2] ? last : null;
  const options = ranked.filter((c) => c.id !== repeated);
  const best = options[0] ?? ranked[0]!;
  if (!recent.length) return best;
  const second = options[1];
  return second && Math.abs(second.rating - playerElo) <= 150 && rng.next() < 0.25 ? second : best;
}

export interface EloEntry {
  category: CategoryId;
  correct: boolean;
  before: number;
  after: number;
}

export interface EloSession {
  version: 1;
  rating: number;
  start: number;
  history: EloEntry[];
}

const inRange = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= MIN_RATING && n <= MAX_RATING;
const categoryIds = new Set<string>(CATEGORIES.map((c) => c.id));

/** Restores a session cached for this tab, or starts fresh at the baseline. Malformed data is ignored. */
export function startSession(saved?: unknown): EloSession {
  const fresh: EloSession = { version: 1, rating: BASELINE_RATING, start: BASELINE_RATING, history: [] };
  if (!saved || typeof saved !== "object") return fresh;
  const s = saved as Partial<EloSession>;
  if (s.version !== 1 || !inRange(s.rating) || !inRange(s.start) || !Array.isArray(s.history)) return fresh;
  const history = s.history.filter((e): e is EloEntry =>
    Boolean(e) && categoryIds.has(e.category) && typeof e.correct === "boolean" && inRange(e.before) && inRange(e.after));
  return { version: 1, rating: Math.round(s.rating), start: Math.round(s.start), history: history.slice(-HISTORY_LIMIT) };
}

/** Records one game encounter and returns the updated session with the rating change. */
export function recordEncounter(session: EloSession, categoryId: CategoryId, correct: boolean): { session: EloSession; change: number } {
  const before = session.rating;
  const after = updateRating(before, categoryById(categoryId).rating, correct);
  const history = [...session.history, { category: categoryId, correct, before, after }].slice(-HISTORY_LIMIT);
  return { session: { ...session, rating: after, history }, change: after - before };
}
