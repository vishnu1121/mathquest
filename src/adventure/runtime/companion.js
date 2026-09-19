// Hoot, the companion who stays beside the child in every level. A bar below the play area holds Hoot's
// words, and code watches what the child is doing (pauses, misses, streaks, and what each level reports about
// its current state) so Hoot speaks at the right moment. Unprompted lines are built-in questions that never
// give an answer, so they do not count as help. "Help me think" (or tapping the owl) uses the level's own hint,
// with AI rewording when connected, and that does count as help in the learning record.
//
// Levels talk to Hoot through api.companion:
//   watch(fn)   fn() returns { sees, nudge } from the level's state: what Hoot notices, and a question for a pause
//   say(text, { moment, byAI, title })   speak now
//   quiet()     the level runs its own nudges and reactions (the Muddle Monster Arena)
(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.MQS;
  const TITLES = {
    start: "HOOT · RIGHT HERE WITH YOU",
    hesitate: "HOOT NOTICED YOU THINKING",
    draft: "HOOT IS READING YOUR ANSWER",
    mistake: "HOOT · LET’S LOOK AGAIN",
    boss: "HOOT · YOUR NEXT MOVE",
    ask: "HOOT · YOU ASKED FOR HELP",
    solved: "HOOT CHEERS",
    streak: "HOOT CHEERS",
    note: "HOOT SAYS",
  };
  // Seconds of stillness before each unprompted nudge; a success starts the count again.
  const WAITS = [8, 16, 24];
  const CHEERS = ["You got it! That thinking worked.", "Nice! You kept going until it clicked.", "Hoo-ray! What will you try next?"];
  const TRY_AGAIN = ["Not yet, and that’s okay. What did that try show you?", "Good try! What could you change this time?"];
  const GENERIC_NUDGE = "What is one thing you could try next?";
  let visit = null, ticker = 0, lastTick = 0, version = 0, bound = false;

  const paused = () => document.hidden || !$("result").hidden || Boolean(document.querySelector("dialog[open], .mini, .story"));

  function bind() {
    if (bound) return;
    bound = true;
    const screen = $("levelScreen"), bar = $("companion");
    const active = () => { if (visit) visit.still = 0; };
    for (const type of ["pointerdown", "keydown", "input", "wheel"]) screen.addEventListener(type, active, { capture: true, passive: true });
    $("companionHelp").addEventListener("click", () => { if (visit && visit.alive()) visit.ask(); });
    // The play area leaves room for the bar. If Hoot's words need more lines, the room grows for this visit only.
    new ResizeObserver(() => {
      if (!visit || screen.hidden) return;
      const height = Math.ceil(bar.getBoundingClientRect().height);
      if (height > visit.room) {
        visit.room = height;
        screen.style.setProperty("--companion-h", `${height}px`);
      }
    }).observe(bar);
  }

  /** Asks the level what the child is working on and shows it. */
  function refresh() {
    if (!visit) return null;
    let seen = null;
    if (visit.watch) {
      try { seen = visit.watch() || null; } catch (error) { console.error(error); }
    }
    const text = seen && seen.sees ? `Hoot sees: ${seen.sees}` : "";
    const el = $("companionSees");
    if (el.textContent !== text) { el.textContent = text; el.title = text; }
    return seen;
  }

  function show(text, { moment = "note", byAI = false, title } = {}) {
    if (!visit || !text) return;
    version += 1;
    const bar = $("companion");
    bar.dataset.moment = moment;
    bar.dataset.source = byAI ? "ai" : "built-in";
    $("companionTitle").textContent = `${title || TITLES[moment] || TITLES.note}${byAI ? " · AI COMPANION" : ""}`;
    $("companionText").textContent = String(text);
    bar.classList.remove("fresh");
    void bar.offsetWidth;
    bar.classList.add("fresh");
    refresh();
  }

  function tick() {
    const now = performance.now(), dt = Math.min((now - lastTick) / 1000, 1);
    lastTick = now;
    if (!visit || !visit.alive() || paused()) return;
    refresh();
    visit.still += dt;
    if (visit.quiet || visit.nudges >= WAITS.length || visit.still <= WAITS[visit.nudges]) return;
    visit.nudges += 1;
    visit.still = 0;
    const seen = refresh();
    show(seen && seen.nudge ? seen.nudge : GENERIC_NUDGE, { moment: "hesitate" });
  }

  S.on("solved", () => {
    if (!visit || visit.quiet || !visit.alive()) return;
    visit.streak += 1;
    visit.misses = 0;
    visit.nudges = 0;
    visit.still = 0;
    if (visit.streak % 3 === 0) show(`${visit.streak} in a row! Your thinking is on fire.`, { moment: "streak" });
    else show(CHEERS[(visit.streak - 1) % CHEERS.length], { moment: "solved" });
  });
  S.on("miss", () => {
    if (!visit || visit.quiet || !visit.alive()) return;
    visit.streak = 0;
    visit.misses += 1;
    visit.still = 0;
    show(visit.misses >= 2 ? "This one is tricky. Tap “Help me think” and we’ll look at it together." : TRY_AGAIN[visit.misses % TRY_AGAIN.length], { moment: "mistake" });
  });

  window.MQCompanion = {
    /** Starts Hoot for one level visit. alive() is false once the child leaves; ask() is the level's help. */
    attach({ alive, ask, level, markHelp, hint }) {
      bind();
      clearInterval(ticker);
      const screen = $("levelScreen");
      screen.style.removeProperty("--companion-h");
      const room = parseFloat(getComputedStyle(screen).getPropertyValue("--companion-h")) || 0;
      const mine = { alive, ask, level, markHelp, hint, watch: null, quiet: false, spoke: false, still: 0, nudges: 0, misses: 0, streak: 0, room };
      visit = mine;
      $("companionSees").textContent = "";
      show("I’m right here with you. Take your time, and tap “Help me think” whenever you want.", { moment: "start" });
      lastTick = performance.now();
      ticker = setInterval(tick, 500);
      const live = () => visit === mine && alive();
      return {
        say(text, options) { if (!live()) return; mine.spoke = true; show(text, options); },
        watch(fn) { if (!live()) return; mine.watch = fn; refresh(); },
        refresh() { if (live()) refresh(); },
        quiet(on = true) { if (live()) mine.quiet = on; },
      };
    },
    /** After the level has mounted: open with a question about the actual task, unless the level already spoke. */
    ready() {
      if (!visit || visit.quiet || visit.spoke) return;
      const seen = refresh();
      if (seen && seen.nudge) show(`I’m right here with you. ${seen.nudge}`, { moment: "start" });
    },
    detach() {
      visit = null;
      clearInterval(ticker);
    },
    say(text, options) {
      if (!visit) return;
      visit.spoke = true;
      show(text, options);
    },
    /** A level noticed repeated trouble: Hoot offers to think together, without giving a hint unasked. */
    offer() {
      if (visit && !visit.quiet) show("Want to think it through together? Tap “Help me think”.", { moment: "mistake" });
    },
    version: () => version,
    snapshot() {
      if (!visit || !visit.alive()) return null;
      const seen = refresh() || {}, hint = visit.hint?.();
        const goal = seen.goal || hint?.facts?.goal || seen.sees || "Explore the game";
        return { ...seen, activity: visit.level?.name || "Adventure", key: seen.key || `${visit.level?.id}:${goal}`, goal, moves: seen.moves || hint?.facts?.moves || [], onHelp: () => { visit?.markHelp?.(); seen.onHelp?.(); } };
    },
  };
})();
