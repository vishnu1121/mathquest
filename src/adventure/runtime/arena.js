// Muddle Monster Arena: the AI-driven practice mode. On every problem four systems work together:
// an in-session Elo rating picks the category, a scaffolding state machine raises visual help after hesitation
// or errors, a diagnosis (instant rules, then optional AI) names the misconception behind a wrong answer and
// summons its boss, and Hoot (the companion bar shared by every level) reads what the child is doing right now
// (pausing, typing, a mix-up, the next boss move) and asks one Socratic question that fits that moment.
// Code checks every answer, boss move, piece of evidence and bit of progress; AI text is validated before use.
import { ARENA_NAMES, restoreClassArena } from "../classes/arena";
import { chooseCategory, expectedScore, recordEncounter, startSession } from "../elo";
import { HESITATION_SECONDS, ScaffoldEngine } from "../scaffold";
import {
  AI_MOMENTS, BOSSES, MISCONCEPTIONS, answerText, bundleStart, bundleTen, classifyAnswer, companionLine, correctText, diagnosis, draftNote,
  generateProblem, isCorrect, lcm, onesOf, parseAnswer, problemSpeech, problemText, shatterStart, shatterTen, sliceCounts, sliceHint,
  sliceOptions, sliceWorks, socraticFallback, takeOnes, takeTens, tensOf,
} from "../arenaMath";
import { acceptCompanion, acceptDiagnosis } from "../../ai/adventure/arena";
import { additionSkill } from "../learning";
import { recordPractice, restoreCurriculum } from "../curriculum";
import { createRng } from "../../engine/rng";

