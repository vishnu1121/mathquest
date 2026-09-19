// Saved progress (per viewer, browser storage) and a tiny event bus shared by every part of the game.
(function () {
  const KEY = "mq.playtest.v3";
  const fresh = () => ({
    coins: 0,
    stars: {},
    badges: {},
    counts: {},
    choice: null,
    owned: [],
    hat: null,
    pet: null,
    chapters: {},
    prologue: false,
    theme: null,
    secret: false,
    unlockAll: false,
    best: {},
    stats: { bigHops: 0, predictedRight: 0, gems: 0, triples: 0, bestCombo: 0, misses: 0, riddleFirstTry: 0, taught: 0, strategies: [], hootAsks: 0, solvedAfterMistake: 0 },
    facts: { frog: [], fireflies: [], guardian: [] },
  });

  function load() {
    const base = fresh();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      return { ...base, ...saved, stats: { ...base.stats, ...(saved.stats || {}) }, facts: { ...base.facts, ...(saved.facts || {}) } };
    } catch {
      return base;
    }
  }

  let state = load();
  const listeners = new Map();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage can be blocked; the game still works for this visit.
    }
  };

  window.MQS = {
    get: () => state,
    /** The child's chosen hero; every character option is unisex. */
    hero: () => state.hero || "🧙",
    update(fn) {
      fn(state);
      save();
    },
    reset() {
      state = fresh();
      save();
    },
    /** Remember something the child did in a chapter, for the story director and the journey note. */
    addFact(chapter, text) {
      const list = state.facts[chapter] || (state.facts[chapter] = []);
      if (list.includes(text)) return;
      list.push(text);
      if (list.length > 6) list.shift();
      save();
    },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
    },
    emit(event, data = {}) {
      for (const fn of listeners.get(event) || []) {
        try {
          fn(data);
        } catch (e) {
          console.error(e);
        }
      }
      for (const fn of listeners.get("*") || []) {
        try {
          fn(event, data);
        } catch (e) {
          console.error(e);
        }
      }
    },
  };
})();
