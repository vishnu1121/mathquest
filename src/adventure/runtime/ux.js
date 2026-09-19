// UX layer on top of the game shell (design skills: game-ui-design, peak-end-rule, interfaces-that-feel,
// motion-system, journey-map): a title moment before anything else, calm mode, one clear "Play" action on
// the map, the world maker tucked into a drawer, a paper-cut landscape, warm exits, recovery cheers, and an
// ending certificate so the child's last moment is their accomplishment.
(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.MQS;
  const AI = window.MQAI;
  const MQ = window.MQ;

  // ---------- Moment toasts (bottom lane, never blocks taps) ----------
  const momentEl = document.createElement("div");
  momentEl.className = "moment-toast";
  momentEl.setAttribute("role", "status");
  document.body.appendChild(momentEl);
  let momentTimer = 0;
  function toast(emoji, text) {
    momentEl.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
    momentEl.append(text);
    momentEl.classList.add("show");
    clearTimeout(momentTimer);
    momentTimer = setTimeout(() => momentEl.classList.remove("show"), 2800);
  }

  // ---------- Calm mode ----------
  function applyCalm() {
    const on = Boolean(S.get().calm);
    document.documentElement.toggleAttribute("data-calm", on);
    const btn = $("calmBtn");
    if (btn) btn.setAttribute("aria-pressed", String(on));
  }
  function addCalmButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "calmBtn";
    btn.className = "hud-pill hud-icon hud-calm";
    btn.textContent = "🍃";
    btn.setAttribute("aria-label", "Calm mode: less motion and no music");
    btn.setAttribute("aria-pressed", "false");
    $("muteBtn").before(btn);
    btn.addEventListener("click", () => {
      S.update((s) => (s.calm = !s.calm));
      applyCalm();
      MQ.fx.sfx.tap();
      toast("🍃", S.get().calm ? "Calm mode is on: less motion and no music." : "Calm mode is off.");
    });
    applyCalm();
  }

  // ---------- Paper-cut landscape and the big Play button ----------
  let cta = null;
  function updateCta() {
    if (!cta) return;
    const s = S.get();
    const levels = MQ.levels.filter((level) => !level.pathway);
    const i = levels.findIndex((l, k) => MQ.isOpen(k) && !s.chapters[l.id]);
    const allDone = i === -1;
    const level = allDone ? levels[levels.length - 1] : levels[i];
    const n = levels.indexOf(level) + 1;
    const done = levels.filter((l) => s.chapters[l.id]).length;
    const lessons = ["Count on. Take a leap. Help a friend home.", "Find number pairs. Make the glade glow.", "Build a number spell. Wake a gentle giant."];
    const best = Number((s.best || {})[level.id]) || 0;
    cta.innerHTML = `<div class="quest-preview"><span class="eyebrow">${allDone ? "YOU ARE A LANTERN KEEPER" : "YOUR NEXT DISCOVERY"}</span>
      <div class="quest-preview-icon" aria-hidden="true">${MQ.iconOf(level)}</div>
      <p class="chapter-tag">CHAPTER ${String(n).padStart(2, "0")}</p><h2>${MQ.titleOf(level)}</h2>${best ? `<p class="quest-best"><span aria-hidden="true">🏆</span> Best score ${window.MQArcade.format(best)}</p>` : ""}<p class="quest-preview-copy">${lessons[n - 1]}</p>
      <button type="button" class="btn" id="ctaPlay">${allDone ? "Play again" : done ? "Keep exploring" : "Let’s hop!"}<span aria-hidden="true">→</span></button>
      <p class="quest-reassurance">Take your time. Hoot is here to help.</p></div>
      <div class="lantern-progress"><div><span aria-hidden="true">✦</span><b>The Great Lantern</b><span>${done} / 3</span></div><div class="lantern-progress-track" role="progressbar" aria-label="Chapters restored" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="3">${levels.map((l) => `<i class="${s.chapters[l.id] ? "lit" : ""}"></i>`).join("")}</div><p>${allDone ? "A whole world brighter, thanks to you." : "Every chapter brings a little light back."}</p></div>
      <button type="button" class="journal-link" id="journalBtn"><span aria-hidden="true">▤</span> My discovery journal <span aria-hidden="true">↗</span></button>`;
    cta.querySelector("#ctaPlay").addEventListener("click", () => MQ.openLevel(level));
    cta.querySelector("#journalBtn").addEventListener("click", openJournal);
    const heading = $("journeyHeading");
    if (heading) heading.textContent = allDone ? "Look at the world you lit up." : done ? "Your story is getting brighter." : "A little math. A lot of magic.";
  }
  function openJournal() {
    const opener = document.activeElement;
    const s = S.get();
    const entries = [
      ["↗", "Thinking in tens", s.stats.bigHops > 0, `You took ${s.stats.bigHops} big hops of ten.`, "Try a big hop in the river."],
      ["✦", "Number connections", Boolean(s.chapters.fireflies), "You connected numbers to make ten.", "Find pairs in the firefly glade."],
      ["♡", "Helping someone learn", s.stats.taught > 0, `You helped Pip rethink ${s.stats.taught} ${s.stats.taught === 1 ? "idea" : "ideas"}.`, "Listen to Pip and share your thinking."],
      ["↻", "Trying a new way", s.stats.solvedAfterMistake > 0, "You tried again and found a way through.", "Mistakes are a chance to try another way."],
    ];
    const el = document.createElement("div");
    el.className = "journal-overlay";
    el.innerHTML = `<section class="journal-card" role="dialog" aria-modal="true" aria-labelledby="journalTitle"><p class="eyebrow">SMALL STEPS WORTH KEEPING</p><h2 id="journalTitle">My discovery journal</h2><p>Here’s what you’ve been exploring. There’s always more to discover.</p><ul>${entries.map(([icon, name, explored, note, next]) => `<li data-explored="${explored}"><span class="journal-symbol" aria-hidden="true">${icon}</span><div><h3>${name}</h3><p>${explored ? note : next}</p><span class="journal-status">${explored ? "✓ Explored" : "Waiting to be discovered"}</span></div></li>`).join("")}</ul><button type="button" class="btn">Back to exploring →</button></section>`;
    const learning = document.createElement("details");
    learning.className = "learning-note";
    learning.innerHTML = `<summary>For grown-ups <span aria-hidden="true">↗</span></summary><p>A practice snapshot, saved on this device. Each skill shows its last eight answer attempts. Using a hint or trying again is part of learning; we keep those separate from independent answers.</p><div class="learning-skills">${window.MQLearning.summary().map((skill) => `<section><div><h3>${skill.name}</h3><span>${skill.status}</span></div><p>${skill.evidence ? `${skill.independent} first-try answers without hints · ${skill.supported} correct with help or a retry · ${skill.recent} attempts shown` : "No answers recorded yet."}</p>${skill.evidence ? `<p class="learning-next"><b>Next:</b> ${skill.next}.</p>` : ""}</section>`).join("")}</div><p>These observations guide practice. Completing a chapter celebrates exploration; it does not certify mastery.</p>`;
    el.querySelector(".journal-card > button").before(learning);
    document.body.appendChild(el);
    el.querySelector("button").onclick = () => { el.remove(); requestAnimationFrame(() => opener?.isConnected && opener.focus()); };
    el.querySelector("button").focus();
  }
  function setupMap() {
    const board = $("mapBoard");
    cta = document.createElement("div");
    cta.className = "map-cta";
    const journey = document.createElement("section");
    journey.className = "journey-layout";
    journey.setAttribute("aria-labelledby", "journeyHeading");
    const canvas = document.createElement("div");
    canvas.className = "journey-canvas";
    canvas.innerHTML = '<div class="journey-caption"><div><span class="eyebrow">THE LANTERN OF NUMBERS</span><h2 id="journeyHeading">A little math. A lot of magic.</h2></div><span class="map-compass" aria-hidden="true">✧</span></div>';
    board.before(journey);
    canvas.appendChild(board);
    journey.append(canvas, cta);
    new MutationObserver(() => {
      const world = board.querySelector(".map-world");
      if (world && !world.querySelector(".valley-art")) world.insertAdjacentHTML("afterbegin", window.MQArt.landscape("map", AI.theme().palette));
      updateCta();
    }).observe(board, { childList: true });
  }

  // ---------- Warm exits and recovery cheers ----------
  function setupMoments() {
    $("homeBtn").addEventListener(
      "click",
      () => {
        if (!$("levelScreen").hidden && $("result").hidden) setTimeout(() => toast("🦉", "Your coins and badges are saved. See you soon!"), 450);
      },
      true,
    );
    S.on("solved", (d) => {
      if (d.afterMistake && !$("levelScreen").hidden) toast("💪", "You fixed it! Mistakes help your brain grow.");
    });
  }

  // ---------- The way in: a name, and then the adventure ----------
  //
  // One question, asked once. The old splash page sold the game to somebody who had already opened it;
  // this asks the only thing the game actually needs from a child before it can start talking to them.
  //
  // The name never leaves the device. It is written to browser storage with everything else, it is
  // drawn on the island under the hero, and it is not part of any request this game makes — every AI
  // request in runtime/core-ai.js is built field by field from game state, never from the save.
  // Skipping is a real option and costs nothing: the hero is simply labelled YOU, as before.
  const NAME_MAX = 14;
  /** Letters, marks, spaces, hyphens and apostrophes. Anything else is simply not carried through. */
  const cleanName = (raw) => String(raw || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{Zs}'’-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);

  function titleScreen(onPlay) {
    const s = S.get();
    const returning = Boolean(s.prologue);
    const el = document.createElement("div");
    el.className = "title-screen ts-welcome";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "tsTitle");
    el.innerHTML = `
      <div class="ts-nav"><span class="mq-brand"><span class="brand-mark" aria-hidden="true">✦</span>mathquest<span class="brand-dot">.</span></span></div>
      <form class="ts-card" novalidate>
        <h2 id="tsTitle">${returning ? "Welcome back." : "What should we call you?"}</h2>
        <p class="ts-card-note" id="tsNameNote">Hoot writes it on your map, next to your hero. It stays on this device.</p>
        <label class="ts-field" for="tsName"><span>Your name</span>
          <input id="tsName" name="name" type="text" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" enterkeyhint="go" aria-describedby="tsNameNote" placeholder="Type your name" value="${window.MQClassArt.esc(s.name || "")}">
        </label>
        <button type="submit" class="btn ts-play">${returning ? "Continue the adventure" : "Start the adventure"}<span aria-hidden="true">→</span></button>
        <button type="button" class="ts-skip">Skip for now</button>
      </form>`;
    document.body.appendChild(el);
    const input = el.querySelector("#tsName");
    const form = el.querySelector("form");
    input.focus();

    const leave = () => {
      MQ.fx.sfx.win();
      const c = MQ.fx.center(el.querySelector(".ts-play"));
      MQ.fx.burst(c.x, c.y, { count: 18, chars: ["✨", "🏮", "⭐"], spread: 180 });
      el.classList.add("leaving");
      setTimeout(() => { el.remove(); onPlay(); }, 380);
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = cleanName(input.value);
      S.update((state) => { if (name) state.name = name; else delete state.name; });
      leave();
    });
    el.querySelector(".ts-skip").addEventListener("click", leave);
  }

  // ---------- Ending certificate ----------
  function certificate(noteFn) {
    return new Promise((resolve) => {
      const s = S.get();
      const t = AI.theme();
      const stars = ["frog", "fireflies", "guardian"].reduce((sum, id) => sum + (s.stars[id] || 0), 0);
      const el = document.createElement("div");
      el.className = "certificate";
      el.innerHTML = `
        <div class="cert-card" role="dialog" aria-modal="true" aria-labelledby="certTitle">
          <span class="cert-ribbon">Lantern Keeper</span>
          <span class="cert-hero" aria-hidden="true">${S.hero()}${s.hat ? `<i>${s.hat}</i>` : ""}${s.pet ? `<b>${s.pet}</b>` : ""}</span>
          <h2 id="certTitle">You relit the Great Lantern!</h2>
          <p class="cert-line">You hopped by tens, found ways to make 10, woke the ${t.guardianName} and taught Pip along the way. ${t.world} shines again.</p>
          <p class="cert-line">A little parcel just arrived from beyond the mist. Someone in the Skybound Isles needs a friend. Your next chapter is waiting on the island.</p>
          <div class="cert-seals">
            <span class="cert-seal"><span aria-hidden="true">⭐</span>${stars} of 9 stars</span>
            <span class="cert-seal"><span aria-hidden="true">🏅</span>${window.MQBadges.count()} of ${window.MQBadges.total} badges</span>
            <span class="cert-seal"><span aria-hidden="true">🧚</span>Taught Pip ${s.stats.taught} ${s.stats.taught === 1 ? "time" : "times"}</span>
          </div>
          <div class="cert-actions">
            <button type="button" class="btn" data-act="party">Celebrate again 🎉</button>
            <button type="button" class="btn secondary" data-act="grownups">For grown-ups</button>
            <button type="button" class="btn secondary" data-act="map">Back to the map</button>
          </div>
          <div class="cert-note" aria-live="polite" hidden></div>
        </div>`;
      document.body.appendChild(el);
      const party = () => {
        MQ.fx.sfx.win();
        for (let i = 0; i < 3; i++) {
          setTimeout(() => MQ.fx.burst(window.innerWidth * (0.25 + 0.25 * i), window.innerHeight * 0.3, { count: 24, chars: ["🎉", "⭐", "✨", t.glow], spread: 240 }), i * 250);
        }
      };
      party();
      el.querySelector('[data-act="party"]').addEventListener("click", party);
      el.querySelector('[data-act="grownups"]').addEventListener("click", async (e) => {
        const note = el.querySelector(".cert-note");
        e.currentTarget.disabled = true;
        note.hidden = false;
        note.textContent = "Hoot is writing a note for you…";
        const raw = await Promise.resolve(noteFn());
        const result = typeof raw === "string" ? { text: raw, byAI: false } : raw;
        note.innerHTML = result.byAI ? '<span class="by-ai">✨ Written by AI from what your child did</span>' : "";
        note.append(result.text);
      });
      el.querySelector('[data-act="map"]').addEventListener("click", () => {
        el.remove();
        resolve();
      });
      el.querySelector('[data-act="party"]').focus();
    });
  }

  // ---------- Start: the title moment comes before the prologue ----------
  const originalStart = MQ.start;
  MQ.start = function start() {
    const seenPrologue = Boolean(S.get().prologue);
    addCalmButton();
    setupMap();
    setupMoments();
    S.update((s) => (s.prologue = true)); // hold the prologue until the child presses Play
    originalStart();
    S.update((s) => (s.prologue = seenPrologue));
    titleScreen(() => {
      if (!seenPrologue) window.MQStory.prologue();
    });
  };

  window.MQUX = { certificate, toast, openJournal, cleanName };
})();
