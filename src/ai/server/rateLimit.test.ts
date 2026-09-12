import { describe, expect, it } from "vitest";
import { RATE_LIMIT, takeToken } from "./rateLimit";

describe("takeToken", () => {
  it("allows a burst up to capacity, then refuses", () => {
    const store = new Map();
    for (let i = 0; i < RATE_LIMIT.capacity; i++) expect(takeToken("a", 0, store)).toBe(true);
    expect(takeToken("a", 0, store)).toBe(false);
  });

  it("refills over time and keeps clients separate", () => {
    const store = new Map();
    for (let i = 0; i < RATE_LIMIT.capacity; i++) takeToken("a", 0, store);
    expect(takeToken("b", 0, store)).toBe(true);
    expect(takeToken("a", 1_000, store)).toBe(false);
    expect(takeToken("a", 3_000, store)).toBe(true);
  });
});