(function () {
  const S = window.MQS, MQ = window.MQ, $ = (id) => document.getElementById(id);
  const ROUNDS = 6, SESSION_KEY = "mq.arena.elo";
  const TIER_NAMES = ["Equation", "Highlight", "Blocks", "Blocks by tens"];
  const ARMOR = { "carry-colossus": 2, "borrowing-behemoth": 4, "denominator-demon": 3 };
  // Hoot speaks at most this many times on its own per problem; later pauses wait longer than the first.
  const MAX_NUDGES = 3, STILL_SECONDS = 12, DRAFT_PAUSE_MS = 1200;
  const MOMENT_TITLES = {
    start: "HOOT · LET’S LOOK TOGETHER",
    hesitate: "HOOT NOTICED YOU THINKING",
    draft: "HOOT IS READING YOUR ANSWER",
    mistake: "HOOT ASKS",
    boss: "HOOT · YOUR NEXT MOVE",
    ask: "HOOT · YOU ASKED FOR HELP",
    solved: "HOOT CHEERS",
  };
  const MOVE_NAMES = { bundle: "bundle ten ones", shatter: "shatter a ten", takeOnes: "take away ones", takeTens: "take away tens", slice: "pick a slice size", combine: "put the slices together", count: "count and attack" };
  const safe = (t) => { const el = document.createElement("span"); el.textContent = String(t); return el.innerHTML; };
  const aiOn = () => window.MQAI.status() === "on";
  const units = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;

  // The rating lives only for this browser tab: no stored history, no database.
  function loadSession() {
    try { return startSession(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")); } catch { return startSession(); }
  }
  function saveSession(session) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* blocked storage: the session stays in memory */ }
  }
  function arenaSave() {
    const raw = S.get().arena, bosses = {};
    for (const id of Object.keys(BOSSES)) { const n = raw?.bosses?.[id]; bosses[id] = Number.isInteger(n) && n > 0 ? n : 0; }
    return { bosses, runs: Number.isInteger(raw?.runs) && raw.runs > 0 ? raw.runs : 0 };
  }
  /** Runs one AI request with its own latency budget; the game never waits longer than that. */
  function withBudget(run, ms, parent) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), ms);
    const stop = () => controller.abort();
    parent?.addEventListener("abort", stop, { once: true });
    return Promise.resolve().then(() => run(controller.signal)).catch(() => null).finally(() => { clearTimeout(timer); parent?.removeEventListener("abort", stop); });
  }

  // ---------- Pictures of numbers ----------
  const rods = (n) => '<i class="ar-rod" aria-hidden="true"></i>'.repeat(Math.max(0, n));
  const cubes = (n) => '<i class="ar-cube" aria-hidden="true"></i>'.repeat(Math.max(0, n));
  function groupedCubes(n) {
    let html = "";
    for (let i = 0; i < n; i += 10) html += n - i >= 10 ? `<span class="ar-ten-group" aria-hidden="true">${cubes(10)}</span>` : cubes(n - i);
    return html;
  }
  const blockNumber = (n) => `<div class="ar-number"><span class="ar-number-label">${n}</span><div class="ar-set" role="img" aria-label="${n} is ${units(tensOf(n), "ten")} and ${units(onesOf(n), "one")}">${rods(tensOf(n))}${cubes(onesOf(n))}</div></div>`;
  const bar = (parts, shaded) => `<div class="ar-bar" role="img" aria-label="${shaded} of ${parts} equal parts shaded" style="--parts:${parts}">${Array.from({ length: parts }, (_, i) => `<i class="${i < shaded ? "on" : ""}"></i>`).join("")}</div>`;
  function pizza(slices, first, second, label) {
    const point = (angle) => `${(50 + 44 * Math.cos(angle)).toFixed(2)} ${(50 + 44 * Math.sin(angle)).toFixed(2)}`;
    const wedges = Array.from({ length: slices }, (_, i) => {
      const a0 = (i / slices) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / slices) * Math.PI * 2 - Math.PI / 2;
      const cls = i < first ? "on" : i < first + second ? "on two" : "";
      return `<path class="${cls}" d="M50 50 L${point(a0)} A44 44 0 0 1 ${point(a1)} Z"/>`;
    }).join("");
    return `<svg class="ar-pizza" viewBox="0 0 100 100" role="img" aria-label="${label}">${wedges}</svg>`;
  }
  const answerForm = (id, label, cta, fraction) => `<label class="ar-label" for="${id}">${label}</label><div class="ar-inputrow"><input id="${id}" class="ar-input" type="text" inputmode="${fraction ? "text" : "numeric"}" autocomplete="off" spellcheck="false" maxlength="7" placeholder="${fraction ? "like 3/4" : ""}"><button type="submit" class="btn ar-submit">${cta} →</button></div><div class="ar-keys" role="group" aria-label="Number keys">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "/", "⌫"].map((k) => `<button type="button" data-key="${k}" data-for="${id}" aria-label="${k === "⌫" ? "Delete" : k === "/" ? "Fraction bar" : k}" ${k === "/" && !fraction ? "hidden" : ""}>${k}</button>`).join("")}</div>`;

  // ---------- Landing page (the Arena tab) ----------
  function renderLanding() {
    const box = $("arenaLanding");
    if (!box) return;
    const grade = window.MQClasses?.grade();
    if (grade) {
      const info = window.MQClasses.current(), arena = ARENA_NAMES[grade];
      let raw = null; try { raw = JSON.parse(sessionStorage.getItem(`mq.arena.elo.${grade}`) || "null"); } catch { /* fresh */ }
      const session = restoreClassArena(grade, raw);
      box.innerHTML = `<div class="ar-landing"><header class="ar-hero"><div class="ar-hero-copy"><p class="voyage-kicker">${info.label.toUpperCase()} · YOUR ARENA</p><h1 id="arenaTitle">${arena.title}</h1><p class="ar-lede">${arena.description}</p><div class="ar-cta"><button type="button" class="btn ar-start">Help our muddled friend →</button><span class="ar-level-chip">Challenge level <b data-landing-rating>${session.rating}</b></span></div><p class="ar-status">${window.MQAI.status() === "on" ? "Hoot’s AI hints are configured. Tap the roaming owl for a small next step." : "Play is ready. A grown-up can connect Hoot’s AI in Adults."}</p></div><div class="ar-hero-art" aria-hidden="true"><span class="ar-hero-owl">${window.MQArt.owl}</span><span class="ar-hero-monster">☁️</span></div></header><section class="ar-steps"><h2>Restore five little lanterns</h2><ol><li><b>Challenges for your class</b><span>Every problem stays within ${info.label}. Your first try guides the next challenge.</span></li><li><b>Repair a muddle</b><span>Use the objects and models to change your idea. Mistakes cost no points.</span></li><li><b>Hoot helps you think</b><span>Stop the owl, try a small step, then ask for another hint when you need one.</span></li></ol></section></div>`;
      return;
    }
    const saved = arenaSave(), session = loadSession();
    const status = window.MQAI.status();
    box.innerHTML = `<div class="ar-landing">
      <header class="ar-hero">
        <div class="ar-hero-copy">
          <p class="voyage-kicker">HOOT’S MUDDLE MONSTER ARENA</p>
          <h1 id="arenaTitle">Mix-ups make monsters. <em>Fixing ideas</em> beats them.</h1>
          <p class="ar-lede">Solve each problem your way with Hoot right beside you. Hoot notices what you are working on and asks one question at a time. If the Muddle Mist tangles an idea, Hoot spots the exact mix-up and summons the monster that only the right math move can beat.</p>
          <div class="ar-cta"><button type="button" class="btn ar-start">Enter the arena →</button><span class="ar-level-chip">Challenge level <b data-landing-rating>${session.rating}</b></span></div>
          <p class="ar-status" role="status">${status === "on" ? "✦ AI companion connected: Hoot’s questions about your work and hard-to-read answers use AI, and code checks every reply." : status === "checking" ? "Checking Hoot’s AI companion…" : "Built-in mode: Hoot uses code-checked questions and diagnoses. A grown-up can connect the AI companion."}</p>
        </div>
        <div class="ar-hero-art" aria-hidden="true"><span class="ar-hero-owl">${window.MQArt.owl}</span>${Object.values(BOSSES).map((b) => `<span class="ar-hero-monster">${b.emoji}</span>`).join("")}</div>
      </header>
      <section class="ar-steps" aria-labelledby="arStepsTitle">
        <h2 id="arStepsTitle">What happens on every problem</h2>
        <ol>
          <li><b>Hoot picks your challenge</b><span>Your first answer to each problem moves your challenge level up or down, so the next problem fits. It starts fresh in a new tab.</span><small>In-session Elo rating</small></li>
          <li><b>Hoot stays beside you</b><span>Hoot notices when you pause, what you type and which monster move comes next, then asks one question that fits. Tap “Help me think” any time.</span><small>Socratic AI companion</small></li>
          <li><b>Help grows when you need it</b><span>Stop to think and the key digits light up. After a mix-up, blocks or fraction bars appear.</span><small>Scaffolding engine</small></li>
          <li><b>Mix-ups summon monsters</b><span>Common mix-ups are recognized instantly, and unusual answers get a closer look with AI. Beat the matching monster with the right math move.</span><small>Misconception diagnosis</small></li>
        </ol>
      </section>
      <section class="ar-roster" aria-labelledby="arRosterTitle">
        <h2 id="arRosterTitle">Monster book</h2>
        <div class="ar-roster-grid">${Object.entries(BOSSES).map(([id, b]) => `<article class="ar-monster" data-boss-card="${id}" data-met="${saved.bosses[id] > 0}"><span class="ar-monster-face" aria-hidden="true">${b.emoji}</span><h3>${b.name}</h3><p><b>Appears when you:</b> ${b.codes.map((c) => MISCONCEPTIONS[c].label.toLowerCase()).join(" or ")}.</p><p><b>Beat it:</b> ${b.power}</p><span class="ar-monster-status">${saved.bosses[id] ? `✓ Defeated ${saved.bosses[id]}×` : "Not met yet"}</span></article>`).join("")}</div>
      </section>
    </div>`;
  }

  // ---------- One arena run ----------
  function mount(stage, api) {
    const life = new AbortController();
    const rng = createRng((Math.random() * 0xffffffff) >>> 0);
    const scaffold = new ScaffoldEngine();
    let session = loadSession();
    const startRating = session.rating, recent = [];
    let round = 0, independent = 0, bossesBeaten = 0, questions = 0;
    let problem = null, category = null, attempts = 0, helped = false, hintsBefore = 0, rated = false, solved = false;
    let bossUsed = false, inBoss = false, diag = null, mech = null, token = 0, lastTick = performance.now(), shownTier = -1;
    // Hoot's view of the current work: wrong answers so far, seconds without any action, and nudges already given.
    let wrongs = [], still = 0, nudges = 0, talk = 0, aiKey = "", aiLine = "", draftTimer = 0;

    stage.innerHTML = `<div class="ar-shell">
      <header class="ar-header">
        <div><p class="voyage-kicker">MUDDLE MONSTER ARENA</p><h1 id="arTitle">Get ready</h1><p class="ar-round" id="arRound"></p></div>
        <dl class="ar-panel" aria-label="Hoot’s brain">
          <div><dt>Challenge level</dt><dd><b id="arRating"></b><small id="arChange"></small></dd></div>
          <div><dt>This problem</dt><dd><b id="arProblemRating"></b><small id="arFit"></small></dd></div>
          <div><dt>Help level</dt><dd><span class="ar-tiers" id="arTiers" aria-hidden="true"><i></i><i></i><i></i><i></i></span><small id="arTierLabel"></small></dd></div>
        </dl>
      </header>
      <div class="ar-main">
        <section class="ar-card" aria-labelledby="arTitle">
          <div class="ar-equation" id="arEquation" role="img" data-arcade-anchor></div>
          <div class="ar-scaffold" id="arScaffold" hidden></div>
          <form class="ar-answer" id="arForm" novalidate></form>
          <p class="ar-feedback" id="arFeedback" role="status"></p>
          <div class="cg-how-host" id="arHow"></div>
          <section class="ar-boss" id="arBoss" hidden></section>
          <button type="button" class="btn ar-next" id="arNext" hidden>Next problem →</button>
        </section>
        <aside class="ar-side">
          <div class="ar-diagnosis" id="arDiagnosis" hidden></div>
          <p class="ar-side-note">No clock and no lost points. Take your time.</p>
        </aside>
      </div>
    </div>`;

    const feedback = (text, state = "") => { $("arFeedback").textContent = text; $("arFeedback").dataset.state = state; };

    /** The shared "You wanna know how?" control; see runtime/explain-ui.js. */
    const explainer = window.MQExplain.create({ actions: $("arNext").parentElement, panel: $("arHow"), signal: life.signal, buttonClass: "btn ar-next" });

    function panel() {
      $("arRating").textContent = session.rating;
      $("arRating").dataset.rating = String(session.rating);
      $("arProblemRating").textContent = category ? category.rating : "—";
      const odds = category ? expectedScore(session.rating, category.rating) : 0.5;
      $("arFit").textContent = odds > 0.65 ? "Warm-up" : odds < 0.35 ? "Stretch" : "Good fit";
      const tier = scaffold.tier;
      $("arTiers").querySelectorAll("i").forEach((el, i) => el.classList.toggle("on", i <= tier));
      $("arTierLabel").textContent = `${tier} · ${TIER_NAMES[tier]}`;
    }

    function equationHTML(p) {
      if (p.kind === "frac") {
        const frac = (n, d) => `<span class="ar-frac"><b data-part="num">${n}</b><b data-part="den">${d}</b></span>`;
        return `<div class="ar-fracline" aria-hidden="true">${frac(p.a, p.b)}<i data-part="op">+</i>${frac(p.c, p.d)}<i>=</i><span class="ar-frac ar-unknown"><b>?</b><b>?</b></span></div>`;
      }
      const digits = (n) => `<b data-col="tens">${tensOf(n) || ""}</b><b data-col="ones">${onesOf(n)}</b>`;
      return `<div class="ar-columns" aria-hidden="true"><span class="ar-row"><i></i>${digits(p.a)}</span><span class="ar-row"><i data-part="op">${p.kind === "add" ? "+" : "−"}</i>${digits(p.b)}</span><span class="ar-rule"></span><span class="ar-row ar-unknown"><i></i><b>?</b></span></div>`;
    }

    function scaffoldHTML(p, tier) {
      if (p.kind === "frac") {
        if (tier === 2) return `<p class="ar-scaffold-title">Fraction bars</p>${bar(p.b, p.a)}${bar(p.d, p.c)}<p class="ar-caption">Are these pieces the same size?</p>`;
        const common = lcm(p.b, p.d), [x, y] = sliceCounts(p, common);
        return `<p class="ar-scaffold-title">Same-size pieces</p>${bar(common, x)}${bar(common, y)}<p class="ar-caption">Both bars are now cut into ${common} equal pieces.</p>`;
      }
      if (p.kind === "add") {
        if (tier === 2) return `<p class="ar-scaffold-title">Blocks</p><div class="ar-numbers">${blockNumber(p.a)}<i class="ar-plus" aria-hidden="true">+</i>${blockNumber(p.b)}</div>`;
        const ones = onesOf(p.a) + onesOf(p.b);
        return `<p class="ar-scaffold-title">Blocks grouped by tens</p><div class="ar-numbers"><div class="ar-number"><span class="ar-number-label">Tens</span><div class="ar-set" role="img" aria-label="${units(tensOf(p.a) + tensOf(p.b), "ten")}">${rods(tensOf(p.a) + tensOf(p.b))}</div></div><div class="ar-number"><span class="ar-number-label">Ones together</span><div class="ar-set" role="img" aria-label="${units(ones, "one")}, grouped by ten">${groupedCubes(ones)}</div></div></div><p class="ar-caption">${ones >= 10 ? "A full group of 10 ones is the same as 1 ten." : "Count the tens, then the ones."}</p>`;
      }
      if (tier === 2) return `<p class="ar-scaffold-title">Blocks</p><div class="ar-numbers">${blockNumber(p.a)}</div><p class="ar-caption">Take away ${units(tensOf(p.b), "ten")} and ${units(onesOf(p.b), "one")}.</p>`;
      const short = onesOf(p.a) < onesOf(p.b);
      return `<p class="ar-scaffold-title">Blocks grouped by tens</p><div class="ar-numbers"><div class="ar-number"><span class="ar-number-label">Tens</span><div class="ar-set" role="img" aria-label="${units(tensOf(p.a) - (short ? 1 : 0), "ten")}">${rods(tensOf(p.a) - (short ? 1 : 0))}</div></div><div class="ar-number"><span class="ar-number-label">Ones</span><div class="ar-set" role="img" aria-label="${units(onesOf(p.a) + (short ? 10 : 0), "one")}">${short ? `<span class="ar-ten-group opened" aria-hidden="true">${cubes(10)}</span>` : ""}${cubes(onesOf(p.a))}</div></div></div><p class="ar-caption">${short ? "One ten has been opened into 10 ones." : "Take away the ones, then the tens."}</p>`;
    }

    function renderHelp() {
      const tier = scaffold.tier;
      if (tier === shownTier) return;
      shownTier = tier;
      $("arEquation").dataset.tier = String(tier);
      const box = $("arScaffold");
      box.hidden = tier < 2;
      box.dataset.tier = String(tier);
      box.innerHTML = tier >= 2 ? scaffoldHTML(problem, tier) : "";
      panel();
      api.companion.refresh();
    }

    // ---------- Hoot, always beside the work (the shared companion bar) ----------
    /** The next boss move, read from the encounter state. */
    function bossStep() {
      if (!inBoss || !mech || !mech.armor) return null;
      const s = mech.state;
      if (mech.boss === "carry-colossus") return s.bundled ? "count" : "bundle";
      if (mech.boss === "borrowing-behemoth") {
        if (s.tookTens) return "count";
        if (s.tookOnes) return "takeTens";
        return !s.shattered && s.ones < onesOf(problem.b) ? "shatter" : "takeOnes";
      }
      return !mech.size ? "slice" : !mech.combined ? "combine" : "count";
    }

    /** What Hoot knows about the child's current work. All of it is game state; no free text ever leaves the game. */
    const context = (moment) => ({ moment, problem, wrongAnswers: wrongs.slice(-3), code: diag ? diag.code : null, tier: scaffold.tier, bossStep: bossStep() });

    /** The "Hoot sees" line for the companion bar. */
    function sees() {
      const bits = [problemText(problem)], step = bossStep();
      if (solved) bits.push("solved");
      else if (step) bits.push(BOSSES[mech.boss].name, `next move: ${MOVE_NAMES[step]}`);
      else {
        bits.push(attempts ? `try ${attempts + 1}` : "first try");
        if (diag && diag.code !== "ERR_UNKNOWN") bits.push(MISCONCEPTIONS[diag.code].label.toLowerCase());
        if (scaffold.tier >= 2) bits.push(problem.kind === "frac" ? "fraction bars out" : "blocks out");
      }
      return bits.join(" · ");
    }

    const speak = (text, moment, byAI) => api.companion.say(text, { moment, byAI, title: MOMENT_TITLES[moment] });

    /** Hoot reacts to a moment: a code-checked line at once, then an AI rewording when connected and allowed. */
    function coach(moment, { ai = true } = {}) {
      if (!problem) return;
      const ctx = context(moment), my = ++talk, asked = problem, key = JSON.stringify(ctx);
      const live = ai && aiOn() && AI_MOMENTS.includes(moment);
      if (live && key === aiKey) { speak(aiLine, moment, true); return; }
      speak(companionLine(ctx), moment, false);
      if (!live) return;
      withBudget((signal) => window.MQAI.companion(ctx, signal), 4500, life.signal).then((reply) => {
        if (my !== talk || !api.alive() || asked !== problem) return;
        const question = reply && acceptCompanion(asked, reply.question);
        if (!question) return;
        aiKey = key;
        aiLine = question;
        speak(question, moment, true);
      });
    }

    /** Any action by the child resets Hoot's patience. */
    const active = () => { still = 0; };

    /** After the child stops typing, Hoot reads the draft: format slips and repeated answers, never right or wrong. */
    function readDraft() {
      active();
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => {
        if (!api.alive() || !problem || solved || inBoss) return;
        const note = draftNote(problem, $("arInput")?.value || "", wrongs);
        if (!note) return;
        talk++;
        speak(note, "draft", false);
      }, DRAFT_PAUSE_MS);
    }

    /** When the child has been still for a while, Hoot offers one question about where they are. */
    function watch() {
      if (nudges >= MAX_NUDGES) return;
      const first = nudges === 0 && !attempts && !inBoss;
      if (still <= (first ? HESITATION_SECONDS : STILL_SECONDS)) return;
      if (!inBoss && $("arInput")?.value.trim()) return;
      nudges++;
      still = 0;
      coach(inBoss ? "boss" : "hesitate");
    }

    function askForHelp() {
      if (!problem || solved) return;
      helped = true;
      questions++;
      active();
      coach("ask");
    }

    function tick() {
      const now = performance.now(), dt = Math.min((now - lastTick) / 1000, 1);
      lastTick = now;
      if (!api.alive() || !problem || solved || document.hidden) return;
      if (document.querySelector("dialog[open]") || !$("result").hidden) return;
      still += dt;
      if (!inBoss) { scaffold.addTime(dt); renderHelp(); }
      watch();
    }

    function record(correct) {
      const support = helped || bossUsed || api.hintsUsed() > hintsBefore;
      if (problem.kind === "add") {
        const kind = additionSkill(problem.a, problem.b);
        api.observe({ skill: kind.skill, level: kind.level, format: "equation", correct, attempt: attempts, hintLevel: support ? 1 : 0 });
        return;
      }
      const concept = problem.kind === "sub" ? "subtraction" : "fractions";
      const band = category.id === "sub_borrow" || category.id === "frac_unlike" ? 2 : 1;
      S.update((s) => { s.curriculum = recordPractice(restoreCurriculum(s.curriculum), concept, correct, attempts, support, band, "arena-equation"); });
    }

    function showChange(change) {
      const el = $("arChange");
      el.textContent = change > 0 ? `↑ +${change}` : change < 0 ? `↓ ${change}` : "±0";
      el.dataset.dir = change > 0 ? "up" : change < 0 ? "down" : "same";
      panel();
    }

    function showDiagnosis(d, settled) {
      const box = $("arDiagnosis");
      box.hidden = false;
      box.dataset.code = d.code;
      box.dataset.source = d.source;
      if (d.code === "ERR_UNKNOWN") {
        box.innerHTML = `<p class="ar-kicker">HOOT’S DIAGNOSIS</p><h2>A new kind of mix-up</h2><p>${settled ? "The blocks and Hoot’s questions can help you find it." : "Hoot is taking a closer look with AI…"}</p><code>ERR_UNKNOWN</code>`;
        return;
      }
      box.innerHTML = `<p class="ar-kicker">HOOT’S DIAGNOSIS · ${d.source === "ai" ? "FOUND BY AI" : "FOUND INSTANTLY BY CODE"}</p><h2>${safe(d.label)}</h2><p>${safe(MISCONCEPTIONS[d.code].grownUp)}</p><code>${d.code}${d.event ? ` → ${d.event}` : ""}</code>`;
    }

    function begin() {
      token++;
      category = chooseCategory(session.rating, recent, rng);
      recent.push(category.id);
      problem = generateProblem(category.id, rng);
      explainer.reset();
      attempts = 0; helped = false; hintsBefore = api.hintsUsed(); rated = false; solved = false;
      bossUsed = false; inBoss = false; diag = null; mech = null; shownTier = -1;
      wrongs = []; still = 0; nudges = 0; aiKey = ""; aiLine = "";
      clearTimeout(draftTimer);
      scaffold.reset();
      lastTick = performance.now();
      $("arTitle").textContent = category.label;
      $("arRound").textContent = `Problem ${round + 1} of ${ROUNDS}`;
      const eq = $("arEquation");
      eq.innerHTML = equationHTML(problem);
      eq.setAttribute("aria-label", `${problemSpeech(problem)} equals what?`);
      eq.dataset.kind = problem.kind; eq.dataset.a = problem.a; eq.dataset.b = problem.b;
      eq.dataset.c = problem.kind === "frac" ? problem.c : ""; eq.dataset.d = problem.kind === "frac" ? problem.d : "";
      for (const id of ["arDiagnosis", "arBoss", "arNext"]) $(id).hidden = true;
      $("arChange").textContent = "";
      const form = $("arForm");
      form.hidden = false;
      form.innerHTML = answerForm("arInput", "Your answer", "Check", problem.kind === "frac");
      feedback(problem.kind === "frac" ? "Type your answer as a fraction, like 3/4." : "Type your answer.");
      // "Help me think" and the owl both land here; Hoot answers in the bar, so nothing is returned to show.
      api.setHint(() => { askForHelp(); return null; });
      renderHelp();
      coach("start");
      $("arInput").focus({ preventScroll: true });
    }

    async function submit(text) {
      if (!problem || solved || inBoss) return;
      clearTimeout(draftTimer);
      active();
      const parsed = parseAnswer(problem, text);
      if (!parsed) { feedback(problem.kind === "frac" ? "Write a fraction with a slash, like 3/4." : "Write a whole number using digits.", "hint"); return; }
      attempts++;
      const correct = isCorrect(problem, parsed);
      record(correct);
      if (!rated) {
        rated = true;
        const result = recordEncounter(session, category.id, correct);
        session = result.session;
        saveSession(session);
        showChange(result.change);
      }
      if (correct) { win(); return; }

      const my = ++token, code = classifyAnswer(problem, parsed), asked = problem;
      wrongs.push(answerText(parsed));
      api.emit("miss");
      api.sfx.wrong();
      scaffold.recordError();
      renderHelp();
      feedback(`${answerText(parsed)} isn’t it yet. Hoot has a question for you.`, "retry");
      diag = diagnosis(code, "rules");
      helped = true;
      questions++;
      const lookCloser = code === "ERR_UNKNOWN" && aiOn();
      showDiagnosis(diag, !lookCloser);
      if (lookCloser) {
        // Rules could not explain the answer: ask the AI classifier, but never hold the game for long.
        talk++;
        speak(socraticFallback(problem, code), "mistake", false);
        const found = await withBudget((signal) => window.MQAI.diagnose(asked, answerText(parsed), signal), 2500, life.signal);
        if (my !== token || !api.alive() || asked !== problem || solved) return;
        const accepted = found && acceptDiagnosis(asked, found.code);
        if (accepted) diag = diagnosis(accepted, "ai");
        showDiagnosis(diag, true);
      }
      coach("mistake");
      if (diag.boss && !bossUsed) summonBoss(diag);
      else { const input = $("arInput"); input.select(); input.focus({ preventScroll: true }); }
    }

    function win() {
      solved = true;
      inBoss = false;
      token++;
      clearTimeout(draftTimer);
      const solo = attempts === 1 && !helped && api.hintsUsed() === hintsBefore;
      if (solo) independent++;
      api.emit("solved", { afterMistake: attempts > 1 });
      api.sfx.good();
      const c = api.center($("arEquation"));
      api.burst(c.x, c.y, { count: 16, chars: ["✨", "⭐"], spread: 120 });
      feedback(`✓ ${problemText(problem)} = ${correctText(problem)}. ${solo ? "First try, all by yourself!" : "You untangled the idea!"}`, "correct");
      // The problem is already marked and the Elo rating already moved; this only explains the route.
      explainer.offer({
        grade: window.MQClasses ? window.MQClasses.grade() : "3",
        skill: category.label || "Arena practice", question: problemText(problem),
        answer: correctText(problem), given: answerText(parsed), firstTry: solo,
        board: "A repair bench in the Muddle Monster Arena showing the problem as an equation.",
      });
      $("arForm").hidden = true;
      round++;
      coach("solved");
      const next = $("arNext");
      next.hidden = false;
      next.textContent = round >= ROUNDS ? "See my results →" : "Next problem →";
      next.focus({ preventScroll: true });
      panel();
    }

    // ---------- Boss encounters ----------
    function summonBoss(d) {
      bossUsed = true;
      inBoss = true;
      helped = true;
      const boss = BOSSES[d.boss];
      mech = { boss: d.boss, event: d.event, armor: ARMOR[d.boss], max: ARMOR[d.boss], state: d.boss === "carry-colossus" ? bundleStart(problem) : d.boss === "borrowing-behemoth" ? shatterStart(problem) : null, size: 0, combined: false };
      $("arForm").hidden = true;
      api.arcade.banner(`${boss.name}!`, { sub: "A mix-up monster appears", tone: "coral" });
      api.sfx.hit();
      renderBoss(boss.taunt, "enter");
      api.companion.refresh();
      // Bring the monster into view; Hoot's bar stays at the bottom of the screen.
      const box = $("arBoss"), top = box.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) box.scrollIntoView({ block: "start", behavior: api.reduced ? "auto" : "smooth" });
    }

    function workspaceHTML() {
      const p = problem, s = mech.state;
      if (mech.boss === "carry-colossus") {
        return `<div class="ar-numbers"><div class="ar-number"><span class="ar-number-label">Ten-Blocks</span><div class="ar-set" role="img" aria-label="${units(s.tens, "ten")}">${rods(s.tens)}</div></div><div class="ar-number"><span class="ar-number-label">One-Blocks</span><div class="ar-set" role="img" aria-label="${units(s.ones, "one")}">${groupedCubes(s.ones)}</div></div></div>${s.bundled ? `<form class="ar-answer ar-boss-form" id="arBossForm" novalidate>${answerForm("arBossInput", "How many altogether?", "Attack", false)}</form>` : '<div class="ar-boss-actions"><button type="button" class="btn" data-boss-act="bundle">Bundle 10 ones into 1 ten</button></div>'}`;
      }
      if (mech.boss === "borrowing-behemoth") {
        return `<p class="ar-step">Take away ${p.b}: ${units(tensOf(p.b), "ten")} and ${units(onesOf(p.b), "one")}.</p><div class="ar-numbers"><div class="ar-number"><span class="ar-number-label">Ten-Blocks</span><div class="ar-set" role="img" aria-label="${units(s.tens, "ten")}">${rods(s.tens)}</div></div><div class="ar-number"><span class="ar-number-label">One-Blocks</span><div class="ar-set" role="img" aria-label="${units(s.ones, "one")}">${groupedCubes(s.ones)}</div></div></div>${s.tookTens ? `<form class="ar-answer ar-boss-form" id="arBossForm" novalidate>${answerForm("arBossInput", "How many are left?", "Attack", false)}</form>` : `<div class="ar-boss-actions"><button type="button" class="fg-button" data-boss-act="shatter" ${s.shattered || !s.tens ? "disabled" : ""}>Shatter a Ten-Block</button><button type="button" class="fg-button" data-boss-act="ones" ${s.tookOnes ? "disabled" : ""}>Take away ${units(onesOf(p.b), "one")}</button><button type="button" class="fg-button" data-boss-act="tens" ${s.tookOnes ? "" : "disabled"}>Take away ${units(tensOf(p.b), "ten")}</button></div>`}`;
      }
      if (!mech.size) {
        return `<div class="ar-pizzas">${pizza(p.b, p.a, 0, `A pizza cut into ${p.b} slices with ${p.a} shaded`)}<i aria-hidden="true">+</i>${pizza(p.d, p.c, 0, `A pizza cut into ${p.d} slices with ${p.c} shaded`)}</div><p class="ar-step">Choose one slice size for both pizzas.</p><div class="ar-boss-actions ar-slices">${sliceOptions(p).map((n) => `<button type="button" class="fg-button" data-boss-act="slice" data-size="${n}">${n} slices</button>`).join("")}</div>`;
      }
      const [x, y] = sliceCounts(p, mech.size);
      if (!mech.combined) {
        return `<div class="ar-pizzas">${pizza(mech.size, x, 0, `${x} of ${mech.size} equal slices shaded`)}<i aria-hidden="true">+</i>${pizza(mech.size, 0, y, `${y} of ${mech.size} equal slices shaded`)}</div><div class="ar-boss-actions"><button type="button" class="btn" data-boss-act="combine">Put the shaded slices on one plate</button></div>`;
      }
      return `<div class="ar-pizzas">${pizza(mech.size, x, y, `One pizza in ${mech.size} equal slices with ${x} and ${y} shaded slices`)}</div><form class="ar-answer ar-boss-form" id="arBossForm" novalidate>${answerForm("arBossInput", "What fraction of one pizza is shaded?", "Attack", true)}</form>`;
    }

    function renderBoss(message, mood) {
      const boss = BOSSES[mech.boss], box = $("arBoss");
      box.hidden = false;
      box.dataset.boss = mech.boss;
      box.dataset.event = mech.event;
      box.dataset.armor = String(mech.armor);
      box.innerHTML = `<header class="ar-boss-head"><span class="ar-boss-face" data-mood="${mood}" aria-hidden="true">${boss.emoji}</span><div><p class="ar-kicker">${mech.event}</p><h2>${boss.name}</h2><div class="ar-armor" role="img" aria-label="${boss.name} has ${mech.armor} of ${mech.max} armor left">${Array.from({ length: mech.max }, (_, i) => `<i class="${i < mech.armor ? "on" : ""}"></i>`).join("")}</div></div></header><p class="ar-boss-say" role="status">${safe(message)}</p><p class="ar-power"><b>Your power:</b> ${boss.power}</p><div class="ar-workspace">${mech.armor ? workspaceHTML() : ""}</div>`;
      box.querySelector("[data-boss-act]:not(:disabled), #arBossInput")?.focus({ preventScroll: true });
    }

    /** A correct move: the monster loses armor and Hoot points to the next move (built-in, instant). */
    function strike(message) {
      mech.armor = Math.max(1, mech.armor - 1);
      api.sfx.hit();
      const c = api.center($("arBoss"));
      api.arcade.impact({ x: c.x, y: c.y, power: 2, tone: "coral" });
      renderBoss(message, "hit");
      coach("boss", { ai: false });
    }
    /** A move that does not work yet: the child may be stuck, so Hoot looks closer (AI when connected). */
    function taunt(message) {
      api.sfx.wrong();
      renderBoss(message, "laugh");
      coach("boss");
    }

    function bossAction(act, button) {
      if (!inBoss || !api.alive()) return;
      active();
      const p = problem, s = mech.state;
      if (act === "bundle") {
        const next = bundleTen(s); if (!next) return;
        mech.state = next;
        strike(`Crack! Ten One-Blocks became one Ten-Block. Now count the Ten-Blocks and the One-Blocks.`);
      } else if (act === "shatter") {
        const next = shatterTen(s); if (!next) return;
        mech.state = next;
        strike(`Crash! One Ten-Block shattered into ten One-Blocks. Now there are ${units(next.ones, "one")}.`);
      } else if (act === "ones") {
        const next = takeOnes(p, s);
        if (!next) { taunt(`Ha! Only ${units(s.ones, "one")} on the table. You can’t take away ${units(onesOf(p.b), "one")} yet!`); return; }
        mech.state = next;
        strike(`You took away ${units(onesOf(p.b), "one")}. Now take away the tens.`);
      } else if (act === "tens") {
        const next = takeTens(p, s); if (!next) return;
        mech.state = next;
        strike(`You took away ${units(tensOf(p.b), "ten")}. Count what is left to finish it!`);
      } else if (act === "slice") {
        const size = Number(button.dataset.size);
        if (!sliceWorks(p, size)) { taunt(`${sliceHint(p, size)} Try another size!`); return; }
        mech.size = size;
        const [x, y] = sliceCounts(p, size);
        strike(`Slice! Both pizzas now have ${size} equal slices, with ${x} and ${y} shaded.`);
      } else if (act === "combine") {
        mech.combined = true;
        strike("Every shaded slice is on one plate. Name the fraction to finish it!");
      }
    }

    function attack(text) {
      if (!inBoss) return;
      active();
      const parsed = parseAnswer(problem, text);
      if (!parsed) { taunt(problem.kind === "frac" ? "Aim with a fraction, like 3/4!" : "Aim with a whole number!"); return; }
      attempts++;
      const correct = isCorrect(problem, parsed);
      record(correct);
      if (!correct) {
        wrongs.push(answerText(parsed));
        taunt(`${answerText(parsed)} bounces off! ${problem.kind === "frac" ? "Count all the shaded slices, then the slices in one pizza." : "Count the Ten-Blocks first, then the One-Blocks."}`);
        return;
      }
      const id = mech.boss, boss = BOSSES[id];
      mech.armor = 0;
      bossesBeaten++;
      S.update((s) => { const a = arenaSave(); a.bosses[id] += 1; s.arena = a; });
      renderBoss(`${boss.name} is defeated! The mix-up is fixed.`, "defeated");
      const c = api.center($("arBoss"));
      api.arcade.impact({ x: c.x, y: c.y, power: 3, tone: "gold" });
      api.arcade.fireworks(3);
      win();
    }

    function finish() {
      if (!api.alive()) return;
      S.update((s) => { const a = arenaSave(); a.runs += 1; s.arena = a; });
      api.finish({
        stars: independent >= 5 ? 3 : independent >= 3 ? 2 : 1,
        emoji: "🦉",
        title: bossesBeaten ? "The Muddle Monsters retreat!" : "Your thinking cleared the mist!",
        note: `Challenge level ${startRating} → ${session.rating}. ${independent} of ${ROUNDS} solved on the first try, ${bossesBeaten} ${bossesBeaten === 1 ? "monster" : "monsters"} defeated, and ${questions} ${questions === 1 ? "question" : "questions"} from Hoot.`,
      });
    }

    stage.addEventListener("click", (e) => {
      const key = e.target.closest("[data-key]");
      if (key) {
        const input = $(key.dataset.for);
        if (!input) return;
        input.value = key.dataset.key === "⌫" ? input.value.slice(0, -1) : (input.value + key.dataset.key).slice(0, 7);
        input.focus({ preventScroll: true });
        api.sfx.tap();
        if (input.id === "arInput") readDraft();
        else active();
        return;
      }
      const act = e.target.closest("[data-boss-act]");
      if (act && !act.disabled) { bossAction(act.dataset.bossAct, act); return; }
      if (e.target.closest("#arNext")) { if (round >= ROUNDS) finish(); else begin(); }
    }, { signal: life.signal });
    stage.addEventListener("input", (e) => {
      if (e.target.id === "arInput") readDraft();
      else if (e.target.id === "arBossInput") active();
    }, { signal: life.signal });
    stage.addEventListener("submit", (e) => {
      e.preventDefault();
      if (e.target.id === "arForm") submit($("arInput").value);
      else if (e.target.id === "arBossForm") attack($("arBossInput").value);
    }, { signal: life.signal });
    const ticker = setInterval(tick, 250);

    // The arena runs its own companion moments, so the shared bar's generic nudges and reactions stay off here.
    api.companion.quiet();
    api.companion.watch(() => (problem ? { sees: sees() } : null));
    begin();
    return () => { token++; talk++; clearTimeout(draftTimer); life.abort(); clearInterval(ticker); };
  }

  MQ.register({ id: "arena", canOpen: () => !window.MQClasses?.grade(), name: "Muddle Monster Arena", emoji: "👾", pathway: true, stageClass: "arena-stage", resultKicker: "MUDDLE MONSTER ARENA", resultLabel: "Back to the arena", mount });

  const start = MQ.start;
  MQ.start = function () {
    start();
    const box = document.createElement("section");
    box.id = "arenaLanding";
    box.className = "arena-landing";
    box.setAttribute("aria-labelledby", "arenaTitle");
    $("mapScreen").append(box);
    box.addEventListener("click", (e) => { if (e.target.closest(".ar-start")) MQ.openLevel(MQ.levels.find((l) => l.id === (window.MQClasses?.grade() ? `arena-${window.MQClasses.grade()}` : "arena"))); });
    renderLanding();
    window.MQAI.onStatus(renderLanding);
    new MutationObserver(renderLanding).observe($("mapBoard"), { childList: true });
  };
  window.MQArena = { render: renderLanding };
})();
