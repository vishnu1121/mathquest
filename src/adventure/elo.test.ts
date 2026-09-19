import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { BASELINE_RATING, CATEGORIES, chooseCategory, expectedScore, recordEncounter, startSession, updateRating, type CategoryId } from "./elo";

describe("Elo formulas", () => {
  it("expects an even match at equal ratings and favours the stronger side otherwise", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    expect(expectedScore(1000, 800)).toBeCloseTo(0.7597, 3);
    expect(expectedScore(800, 1000)).toBeCloseTo(0.2403, 3);
  });

  it("moves the rating by K times the surprise", () => {
    expect(updateRating(1000, 1000, true)).toBe(1016);
    expect(updateRating(1000, 1000, false)).toBe(984);
    expect(updateRating(1000, 800, true)).toBe(1008);
    expect(updateRating(1000, 800, false)).toBe(976);
    expect(updateRating(1000, 1350, true)).toBe(1028);
  });

  it("keeps ratings inside the supported range", () => {
    expect(updateRating(1990, 2000, true, 64)).toBe(2000);
    expect(updateRating(410, 400, false, 64)).toBe(400);
  });
});

describe("choosing the next problem", () => {
  it("starts with the category that matches the rating exactly", () => {
    const rng = createRng(7);
    expect(chooseCategory(1000, [], rng).id).toBe("add_carry");
    expect(chooseCategory(700, [], rng).id).toBe("add_small");
    expect(chooseCategory(1100, [], rng).id).toBe("sub_borrow");
    expect(chooseCategory(1340, [], rng).id).toBe("frac_unlike");
    expect(chooseCategory(2000, [], rng).id).toBe("frac_unlike");
    expect(chooseCategory(400, [], rng).id).toBe("add_small");
  });

  it("only interleaves with a nearby category and never serves one three times in a row", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const picked = chooseCategory(1000, ["sub_borrow"], rng).id;
      expect(["add_carry", "sub_no_borrow"]).toContain(picked);
      expect(chooseCategory(1000, ["add_carry", "add_carry"], createRng(seed)).id).not.toBe("add_carry");
    }
  });

  it("rates every category and orders them from easiest to hardest", () => {
    const ratings = CATEGORIES.map((c) => c.rating);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
  });
});

describe("in-memory sessions", () => {
  it("starts at the baseline without any saved history", () => {
    expect(startSession()).toEqual({ version: 1, rating: BASELINE_RATING, start: BASELINE_RATING, history: [] });
  });

  it("restores a valid tab session and ignores malformed caches", () => {
    const saved = { version: 1, rating: 1100, start: 1000, history: [{ category: "add_carry", correct: true, before: 1000, after: 1016 }] };
    expect(startSession(saved)).toEqual(saved);
    expect(startSession({ ...saved, rating: 99999 }).rating).toBe(BASELINE_RATING);
    expect(startSession({ ...saved, version: 2 }).history).toEqual([]);
    expect(startSession("not json").rating).toBe(BASELINE_RATING);
    expect(startSession({ ...saved, history: [{ category: "unlock_all", correct: true, before: 1000, after: 2000 }] }).history).toEqual([]);
  });

  it("updates immediately after every encounter and keeps a bounded history", () => {
    let session = startSession();
    const first = recordEncounter(session, "add_carry", false);
    expect(first.change).toBe(-16);
    expect(first.session.rating).toBe(984);
    session = first.session;
    for (let i = 0; i < 80; i++) session = recordEncounter(session, i % 2 ? "sub_borrow" : "add_carry" as CategoryId, true).session;
    expect(session.history).toHaveLength(50);
    expect(session.rating).toBeGreaterThan(1100);
    expect(session.start).toBe(BASELINE_RATING);
  });
});
