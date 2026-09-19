// Class chapters and practice. Tasks come from src/adventure/classes (generated, validated and checked in code);
// this module draws them, collects the child's answer, and records independent and supported attempts separately.
import { BONUS_BY_SLOT, CLASSES, CLASS_LIST, ROUNDS, SKILL_NAMES, chapterTask, practiceTask } from "../classes/catalog";
import { APEX_ROUNDS, apexTask, isStretchRound } from "../classes/apex";
import { ARENA_NAMES, classArenaTask, recordClassArena, restoreClassArena } from "../classes/arena";
import { checkTask, correctResponse, tickValue } from "../classes/tasks";
import { replayWorld } from "../classes/worlds";
import { recordClassWork, restoreClassWork, restoreRun } from "../classes/progress";

(function () {
  const S = window.MQS, MQ = window.MQ, A = window.MQClassArt, esc = A.esc;
  const KEYS = { int: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], decimal: [".", "0"], fraction: ["/", "0", "space"], time: [":", "0"], money: ["$", ".", "0"], remainder: ["R", "space", "0"], pair: ["(", ",", ")", "0"] };
  const KEY_LABEL = { space: "space", back: "⌫" };
  const NUDGE = {
    choice: "Which choice could you rule out first?",
    number: "What do you notice in the picture or the numbers?",
    line: "Where does the line start, and how big is each jump?",
    sort: "Which card are you most sure about?",
    build: "What could you change on the dials first?",
    order: "Which one belongs at the very start?",
    scene: "What changes when you touch an object?",
  };

  function blank(task) {
    switch (task.kind) {
      case "world": return { kind: "world", moves: [] };
      case "scene": return { kind: "scene", selected: [] };
      case "choice": return { kind: "choice", id: "" };
      case "number": return { kind: "number", text: "" };
      case "line": return { kind: "line", value: NaN };
      case "sort": return { kind: "sort", placements: {} };
      case "build": return { kind: "build", values: Object.fromEntries(task.dials.map((d) => [d.id, d.start])) };
      case "order": return { kind: "order", ids: [] };
    }
  }
  const started = (task, r) => (r.kind === "choice" ? Boolean(r.id) : r.kind === "number" ? r.text.trim() !== "" : r.kind === "line" ? !Number.isNaN(r.value) : r.kind === "sort" ? task.items.every((i) => r.placements[i.id]) : true);
  const numbersIn = (text) => (String(text).replace(/,/g, "").match(/\d+/g) || []).map(Number);

  function mount(stage, api, cfg) {
    const ROUNDS = cfg.apex ? APEX_ROUNDS : 5;
    const lifecycle = new AbortController();
    // Apex resumes like a chapter does: same checkpoint map, keyed by the level id, which is "apex-…" and
    // so can never collide with the chapter it is built from.
    const saved = cfg.chapter || cfg.apex ? restoreRun((S.get().classRuns || {})[cfg.id]) : null;
    const seed = saved ? saved.seed : Math.floor(Math.random() * 0xffffffff);
    let round = saved && saved.round < ROUNDS ? saved.round : 0, independent = saved ? Math.min(saved.independent, round) : 0;
    let task, response, attempt = 1, helped = false, solved = false, hintsBefore = 0, ref = null, arenaPick = null, arenaRecorded = false;
    const arenaKey = `mq.arena.elo.${cfg.grade}`;
    let arenaSession;
    try { arenaSession = restoreClassArena(cfg.grade, JSON.parse(sessionStorage.getItem(arenaKey) || "null")); } catch { arenaSession = restoreClassArena(cfg.grade); }
    let playUI = {}, byAI = false, stretch = false;
    /**
     * Where this level's questions come from. The Arena is excluded because it picks its own question
     * by rating rather than by round.
     */
    const built = cfg.apex ? (r) => apexTask(cfg.grade, cfg.apex.slot, seed, r)
      : cfg.chapter ? (r) => chapterTask(cfg.chapter, seed, r)
      : cfg.sources ? (r) => practiceTask(cfg.sources, seed, r)
      : null;
    const source = !cfg.arena && built ? window.MQQuestions.create({
      grade: cfg.grade, rounds: ROUNDS, seed, signal: lifecycle.signal, built,
      topic: cfg.apex ? cfg.apex.skills : cfg.chapter ? cfg.chapter.skills : cfg.title,
      quest: cfg.apex ? cfg.apex.quest : cfg.chapter ? cfg.chapter.quest : "Practice on your island.",
      skillName: (t) => SKILL_NAMES[t.skill] || "",
      apex: Boolean(cfg.apex),
      stretch: cfg.apex ? (r) => isStretchRound(cfg.grade, cfg.apex.slot, r) : null,
    }) : null;
    const moves = [];
    const move = (text) => { moves.push(text); if (moves.length > 6) moves.shift(); };
    const q = (s) => stage.querySelector(s);
    const taskName = cfg.apex ? "APEX CHALLENGE" : cfg.grade === "K" ? "PLAY" : "MISSION";
    stage.dataset.class = cfg.grade;
    stage.dataset.activity = cfg.arena ? "arena" : cfg.apex ? "apex" : "chapter";
    stage.innerHTML = `<div class="trail-workspace class-workspace"><header class="trail-header"><div><p class="eyebrow">${esc(cfg.kicker)}</p><h1>${esc(cfg.title)}</h1></div><span class="trail-band" id="cgSkill"></span></header><div class="trail-progress" role="progressbar" aria-label="Questions finished" aria-valuemin="0" aria-valuemax="${ROUNDS}" aria-valuenow="${round}">${Array.from({ length: ROUNDS }, (_, i) => `<span data-stop="${i}" class="${i < round ? "found" : ""}">${i < round ? "✓" : i + 1}</span>`).join("")}</div><p class="cg-story-beat" role="status"></p><div class="cg-arena-readout" hidden></div><div class="trail-task"><span class="cg-mascot" aria-hidden="true">${cfg.emoji}</span><div><p class="eyebrow" id="cgRound"></p><h2 id="cgPrompt" tabindex="-1"></h2></div></div><div class="trail-board cg-board" id="cgBoard"></div><div class="trail-feedback" id="cgFeedback" role="status" aria-live="polite"></div><div class="cg-how-host" id="cgHow"></div><div class="trail-actions"><button type="button" class="trail-help" data-cg="help">✦ See a worked example</button><button type="button" class="btn" data-cg="check">Try it! →</button><button type="button" class="btn" data-cg="next" hidden>Next question →</button></div></div>`;


    const readButton = document.createElement("button");
    readButton.type = "button"; readButton.className = "cg-listen"; readButton.textContent = "🔊 Read my mission";
    readButton.hidden = !("speechSynthesis" in window);
    q(".trail-task").after(readButton);
    readButton.addEventListener("click", () => {
      window.speechSynthesis.cancel();
      const words = new SpeechSynthesisUtterance(task.prompt); words.lang = "en-US"; words.rate = cfg.grade === "K" ? .8 : .95;
      window.speechSynthesis.speak(words);
    }, { signal: lifecycle.signal });
    /**
     * The one answer string the explainer is checked against. Returns "" for question kinds whose answer
     * is a whole arrangement (sorting, ordering, building a world) rather than a value — there the
     * closing-line guard could not hold, so the button is not offered at all.
     */
    function answerText() {
      if (!task) return "";
      if (task.kind === "number") return String(task.answer);
      if (task.kind === "choice") return String(task.options.find((o) => o.id === task.answer)?.label || "");
      if (task.kind === "line") return String(task.answer);
      if (task.kind === "scene") return task.mode === "coordinate" ? "" : String(task.target);
      if (task.kind === "build") return task.goal.type === "each" ? "" : String(task.goal.target);
      return "";
    }
    /** A short, factual description of what was on screen, so the steps can refer to what the child saw. */
    function boardText() {
      if (!task) return "";
      if (task.kind === "choice") return `Choices: ${task.options.map((o) => o.label).join(", ")}`;
      if (task.kind === "line") return `A number line from ${task.min} to ${task.max}`;
      if (task.kind === "scene") return `${task.emoji} laid out in a ${task.rows || 1} by ${task.columns} grid, ${task.fixed} already placed`;
      if (task.kind === "build") return `Dials: ${task.dials.map((d) => d.label).join(", ")}`;
      if (task.kind === "number") return task.unit ? `The answer is a number of ${task.unit}` : "The child types a number";
      return "";
    }
    /** The shared "You wanna know how?" control; see runtime/explain-ui.js. */
    const explainer = window.MQExplain.create({ actions: q(".trail-actions"), panel: q("#cgHow"), signal: lifecycle.signal });
    /** What the child actually submitted, so the steps can speak to the route they took. */
    function givenText() {
      const r = response;
      if (!task || !r) return "";
      if (task.kind === "number") return String(r.text || "");
      if (task.kind === "choice") return String(task.options.find((o) => o.id === r.id)?.label || "");
      if (task.kind === "line") return String(r.value ?? "");
      if (task.kind === "scene") return String((r.selected || []).length + (task.fixed || 0));
      if (task.kind === "build") return task.dials.map((d) => `${d.label} ${r.values[d.id]}`).join(", ").slice(0, 78);
      return "";
    }
    const checkpoint = (fresh = false) => { if (cfg.chapter || cfg.apex) S.update((s) => { s.classRuns = { ...(s.classRuns || {}), [cfg.id]: { seed, round, independent, supported: !fresh && (helped || attempt > 1 || api.hintsUsed() > hintsBefore) } }; }); };
    function begin() {
      window.speechSynthesis?.cancel();
      if (cfg.arena) {
        arenaPick = classArenaTask(cfg.grade, seed + round, arenaSession); task = arenaPick.task;
        ref = { chapter: arenaPick.chapter, seed: arenaPick.seed, round: arenaPick.round };
      } else {
        const drawn = source ? source.take(round) : { task: built(round), byAI: false, stretch: false };
        task = drawn.task; byAI = drawn.byAI; stretch = drawn.stretch;
        // `ref` lets the server re-run this exact question for Hoot's hint. A freshly written question is
        // not reproducible from a seed, so it must not carry one — Hoot would coach a different question.
        ref = !byAI && cfg.chapter ? { chapter: cfg.chapter.id, seed, round } : null;
        stage.dataset.questionSource = byAI ? "ai" : "built-in";
      }
      arenaRecorded = false; playUI = {}; stage.classList.remove("cg-scaffold");
      response = blank(task); attempt = 1; helped = Boolean(saved && saved.round === round && saved.supported); solved = false; hintsBefore = api.hintsUsed(); moves.length = 0;
      checkpoint();
      q("#cgSkill").textContent = SKILL_NAMES[task.skill] || "";
      q("#cgRound").textContent = `${taskName} ${round + 1} OF ${ROUNDS}${stretch ? " · ↗ LOOK AHEAD" : ""}`;
      q(".cg-story-beat").textContent = cfg.arena ? `${ARENA_NAMES[cfg.grade].friend} needs your help. Repair this idea to restore a lantern.`
        : stretch ? `↗ A look ahead. This one reaches a little past ${CLASSES[cfg.grade].label}. Have a go — it cannot count against you.`
        : cfg.apex ? `${cfg.apex.quest} Something rare is hidden here. Only the hardest thinking will turn it up.`
        : cfg.chapter?.quest || "A new discovery for your island.";
      q(".cg-arena-readout").hidden = !cfg.arena;
      if (cfg.arena) q(".cg-arena-readout").textContent = `${CLASSES[cfg.grade].label} only · Challenge level ${arenaSession.rating} · Practice fit ${arenaPick.rating} · No speed points`;
      q("#cgPrompt").textContent = task.prompt;
      setFeedback("Take your time. There is no timer.", "");
      explainer.reset();
      q('[data-cg="check"]').hidden = false; q('[data-cg="next"]').hidden = true; q('[data-cg="help"]').disabled = false;
      const answerNumbers = new Set(numbersIn(task.kind === "choice" ? task.options.find((o) => o.id === task.answer).label : task.kind === "number" ? task.answer : task.kind === "line" ? String(task.answer) : ""));
      api.setHint(() => ({ text: task.hint, facts: { game: `${cfg.title}: ${SKILL_NAMES[task.skill] || "math practice"}. Help the child think about the idea; do not state the answer.`, goal: task.prompt, moves: moves.length ? moves : ["The child is looking at the question."], allowed: [...new Set(numbersIn(task.prompt))].filter((n) => !answerNumbers.has(n)).slice(0, 12) } }));
      draw();
      q("#cgPrompt").focus({ preventScroll: true });
    }
    function setFeedback(text, tone) { const f = q("#cgFeedback"); f.textContent = text; f.className = `trail-feedback ${tone}`; }

    function draw() {
      const focused = document.activeElement?.id;
      const t = task, r = response;
      const play = window.MQClassPlay.render(t, r, playUI);
      let html = t.kind === "build" ? `<div class="cg-live">${A.live(t, r.values)}</div>` : A.visual(t.visual);
      if (play !== null) { html = play; } else if (t.kind === "scene") {
        const selected = new Set(r.selected), count = t.fixed + selected.size;
        const size = t.mode === "coordinate" ? t.columns : null;
        const indexes = Array.from({ length: t.size }, (_, i) => i);
        if (size) indexes.sort((a, b) => Math.floor(b / size) - Math.floor(a / size) || a % size - b % size);
        const fixed = t.fixed ? `<div class="scene-fixed" aria-label="${t.fixed} already placed">${Array.from({ length: t.fixed }, () => `<span>${t.emoji}</span>`).join("")}</div>` : "";
        // A coordinate grid shows rulers, not answers: the squares are blank, so the child counts from the
        // depot instead of hunting for a printed pair. Only the depot square is marked.
        const at = (i) => [i % size, Math.floor(i / size)];
        const axis = size ? `<div class="scene-yaxis" aria-hidden="true">${Array.from({ length: size }, (_, k) => `<span>${size - 1 - k}</span>`).join("")}</div>` : "";
        const foot = size ? `<span></span><div class="scene-xaxis" aria-hidden="true">${Array.from({ length: size }, (_, k) => `<span>${k}</span>`).join("")}</div>` : "";
        const tiles = `<div class="scene-tiles" style="--cols:${t.columns}" role="group" aria-label="${size ? "Coordinate grid" : "Touch objects to build your answer"}">
          ${indexes.map((i) => { const [cx, cy] = size ? at(i) : [];
            const home = size && t.origin && t.origin.x === cx && t.origin.y === cy;
            return `<button type="button" id="cg-scene-${i}" data-cg="scene" data-i="${i}" aria-pressed="${selected.has(i)}" class="${home ? "scene-home" : ""}" aria-label="${size ? `${cx} across, ${cy} up${home ? ", the depot" : ""}` : `${t.mode === "array" ? `Row ${Math.floor(i / t.columns) + 1}, ` : ""}space ${i + 1}`}">${selected.has(i) ? t.emoji : home ? t.origin.emoji : size ? "" : t.mode === "collect" ? t.emoji : "·"}${selected.has(i) ? '<i aria-hidden="true">✓</i>' : ""}</button>`; }).join("")}</div>`;
        html = `<div class="cg-scene scene-${t.mode}">${t.mode === "balance" ? `<div class="scene-scale" style="--tilt:${Math.max(-9,Math.min(9,(count-t.target)*2))}deg"><span>${t.target} stones</span><b>⚖</b><span>${count} stones</span></div>` : t.mode === "coordinate" ? '<p class="scene-directions">↑ y · up &nbsp; &nbsp; x · across →</p>' : ""}
          ${fixed}${size ? `<div class="scene-plane">${axis}${tiles}${foot}</div>` : tiles}
          <p class="scene-count" aria-live="polite">${size ? r.selected.length ? `Delivery at (${at(r.selected[0])[0]}, ${at(r.selected[0])[1]})` : "Touch the square where the drop point is." : t.mode === "fraction" ? `${count} of ${t.parts} panes glowing` : `${count} ${t.mode === "collect" ? "in the basket" : "placed"}`}</p></div>`;
      } else if (t.kind === "choice") {
        html += `<div class="cg-options ${t.options.some((o) => o.visual) ? "with-art" : ""}" role="group" aria-label="Choices">${t.options.map((o) => `<button type="button" id="cg-opt-${o.id}" data-cg="choose" data-id="${o.id}" aria-pressed="${r.id === o.id}">${A.mini(o.visual)}<span>${esc(o.label)}</span></button>`).join("")}</div>`;
      } else if (t.kind === "number") {
        const keys = [...KEYS.int.slice(0, 9), ...(t.format === "int" ? [] : KEYS[t.format].filter((k) => k !== "0")), "0", "back"];
        html += `<div class="cg-answer"><label for="cgInput">Your answer</label><span><input id="cgInput" autocomplete="off" inputmode="${t.format === "int" ? "numeric" : t.format === "decimal" ? "decimal" : "text"}" value="${esc(r.text)}">${t.unit ? `<b>${esc(t.unit)}</b>` : ""}</span></div><div class="cg-keypad" role="group" aria-label="Number keys">${keys.map((k) => `<button type="button" id="cg-key-${k === "." ? "dot" : k === "/" ? "slash" : k === ":" ? "colon" : k === "$" ? "dollar" : k === "(" ? "open" : k === ")" ? "close" : k === "," ? "comma" : k}" data-cg="key" data-k="${esc(k)}" aria-label="${k === "back" ? "Delete" : k === "space" ? "Space" : esc(k)}">${esc(KEY_LABEL[k] || k)}</button>`).join("")}</div>`;
      } else if (t.kind === "line") {
        html += `<div class="cg-line-wrap"><div class="cg-line" style="--ticks:${t.ticks + 1}">${Array.from({ length: t.ticks + 1 }, (_, i) => {
          const value = tickValue(t, i), label = t.labels.find((l) => Math.abs(l.at - value) < 1e-9), mark = (t.marks || []).find((m) => Math.abs(m.at - value) < 1e-9), on = Math.abs(r.value - value) < 1e-9;
          return `<button type="button" id="cg-tick-${i}" data-cg="tick" data-i="${i}" aria-pressed="${on}" aria-label="${label ? `Tick at ${esc(label.text)}` : `Tick ${i} of ${t.ticks}`}">${mark ? `<em>${esc(mark.text)}</em>` : ""}<i aria-hidden="true">${on ? "📍" : ""}</i><b>${label ? esc(label.text) : ""}</b></button>`;
        }).join("")}</div></div>`;
      } else if (t.kind === "sort") {
        html += `<div class="cg-sort">${t.items.map((item) => `<div class="cg-sortitem"><span class="cg-card">${A.mini(item.visual)}<span>${esc(item.label)}</span></span><span class="cg-bins" role="group" aria-label="Where does ${esc(item.label)} go?">${t.bins.map((b) => `<button type="button" id="cg-bin-${item.id}-${b.id}" data-cg="bin" data-item="${item.id}" data-bin="${b.id}" aria-pressed="${r.placements[item.id] === b.id}">${r.placements[item.id] === b.id ? "✓ " : ""}${esc(b.label)}</button>`).join("")}</span></div>`).join("")}</div>`;
      } else if (t.kind === "build") {
        html += `<div class="cg-dials">${t.dials.map((d) => `<div class="cg-dial"><span id="cg-label-${d.id}">${esc(d.label)}</span><div><button type="button" id="cg-dial-${d.id}-down" data-cg="dial" data-id="${d.id}" data-dir="-1" aria-label="Less: ${esc(d.label)}" ${r.values[d.id] <= d.min ? "disabled" : ""}>−</button><output aria-labelledby="cg-label-${d.id}" aria-live="polite">${r.values[d.id]}</output><button type="button" id="cg-dial-${d.id}-up" data-cg="dial" data-id="${d.id}" data-dir="1" aria-label="More: ${esc(d.label)}" ${r.values[d.id] >= d.max ? "disabled" : ""}>+</button></div></div>`).join("")}</div>`;
      } else if (t.kind === "order") {
        const byId = Object.fromEntries(t.items.map((i) => [i.id, i]));
        html += `<p class="cg-order-end">${esc(t.first)} ↑</p><ol class="cg-order">${r.ids.map((id, i) => `<li><span class="cg-card">${A.mini(byId[id].visual)}<span>${esc(byId[id].label)}</span></span><span><button type="button" id="cg-up-${id}" data-cg="up" data-id="${id}" aria-label="Move ${esc(byId[id].label)} up" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" id="cg-down-${id}" data-cg="down" data-id="${id}" aria-label="Move ${esc(byId[id].label)} down" ${i === r.ids.length - 1 ? "disabled" : ""}>↓</button></span></li>`).join("")}</ol><p class="cg-order-end">↓ ${esc(t.last)}</p>`;
      }
      q("#cgBoard").innerHTML = html;
      if (solved) q("#cgBoard").querySelectorAll("button, input").forEach((el) => { el.disabled = true; });
      if (focused && document.getElementById(focused) && stage.contains(document.getElementById(focused))) document.getElementById(focused).focus({ preventScroll: true });
    }

    function showMe() {
      if (solved) return;
      helped = true; checkpoint();
      response = structuredClone(correctResponse(task));
      setFeedback(`✦ Here is one way: ${task.explain} Press Check when you are ready.`, "supportive");
      move("Asked to be shown how.");
      api.sfx.hoot(); draw();
    }
    function check() {
      if (solved) return;
      if (!started(task, response)) { setFeedback(task.kind === "sort" ? "Choose a group for every card first." : "Choose or type an answer first.", "supportive"); return; }
      const correct = checkTask(task, response);
      if (cfg.arena && !arenaRecorded) {
        arenaRecorded = true; arenaSession = recordClassArena(arenaSession, arenaPick.chapter, arenaPick.rating, correct);
        try { sessionStorage.setItem(arenaKey, JSON.stringify(arenaSession)); } catch { /* private browsing */ }
      }
      const support = helped || api.hintsUsed() > hintsBefore || attempt > 1;
      // A look-ahead question reaches one grade past this child, but it carries the skill id of the
      // current-grade question it replaced — so recording it would file next year's work under this
      // year's skill and quietly drag down a grown-up's report. It still counts inside the run; it just
      // never becomes evidence about a skill.
      if (!stretch) S.update((s) => { s.classWork = recordClassWork(restoreClassWork(s.classWork), task.skill, correct, !support); });
      move(`Checked an answer: ${correct ? "correct" : "not yet"}.`);
      if (!correct) {
        attempt += 1; api.emit("miss"); api.sfx.wrong();
        helped = true; checkpoint();
        if (cfg.arena) { q(".cg-mascot").textContent = "☁️"; q(".cg-story-beat").textContent = "A little muddle! Repair your model. Hoot can help you find a first step."; }
        if (attempt >= 3) stage.classList.add("cg-scaffold");
        setFeedback(`✗ Not yet. ${task.hint}`, "supportive");
        return;
      }
      solved = true;
      if (!support) independent += 1;
      setFeedback(`✓ You got it! ${task.explain}`, "discovered");
      api.emit("solved", { afterMistake: attempt > 1 }); api.sfx.good();
      const c = api.center(q(".cg-mascot")); api.addCoins(2, c); api.burst(c.x, c.y, { count: 10, chars: ["✦", cfg.emoji], spread: 70 });
      const stop = q(`[data-stop="${round}"]`); stop.classList.add("found"); stop.textContent = "✓";
      q(".trail-progress").setAttribute("aria-valuenow", String(round + 1));
      q('[data-cg="check"]').hidden = true; q('[data-cg="help"]').disabled = true;
      // "You wanna know how?" opens only now: the question is marked, the coins are paid and the learner
      // model is written, so nothing the explainer says can change what the child earned. A child who
      // guessed right can ask how it works without the asking costing them anything.
      explainer.offer({
        grade: cfg.grade, skill: SKILL_NAMES[task.skill] || cfg.title,
        question: task.prompt, answer: answerText(), given: givenText(),
        firstTry: attempt === 1 && !helped, board: boardText(),
      });
      const next = q('[data-cg="next"]'); next.hidden = false; next.textContent = round === ROUNDS - 1 ? "Finish ✦" : "Next mission →";
      round += 1; checkpoint(true); round -= 1;
      draw(); next.focus({ preventScroll: true });
    }
    function finish() {
      if (cfg.chapter || cfg.apex) S.update((s) => { const runs = { ...(s.classRuns || {}) }; delete runs[cfg.id]; s.classRuns = runs; });
      const stars = independent >= 4 ? 3 : independent >= 2 ? 2 : 1;
      // Apex finishes through its own path: the quest is recorded, the treasure is decided, and any gem
      // is revealed before the result card so the card can name what was found (runtime/apex.js).
      if (cfg.apex) return window.MQApex.finishQuest(api, cfg.apex, independent);
      api.finish(cfg.chapter
        ? { stars, emoji: cfg.emoji, title: `${cfg.title}: done!`, note: `You earned ${cfg.chapter.reward.toLowerCase()}. ${independent} of ${ROUNDS} answers were right on the first try without help. Help and second tries count as learning too.` }
        : { stars, emoji: cfg.emoji, title: `${cfg.title}: five discoveries!`, note: `${independent} of ${ROUNDS} right on the first try without help. Come back for fresh questions.` });
    }

    stage.addEventListener("click", (e) => {
      const gameButton = e.target.closest("[data-play]");
      if (gameButton && !solved && !gameButton.disabled && api.alive()) {
        window.MQClassPlay.act(task, response, playUI, gameButton);
        move(`Played ${gameButton.dataset.play}: ${gameButton.textContent.trim().slice(0,120)}`); api.sfx.tap(); draw(); return;
      }
      const b = e.target.closest("[data-cg]");
      if (!b || b.disabled || !api.alive()) return;
      const act = b.dataset.cg;
      if (act === "next") { if (!solved) return; round += 1; if (round >= ROUNDS) finish(); else begin(); return; }
      if (solved) return;
      if (act === "check") return check();
      if (act === "help") return showMe();
      const r = response, t = task;
      if (act === "scene") {
        const index = Number(b.dataset.i);
        r.selected = t.mode === "coordinate" ? [index] : r.selected.includes(index) ? r.selected.filter((n) => n !== index) : [...r.selected, index];
      } else if (act === "choose") r.id = b.dataset.id;
      else if (act === "key") {
        const k = b.dataset.k;
        r.text = k === "back" ? r.text.slice(0, -1) : (r.text + (k === "space" ? " " : k === "R" ? " R " : k)).replace(/ {2,}/g, " ").slice(0, 24);
      } else if (act === "tick") r.value = tickValue(t, Number(b.dataset.i));
      else if (act === "bin") r.placements[b.dataset.item] = b.dataset.bin;
      else if (act === "dial") {
        const d = t.dials.find((x) => x.id === b.dataset.id);
        r.values[d.id] = Math.max(d.min, Math.min(d.max, r.values[d.id] + Number(b.dataset.dir) * d.step));
      } else if (act === "up" || act === "down") {
        const i = r.ids.indexOf(b.dataset.id), j = act === "up" ? i - 1 : i + 1;
        if (j >= 0 && j < r.ids.length) [r.ids[i], r.ids[j]] = [r.ids[j], r.ids[i]];
      }
      move(`${act}${b.dataset.id ? ` ${b.dataset.id}` : ""}${b.dataset.k ? ` ${b.dataset.k}` : ""}`);
      api.sfx.tap(); draw();
    }, { signal: lifecycle.signal });
    stage.addEventListener("input", (e) => { if (e.target.id === "cgInput" && !solved) response.text = e.target.value.slice(0, 24); }, { signal: lifecycle.signal });
    stage.addEventListener("keydown", (e) => { if (e.target.id === "cgInput" && e.key === "Enter") { e.preventDefault(); check(); } }, { signal: lifecycle.signal });
    api.companion.watch(() => task && {
      sees: `${SKILL_NAMES[task.skill] || cfg.title} · question ${round + 1} of ${ROUNDS}${solved ? " · solved" : attempt > 1 ? ` · try ${attempt}` : ""}`,
      nudge: attempt > 1 ? "What could you check again before you try once more?" : NUDGE[task.kind] || "What changed in your world?",
      key: `${cfg.id}:${seed}:${round}`, goal: task.prompt,
      board: JSON.stringify({ world: task.world, constructed: task.kind === "world" ? replayWorld(task.world, response.moves) : undefined, picture: task.visual || null, mode: task.mode || task.live?.type || task.kind, options: task.options?.map((o) => o.label), dials: task.dials, fixed: task.fixed, rows: task.rows, columns: task.columns }),
      response: JSON.stringify(response).slice(0,700), moves: [...moves], solved, ref,
      protect: task.kind === "number" ? [task.answer] : task.kind === "choice" ? [task.options.find((o) => o.id === task.answer)?.label || ""] : task.kind === "line" ? [String(task.answer)] : task.kind === "scene" ? [String(task.target - task.fixed)] : [],
      onHelp: () => { helped = true; checkpoint(); },
    });
    stage.addEventListener("dragstart", (e) => { const b = e.target.closest("[data-play=card]"); if (b && !solved) { playUI.card = b.dataset.id; e.dataTransfer.setData("text/plain", b.dataset.id); } }, { signal: lifecycle.signal });
    stage.addEventListener("dragover", (e) => { if (e.target.closest("[data-drop]")) e.preventDefault(); }, { signal: lifecycle.signal });
    stage.addEventListener("drop", (e) => { const bay = e.target.closest("[data-drop]"); if (!bay || task.kind !== "sort" || solved) return; e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (!task.items.some(i => i.id === id)) return; response.placements[id] = bay.dataset.drop; playUI.card = null; move("Moved a parcel into " + bay.dataset.drop); draw(); }, { signal: lifecycle.signal });
    begin();
    return () => { lifecycle.abort(); window.speechSynthesis?.cancel(); };
  }

  window.MQClassGames = { mount };

  const play = (pages, label, kicker) => window.MQVoyageStory.play(pages.map((p) => ({ ...p, art: "class" })), label, { kicker });
  for (const info of CLASS_LIST) {
    MQ.register({ id: `arena-${info.id}`, name: ARENA_NAMES[info.id].title, grade: info.id, emoji: "👾", pathway: true, stageClass: "trail-stage class-stage", resultKicker: `${info.label.toUpperCase()} · ARENA`, mount: (stage, api) => mount(stage, api, { id: `arena-${info.id}`, grade: info.id, title: ARENA_NAMES[info.id].title, emoji: "👾", kicker: `${info.label} · Restore five lanterns`, arena: true }) });
    for (const ch of info.chapters) {
      if (ch.kind !== "engine") continue;
      const kicker = `${info.label.toUpperCase()} · CHAPTER ${ch.slot}`;
      MQ.register({
        id: ch.id, name: ch.title, emoji: ch.emoji, grade: info.id, pathway: true, campaign: true, chapterNumber: ch.slot, stageClass: "trail-stage class-stage", resultKicker: kicker,
        canOpen: () => !window.MQClasses || window.MQClasses.canOpen(ch.id),
        intro: () => play(ch.intro, "Start the chapter →", kicker),
        outro: async () => { await play(ch.outro, "Play the bonus game →", kicker); await window.MQMini.play(BONUS_BY_SLOT[ch.slot - 1], { fromStory: true }); },
        mount: (stage, api) => mount(stage, api, { id: ch.id, grade: info.id, title: ch.title, emoji: ch.emoji, kicker: `${info.label} · Chapter ${ch.slot} · ${ch.place}`, chapter: ch }),
      });
    }
    for (const p of info.practice) {
      const base = { id: p.id, name: p.title, emoji: p.emoji, grade: info.id, pathway: true, resultKicker: `PRACTICE · ${info.label.toUpperCase()}`, resultLabel: "Back to practice" };
      if (p.kind === "trail") MQ.register({ ...base, stageClass: "trail-stage", mount: (stage, api) => window.MQPath.mountTrail(stage, api, p.trail, { band: p.band }) });
      else MQ.register({ ...base, stageClass: "trail-stage class-stage", mount: (stage, api) => mount(stage, api, { id: p.id, grade: info.id, title: p.title, emoji: p.emoji, kicker: `${info.label} · Practice`, sources: p.sources }) });
    }
    const ex = info.expedition;
    MQ.register({ id: ex.id, name: ex.title, emoji: "🧭", grade: info.id, pathway: true, resultKicker: `PRACTICE · ${info.label.toUpperCase()}`, resultLabel: "Back to practice", stageClass: "trail-stage class-stage", mount: (stage, api) => mount(stage, api, { id: ex.id, grade: info.id, title: ex.title, emoji: "🧭", kicker: `${info.label} · Mixed practice`, sources: ex.sources }) });
  }
})();
