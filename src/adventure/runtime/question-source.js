// Where a question comes from: a model when one is configured and answers in time, the built-in bank
// otherwise. The whole point of this file is that the child never finds out which.
//
// Nothing here is ever awaited by the screen. The rule is that the built-in question for a round is always
// in hand before that round starts, so "the AI failed" and "the AI was slow" and "there is no key" all have
// the same effect: the question the code wrote is drawn, immediately, exactly as it always did.
//
// The way that is paid for is prefetching. While a child works on question 2, question 3 is being written.
// Question 1 is always the built-in one — there is nobody to wait behind, and making a child watch a
// spinner before their first question to save a model call would be the wrong trade. Its numbers are
// already fresh on every play, because the chapter seed is new each time.
import { specFromTask } from "../../ai/adventure/generate";
import { checkTask, correctResponse, validateTask } from "../classes/tasks";

(function () {
  const available = () => Boolean(window.MQAI && window.MQAI.generateStatus() === "on");

  // Questions already asked this visit. Held in memory, not in the save: it is a per-session list, and an
  // ever-growing array in localStorage is how a save rots. Newest last.
  const asked = [];
  const askedSet = new Set();
  function remember(fingerprint) {
    if (!fingerprint || askedSet.has(fingerprint)) return false;
    askedSet.add(fingerprint);
    asked.push(fingerprint);
    if (asked.length > 60) askedSet.delete(asked.shift());
    return true;
  }

  /**
   * One level's supply of questions.
   *
   * `built(round)` must be deterministic — it is called both to draw the question and to describe it to the
   * model, and the two have to be the same question. Every generator in this game already is.
   */
  function create(cfg) {
    const ready = new Map();
    const pending = new Set();
    const rounds = cfg.rounds || 5;
    let live = true;
    const stop = () => { live = false; };
    if (cfg.signal) {
      if (cfg.signal.aborted) live = false;
      else cfg.signal.addEventListener("abort", stop, { once: true });
    }

    const builtFor = (round) => {
      try {
        return cfg.built(round);
      } catch {
        return null; // a generator that throws is the bank's problem, not the child's
      }
    };

    /** Start writing the question for this round. Safe to call as often as you like. */
    function prime(round) {
      if (!live || round < 0 || round >= rounds) return;
      if (ready.has(round) || pending.has(round) || !available()) return;
      const builtIn = builtFor(round);
      if (!builtIn) return;
      const spec = specFromTask(builtIn, {
        grade: cfg.grade,
        skillName: cfg.skillName ? cfg.skillName(builtIn) : "",
        topic: cfg.topic || "",
        quest: cfg.quest || "",
        apex: Boolean(cfg.apex),
        stretch: Boolean(cfg.stretch && cfg.stretch(round)),
        avoid: asked.slice(-6),
        seed: ((cfg.seed || 0) + round * 7919) >>> 0,
      });
      // No spec means this board is not one words can replace — a ten frame, a clock, a shape. It plays
      // exactly as written, which is the right answer for those questions anyway.
      if (!spec) return;
      pending.add(round);
      Promise.resolve(window.MQAI.generate(spec, cfg.signal))
        .then((reply) => {
          pending.delete(round);
          if (!live || !reply || !reply.task) return;
          // The server already re-solved this question. Checking it again here costs nothing and means a
          // reply mangled in transit cannot reach a board.
          if (reply.task.skill !== spec.skill) return;
          if (validateTask(reply.task).length) return;
          // And it must actually be winnable: correctResponse(task) has to pass checkTask. A generated
          // board that cannot be solved by its own correct response is one a child could never finish.
          try {
            if (!checkTask(reply.task, correctResponse(reply.task))) return;
          } catch { return; }
          if (!remember(reply.fingerprint)) return; // already asked this visit
          ready.set(round, reply.task);
        })
        .catch(() => pending.delete(round));
    }

    return {
      prime,
      /**
       * The question to draw for this round, right now, with no waiting. Also starts the next one.
       * `byAI` is for the grown-ups panel and the tests; nothing a child sees depends on it.
       */
      take(round) {
        const fresh = ready.get(round);
        ready.delete(round);
        prime(round + 1);
        // Only a question actually written for the look-ahead counts as one. If the writers came up
        // short, the bank's question is an ordinary question of this child's own grade.
        if (fresh) return { task: fresh, byAI: true, stretch: Boolean(cfg.stretch && cfg.stretch(round)) };
        return { task: builtFor(round), byAI: false, stretch: false };
      },
      /** True while a question is still being written, for tests and the dashboard. Never blocks anything. */
      busy: () => pending.size > 0,
      release: stop,
    };
  }

  window.MQQuestions = { available, create, asked: () => [...asked] };
})();
