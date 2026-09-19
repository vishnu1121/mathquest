// The learning atlas: seven hands-on trails and a mixed-practice expedition.
import { TRAILS, CONCEPT_IDS, restoreCurriculum, recordPractice, practiceStatus, recommendTrail, generateTrailPuzzle, checkTrailAnswer, blankAnswer, expeditionRoute } from "../curriculum";
import { createRng } from "../../engine/rng";

(function () {
  const S = window.MQS, MQ = window.MQ;
  const $ = (id) => document.getElementById(id);
  const model = () => restoreCurriculum(S.get().curriculum);
  const save = (next) => S.update((s) => { s.curriculum = next; });
  const trail = (id) => TRAILS.find((t) => t.id === id);
  const bandName = (n) => ["", "First discoveries", "Growing ideas", "New connections"][n];
  const shapes = ["●", "▲", "◆"];
  const shapeNames = ["Circle", "Triangle", "Diamond"];
  const open = (id) => MQ.openLevel(MQ.levels.find((l) => l.id === id));

  // Tiny source-drawn scenes give each destination a recognizable silhouette.
  function preview(id) {
    const scenes = {
      subtraction: '<path d="M35 83Q82 6 149 68" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 5"/><path d="m89 16 6 13 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z" fill="currentColor"/><circle cx="39" cy="74" r="12" fill="currentColor" opacity=".35"/><circle cx="149" cy="68" r="7" fill="currentColor" opacity=".5"/>',
      multiplication: Array.from({ length: 12 }, (_, i) => `<path d="M${44 + i % 4 * 28} ${34 + Math.floor(i / 4) * 24}v14" stroke="currentColor" stroke-width="2"/><circle cx="${44 + i % 4 * 28}" cy="${31 + Math.floor(i / 4) * 24}" r="8" fill="currentColor" opacity="${.55 + i % 3 * .2}"/>`).join(""),
      division: [0, 1, 2].map((i) => `<path d="M${24 + i * 53} 59h44q-2 31-22 31t-22-31" fill="currentColor" opacity=".35"/><circle cx="${37 + i * 53}" cy="49" r="7" fill="currentColor"/><circle cx="${54 + i * 53}" cy="47" r="7" fill="currentColor"/>`).join(""),
      fractions: '<circle cx="91" cy="57" r="39" fill="currentColor" opacity=".22"/><path d="M91 57V18a39 39 0 0 1 39 39z" fill="currentColor"/><path d="M91 18v78M52 57h78" stroke="currentColor" stroke-width="3"/><circle cx="105" cy="39" r="4" fill="#fff9e6"/>',
      patterns: [0, 1, 2, 3].map((i) => `<rect x="${16 + i * 43}" y="43" width="35" height="34" rx="9" fill="currentColor" opacity="${i === 3 ? .15 : .5 + i * .2}"/><circle cx="${23 + i * 43}" cy="84" r="5" fill="currentColor"/><circle cx="${45 + i * 43}" cy="84" r="5" fill="currentColor"/>`).join(""),
      measurement: '<path d="M35 70V33h93v37" fill="none" stroke="currentColor" stroke-width="7"/><rect x="20" y="76" width="148" height="22" rx="5" fill="currentColor" opacity=".5"/>' + Array.from({ length: 12 }, (_, i) => `<path d="M${30 + i * 11} 77v${i % 2 ? 7 : 12}" stroke="#fff9e6" stroke-width="2"/>`).join(""),
      geometry: '<path d="m95 15 51 37-20 58H64L44 52z" fill="currentColor" fill-opacity=".13" stroke="currentColor" stroke-width="3"/>' + [[95, 15], [146, 52], [126, 110], [64, 110], [44, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="currentColor"/>`).join(""),
    };
    return `<svg class="atlas-art" viewBox="0 0 190 124" aria-hidden="true">${scenes[id] || scenes.multiplication}</svg>`;
  }

  // Practice for the current class: six trails made for that grade, the class island and a mystery expedition.
  function renderClassAtlas(box) {
    const info = window.MQClasses.current(), s = S.get();
    const items = info.practice.map((p, i) => ({ ...p, done: Boolean(s.chapters[p.id]), color: p.kind === "trail" ? trail(p.trail).color : TRAILS[(i + 2) % TRAILS.length].color }));
    const next = items.find((p) => !p.done) || items[0];
    const explored = items.filter((p) => p.done).length + (s.chapters[info.expedition.id] ? 1 : 0);
    const storyDone = info.chapters.filter((c) => s.chapters[c.id]).length;
    $("worldTitle").textContent = `${info.label} practice`;
    $("worldIntro").textContent = "Short visits with fresh questions. Pick any trail.";
    const art = (p) => (p.kind === "trail" ? preview(p.trail) : `<span class="atlas-art atlas-class-art" aria-hidden="true">${p.emoji}</span>`);
    box.innerHTML = `<div class="atlas-welcome"><div><p class="eyebrow">${info.label.toUpperCase()} · ${info.island.toUpperCase()}</p><h2 id="atlasTitle">Where will your practice go today?</h2><p>Six trails and a mystery expedition, all made for ${info.label}.</p></div><div class="atlas-passport" aria-label="${explored} of 7 practice trails explored"><span aria-hidden="true">✦</span><b>${explored}<small> / 7</small></b><span>trails explored</span></div></div>
      <div class="atlas-next"><span class="atlas-owl" aria-hidden="true">${window.MQArt.owl}</span><div><span class="eyebrow">HOOT’S NEXT STOP FOR YOU</span><h3>${next.title}</h3><p>${next.description} You can explore any trail below.</p></div><button type="button" class="btn" data-trail="${next.id}">Let’s practice <span aria-hidden="true">→</span></button></div>
      <div class="atlas-grid"><button type="button" class="atlas-card atlas-forest" data-island><span class="atlas-subject">Story island</span><span class="atlas-forest-art" aria-hidden="true">${info.emoji}<i>✦</i>🏮</span><strong>${info.island}</strong><span class="atlas-description">Eight story chapters made for ${info.label}.</span><span class="atlas-card-bottom">${storyDone} / 8 chapters<b aria-hidden="true">↗</b></span></button>
      ${items.map((p) => `<button type="button" class="atlas-card atlas-${p.color}" data-trail="${p.id}"><span class="atlas-subject">${p.kind === "trail" ? trail(p.trail).subject : "Practice"}</span>${art(p)}<strong>${p.title}</strong><span class="atlas-description">${p.description}</span><span class="atlas-card-bottom">${p.done ? "✓ Explored · play again" : "Not explored yet"}<b aria-hidden="true">↗</b></span></button>`).join("")}</div>
      <div class="atlas-bonuses"><button type="button" class="expedition-card" data-trail="${info.expedition.id}"><span class="expedition-mark" aria-hidden="true">✳</span><span><span class="eyebrow">THE SURPRISE ROUTE</span><strong>Mystery expedition</strong><span>Five questions from different ${info.label} chapters. Revisit an idea and meet a new one.</span></span><b aria-hidden="true">→</b></button></div>`;
    box.querySelectorAll("[data-trail]").forEach((button) => button.addEventListener("click", () => open(button.dataset.trail)));
    box.querySelector("[data-island]").onclick = () => { window.MQWorld.setView("explore"); window.MQWorld.enterPlace(window.MQClasses.nextChapter()); };
  }

  function renderAtlas() {
    if (!$("mapScreen") || !document.querySelector(".journey-layout")) return;
    let box = $("learningAtlas");
    if (!box) {
      box = document.createElement("section"); box.id = "learningAtlas"; box.className = "learning-atlas";
      box.setAttribute("aria-labelledby", "atlasTitle");
      document.querySelector(".journey-layout").before(box);
    }
    if (window.MQClasses?.grade()) return renderClassAtlas(box);
    const m = model(), next = trail(recommendTrail(m));
    const collected = TRAILS.filter((t) => m.trails[t.id].completed > 0);
    const totalDiscovered = collected.length + (S.get().chapters.guardian ? 1 : 0);
    $("worldTitle").textContent = "Your learning atlas";
    $("worldIntro").textContent = "Follow a trail. Take a detour. Find a new way to think.";
    box.innerHTML = `<div class="atlas-welcome"><div><p class="eyebrow">A BIGGER WORLD OF LITTLE DISCOVERIES</p><h2 id="atlasTitle">Where will your curiosity go?</h2><p>Eight math trails. Ten games. So many ways to say “I figured it out.”</p></div><div class="atlas-passport" aria-label="${totalDiscovered} of 8 trails explored"><span aria-hidden="true">✦</span><b>${totalDiscovered}<small> / 8</small></b><span>trails explored</span></div></div>
      <div class="atlas-next"><span class="atlas-owl" aria-hidden="true">${window.MQArt.owl}</span><div><span class="eyebrow">HOOT’S NEXT STOP FOR YOU</span><h3>${next.name} <span>· ${next.subject}</span></h3><p>${m.trails[next.id].attempts ? "A little practice to help this idea settle. " : "Start with something you can see and build. "}You can explore any trail below.</p></div><button type="button" class="btn" data-trail="${next.id}">Let’s discover <span aria-hidden="true">→</span></button></div>
      <div class="atlas-grid"><button type="button" class="atlas-card atlas-forest" data-addition><span class="atlas-subject">01 / Addition</span><span class="atlas-forest-art" aria-hidden="true">🌳<i>✦</i>🏮</span><strong>The Lantern Forest</strong><span class="atlas-description">Hop, connect, and cast number spells across the original three-chapter story.</span><span class="atlas-card-bottom">${S.get().chapters.guardian ? "✓ Lantern Keeper" : "Begin the story"}<b aria-hidden="true">↗</b></span></button>
      ${TRAILS.map((t, i) => `<button type="button" class="atlas-card atlas-${t.color}" data-trail="${t.id}"><span class="atlas-subject">${String(i + 2).padStart(2, "0")} / ${t.subject}</span>${preview(t.id)}<strong>${t.name}</strong><span class="atlas-description">${t.description}</span><span class="atlas-builds">Builds on: ${t.builds}</span><span class="atlas-card-bottom">${m.trails[t.id].completed ? "✓ " : ""}${practiceStatus(m.trails[t.id])}<b aria-hidden="true">↗</b></span></button>`).join("")}</div>
      <div class="atlas-bonuses"><button type="button" class="expedition-card" data-trail="expedition"><span class="expedition-mark" aria-hidden="true">✳</span><span><span class="eyebrow">THE SURPRISE ROUTE</span><strong>Mystery expedition</strong><span>Five discoveries, different trails. Revisit an idea and meet a new one.</span></span><b aria-hidden="true">→</b></button><details class="souvenir-book"><summary><span aria-hidden="true">▤</span> My explorer’s pocket <b>${collected.length} / 7</b></summary><p>A keepsake from each trail. Take your time collecting them.</p><div>${TRAILS.map((t) => `<span class="souvenir ${m.trails[t.id].completed ? "collected" : ""}"><i aria-hidden="true">${t.icon}</i><b>${t.souvenir}</b><small>${m.trails[t.id].completed ? "Discovered!" : `Waiting in ${t.name}`}</small></span>`).join("")}</div></details></div>`;
    box.querySelectorAll("[data-trail]").forEach((button) => button.addEventListener("click", () => open(button.dataset.trail)));
    box.querySelector("[data-addition]").onclick = () => {
      if (window.MQWorld) {
        window.MQWorld.setView("explore");
        window.MQWorld.enterPlace(["frog", "fireflies", "guardian"].find((id) => !S.get().chapters[id]) || "guardian");
        return;
      }
      document.querySelector(".journey-layout").scrollIntoView({ behavior: S.get().calm || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      $("ctaPlay").focus({ preventScroll: true });
    };
  }

  const baseSummary = window.MQLearning.summary;
  window.MQLearning.summary = () => [...baseSummary(), ...TRAILS.map((t) => {
    const s = model().trails[t.id];
    return { id: t.id, name: t.subject, evidence: s.attempts, independent: s.recent.filter((r) => r.independent).length, supported: s.recent.filter((r) => r.correct && !r.independent).length, recent: s.recent.length, status: practiceStatus(s), next: `${bandName(s.level)} in ${t.name}` };
  })];

  // A class can hold a trail near its own band: one band gentler at most, never above it.
  function mountTrail(stage, api, id, { band } = {}) {
    const lifecycle = new AbortController();
    let explainer = null;
    let m = model();
    const seed = Math.floor(Math.random() * 0xffffffff), rng = createRng(seed);
    const route = id === "expedition" ? expeditionRoute(m, seed) : Array(5).fill(id);
    const visited = [...new Set(route)];
    visited.forEach((concept) => { m.trails[concept].visits += 1; }); save(m);
    let round = 0, puzzle, answer, attempt = 1, helped = false, solved = false, hintsBefore = api.hintsUsed(), independent = 0;
    const history = [], moves = [];
    const move = (text) => { moves.push(text); if (moves.length > 6) moves.shift(); };
    const q = (selector) => stage.querySelector(selector);
    stage.classList.add("trail-stage");
    stage.innerHTML = `<div class="trail-workspace"><header class="trail-header"><div><p class="eyebrow" id="trailSubject"></p><h1 id="trailTitle"></h1></div><span class="trail-band" id="trailBand"></span></header><div class="trail-progress" role="progressbar" aria-label="Discoveries in this visit" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${Array.from({ length: 5 }, (_, i) => `<span data-stop="${i}">${i + 1}</span>`).join("")}</div><div class="trail-task"><span id="trailMascot" aria-hidden="true"></span><div><p class="eyebrow" id="trailRound"></p><h2 id="trailPrompt" tabindex="-1"></h2></div></div><div class="trail-board" id="trailBoard"></div><div class="trail-feedback" id="trailFeedback" role="status" aria-live="polite"></div><div class="cg-how-host" id="trailHow"></div><div class="trail-actions"><button type="button" class="trail-help" data-action="help">✦ Show me a step</button><button type="button" class="btn" data-action="check">Check my discovery →</button><button type="button" class="btn" data-action="next" hidden>Next discovery →</button></div><div class="trail-bottom"><span id="trailFlavor"></span><button type="button" data-action="gentler">Try gentler numbers</button></div></div>`;
    /** The shared "You wanna know how?" control; see runtime/explain-ui.js. */
    explainer = window.MQExplain.create({ actions: stage.querySelector(".trail-actions"), panel: stage.querySelector("#trailHow"), signal: lifecycle.signal });

    function begin(levelOverride) {
      const concept = route[round], t = trail(concept);
      m = model();
      const level = levelOverride || (band ? Math.min(band, Math.max(m.trails[concept].level, band - 1, 1)) : m.trails[concept].level);
      for (let i = 0; i < 30; i++) {
        puzzle = generateTrailPuzzle(concept, level, round, rng);
        if (!m.trails[concept].lastKeys.includes(puzzle.key)) break;
      }
      m.trails[concept].lastKeys = [...m.trails[concept].lastKeys, puzzle.key].slice(-12); save(m);
      explainer.reset();
      answer = blankAnswer(); answer.bowls = Array(puzzle.a).fill(0);
      if (concept === "multiplication") { if (puzzle.mode === "columns") answer.rows = puzzle.a; else answer.columns = puzzle.b; }
      attempt = 1; helped = false; solved = false; hintsBefore = api.hintsUsed(); moves.length = 0;
      stage.dataset.trail = concept; stage.dataset.color = t.color;
      q("#trailSubject").textContent = `${id === "expedition" ? "MYSTERY EXPEDITION · " : ""}${t.subject.toUpperCase()}`;
      q("#trailTitle").textContent = t.name; q("#trailBand").textContent = bandName(level);
      q("#trailMascot").textContent = t.icon; q("#trailRound").textContent = `DISCOVERY ${round + 1} OF 5`;
      q("#trailPrompt").textContent = puzzle.prompt; q("#trailFlavor").textContent = puzzle.flavor;
      q("#trailFeedback").textContent = "Build it, change it, try an idea. There’s no timer.";
      q("#trailFeedback").className = "trail-feedback";
      q('[data-action="check"]').hidden = false; q('[data-action="next"]').hidden = true;
      q('[data-action="help"]').disabled = false;
      q('[data-action="gentler"]').textContent = level > 1 ? "Try gentler numbers" : "Try a different puzzle";
      api.setHint(() => ({ text: puzzle.hint, facts: { game: `${t.name}: hands-on ${t.subject.toLowerCase()}. Explain the model; do not state the answer.`, goal: puzzle.prompt, moves: moves.length ? moves : ["The child is looking at the puzzle."], allowed: [...new Set([puzzle.a, puzzle.b, puzzle.parts, 0, 1, 2])].filter((n) => n !== puzzle.target) } }));
      renderBoard();
      q("#trailPrompt").focus({ preventScroll: true });
    }
    const btn = (label, act, n, text, extra = "") => `<button type="button" id="trail-${act}-${n}" data-action="${act}" data-n="${n}" aria-label="${label}" ${extra}>${text}</button>`;
    function dial(label, unit = "") {
      return `<div class="number-dial"><label for="trailValue">${label}</label><div>${btn("Decrease answer", "value", -1, "−")}<input id="trailValue" type="number" min="0" max="99" step="1" inputmode="numeric" value="${answer.value}" aria-label="${label}"><span>${unit}</span>${btn("Increase answer", "value", 1, "+")}${btn("Add five", "value", 5, "+5")}</div></div>`;
    }
    function renderBoard() {
      const focused = document.activeElement?.id;
      const p = puzzle, a = answer;
      let html = "";
      if (p.concept === "subtraction") {
        html = `<div class="star-station"><div class="station-orbit" aria-hidden="true">✦<span>☾</span>✧</div><div class="star-grid">${Array.from({ length: p.a }, (_, i) => btn(`Star ${i + 1}${a.picks.includes(i) ? ", sent home" : ", at the station"}`, "pick", i, `<span aria-hidden="true">${a.picks.includes(i) ? "✧" : "★"}</span>`, `aria-pressed="${a.picks.includes(i)}" class="station-star ${a.picks.includes(i) ? "sent" : ""}"`)).join("")}</div><p class="model-caption">${a.picks.length} sent home · tap again to bring one back</p></div>${p.mode === "send" ? dial("Stars that stay") : ""}`;
      } else if (p.concept === "multiplication") {
        html = `<div class="garden-sign">ORDER <b>${p.target} moonflowers</b></div><div class="garden-array" role="img" aria-label="${a.rows} rows with ${a.columns} flowers in each row">${Array.from({ length: a.rows }, () => `<div class="garden-row">${Array.from({ length: a.columns }, () => '<span aria-hidden="true">✿</span>').join("")}</div>`).join("")}</div><div class="garden-controls"><div><span>Equal rows</span>${btn("Remove a row", "rows", -1, "−", p.mode === "columns" ? "disabled" : "")}<output>${a.rows}</output>${btn("Add a row", "rows", 1, "+", p.mode === "columns" ? "disabled" : "")}</div><div><span>Flowers in each</span>${btn("Remove a flower from each row", "columns", -1, "−", p.mode === "rows" ? "disabled" : "")}<output>${a.columns}</output>${btn("Add a flower to each row", "columns", 1, "+", p.mode === "rows" ? "disabled" : "")}</div></div><p class="model-caption">Each row grows equally. ${a.rows} × ${a.columns} = ${a.rows * a.columns}</p>`;
      } else if (p.concept === "division") {
        const left = p.target - a.bowls.reduce((sum, n) => sum + n, 0);
        html = `<div class="picnic-basket"><span aria-hidden="true">🧺</span><div><b>${left} berries</b><span>still in the basket</span></div></div><div class="picnic-pandas">${a.bowls.map((n, i) => `<div class="panda-place"><span class="panda-face" aria-hidden="true">🐼</span>${btn(`Give a berry to panda ${i + 1}`, "berry", i, `<span class="panda-bowl">${Array.from({ length: n }, () => '<i aria-hidden="true">●</i>').join("") || '<span aria-hidden="true">+</span>'}</span><b>${n} ${n === 1 ? "berry" : "berries"}</b>`, left <= 0 ? "disabled" : "")}${btn(`Take a berry back from panda ${i + 1}`, "takeberry", i, "↶ Take one back", `class="take-berry" ${n === 0 ? "disabled" : ""}`)}</div>`).join("")}</div><p class="model-caption">Tap a bowl to give a berry. Fair means everyone gets an equal share.</p>`;
      } else if (p.concept === "fractions") {
        const wedges = Array.from({ length: p.parts }, (_, i) => {
          const start = i * 2 * Math.PI / p.parts - Math.PI / 2, end = (i + 1) * 2 * Math.PI / p.parts - Math.PI / 2;
          const d = `M150 150L${150 + 130 * Math.cos(start)} ${150 + 130 * Math.sin(start)}A130 130 0 ${end - start > Math.PI ? 1 : 0} 1 ${150 + 130 * Math.cos(end)} ${150 + 130 * Math.sin(end)}Z`;
          return `<g role="button" tabindex="0" id="trail-pick-${i}" data-action="pick" data-n="${i}" aria-label="Serve piece ${i + 1}" aria-pressed="${a.picks.includes(i)}" class="pizza-slice ${a.picks.includes(i) ? "served" : ""}"><path d="${d}"/><circle cx="${150 + 79 * Math.cos((start + end) / 2)}" cy="${150 + 79 * Math.sin((start + end) / 2)}" r="11"/></g>`;
        }).join("");
        html = `<div class="cafe-order"><span>TABLE ☁</span><b>${p.a}<i></i>${p.b}</b><span>of one whole</span></div>${p.mode === "bar" ? `<div class="fraction-cake">${Array.from({ length: p.parts }, (_, i) => btn(`Serve piece ${i + 1}`, "pick", i, "✦", `aria-pressed="${a.picks.includes(i)}"`)).join("")}</div>` : `<svg class="fraction-pizza" viewBox="0 0 300 300" aria-label="One pizza in ${p.parts} equal pieces">${wedges}</svg>`}<p class="model-caption">${a.picks.length} of ${p.parts} pieces served · tap a piece to change your order</p>`;
      } else if (p.concept === "patterns") {
        const symbol = (n) => p.mode === "rhythm" ? shapes[n] : n;
        html = `<div class="pattern-train"><span class="train-engine" aria-hidden="true">🚂</span>${p.sequence.map((n) => `<span class="train-car" data-tone="${p.mode === "rhythm" ? n : "number"}">${symbol(n)}</span>`).join("")}${[0, 1].map((i) => `<span class="train-car train-missing" data-tone="${p.mode === "rhythm" ? a.sequence[i] : "number"}">${a.sequence[i] === undefined ? "?" : symbol(a.sequence[i])}</span>`).join("")}</div><p class="model-caption">Your next two tickets, in order</p><div class="pattern-tickets">${p.options.map((n) => btn(`Ticket ${p.mode === "rhythm" ? shapeNames[n] : n}`, "ticket", n, symbol(n), `data-tone="${p.mode === "rhythm" ? n : "number"}"`)).join("")}</div>${btn("Remove the last ticket", "undo", 0, "↶ Undo last ticket", `class="trail-undo" ${!a.sequence.length ? "disabled" : ""}`)}`;
      } else if (p.concept === "measurement") {
        html = p.mode === "ruler" ? `<div class="ruler-scene"><span class="ruler-cloud" aria-hidden="true">☁</span><div class="tiny-bridge" style="left:${p.a / 16 * 100}%;width:${p.b / 16 * 100}%" aria-label="Bridge to measure"><span>BRIDGE</span></div><div class="ruler-strip" style="left:${a.offset / 16 * 100}%">${Array.from({ length: 13 }, (_, i) => `<span>${i}</span>`).join("")}</div></div><label class="ruler-slider" for="rulerOffset">Slide your ruler <input id="rulerOffset" type="range" min="0" max="4" step="1" value="${a.offset}"><span id="rulerPosition">Position ${a.offset}</span></label>${dial("Bridge length", "cm")}` : `<div class="fence-scene"><span class="fence-horizontal">${p.a} m</span><div class="fence-garden" style="--garden-ratio:${p.a}/${p.b}"><span aria-hidden="true">🌷　🌱　🌷</span></div><span class="fence-vertical">${p.b} m</span><span class="fence-horizontal">${p.a} m</span></div>${dial("Fence all the way around", "m")}`;
      } else {
        const points = a.picks.map((i) => `${32 + i % 4 * 78},${32 + Math.floor(i / 4) * 78}`).join(" ");
        const ghost = helped ? `<polygon class="constellation-example" points="${p.solution.map((i) => `${32 + i % 4 * 78},${32 + Math.floor(i / 4) * 78}`).join(" ")}"/>` : "";
        html = `<div class="shape-blueprint"><b>${p.shape}</b><span>${p.a} sides · ${p.a} corners</span></div><div class="constellation-board"><svg viewBox="0 0 298 298" aria-hidden="true">${ghost}${a.picks.length >= 3 ? `<polygon class="constellation-fill" points="${points}"/>` : ""}<polyline points="${points}"/></svg>${Array.from({ length: 16 }, (_, i) => btn(`Star at column ${i % 4 + 1}, row ${Math.floor(i / 4) + 1}`, "pick", i, a.picks.includes(i) ? a.picks.indexOf(i) + 1 : "✦", `class="constellation-peg" aria-pressed="${a.picks.includes(i)}" style="left:${(32 + i % 4 * 78) / 298 * 100}%;top:${(32 + Math.floor(i / 4) * 78) / 298 * 100}%"`)).join("")}</div><p class="model-caption">Tap corners in order. We join the last corner back to the first.</p>${btn("Undo the last corner", "undo", 0, "↶ Undo last corner", `class="trail-undo" ${!a.picks.length ? "disabled" : ""}`)}`;
      }
      if (p.concept === "division") html += btn("Give everyone one berry", "shareRound", 0, "Give everyone one berry ↻", `class="trail-undo" ${p.target - a.bowls.reduce((sum, n) => sum + n, 0) < p.a ? "disabled" : ""}`);
      if (p.concept === "subtraction" && p.a > 10) html += btn("Send five stars home", "sendFive", 0, "Send a group of five ↗", `class="trail-undo" ${p.a - a.picks.length < 5 ? "disabled" : ""}`);
      q("#trailBoard").innerHTML = html;
      if (p.concept === "geometry") q(`#trail-pick-${p.b}`).setAttribute("data-anchor", "true");
      if (solved) q("#trailBoard").querySelectorAll("button, input, [role=button]").forEach((el) => { el.disabled = true; el.setAttribute("aria-disabled", "true"); });
      if (focused && $(focused)) $(focused).focus({ preventScroll: true });
    }

    function giveHelp() {
      if (solved) return;
      helped = true; q("#trailFeedback").textContent = puzzle.hint; q("#trailFeedback").className = "trail-feedback supportive";
      if (puzzle.concept === "subtraction" && !answer.picks.length) answer.picks = [0];
      if (puzzle.concept === "division") {
        const left = puzzle.target - answer.bowls.reduce((sum, n) => sum + n, 0);
        if (left >= puzzle.a && answer.bowls.every((n) => n === answer.bowls[0])) answer.bowls = answer.bowls.map((n) => n + 1);
      }
      if (puzzle.concept === "measurement" && puzzle.mode === "ruler") answer.offset = puzzle.a;
      renderBoard(); api.sfx.hoot();
    }
    function check() {
      if (solved) return;
      const result = checkTrailAnswer(puzzle, answer);
      const support = helped || api.hintsUsed() > hintsBefore;
      save(recordPractice(model(), puzzle.concept, result.correct, attempt, support, puzzle.level, puzzle.mode));
      q("#trailFeedback").textContent = result.message;
      q("#trailFeedback").className = `trail-feedback ${result.correct ? "discovered" : "supportive"}`;
      move(`Tried this model: ${puzzle.concept === "division" ? answer.bowls.join(", ") : puzzle.concept === "multiplication" ? `${answer.rows} rows of ${answer.columns}` : puzzle.concept === "patterns" ? answer.sequence.join(", ") : `${answer.picks.length} selected; number ${answer.value}`}. ${result.correct ? "Correct" : "Needs another try"}.`);
      if (!result.correct) { attempt += 1; api.emit("miss"); api.sfx.wrong(); if (attempt >= 3) giveHelp(); return; }
      solved = true; if (attempt === 1 && !support) independent += 1;
      // Already marked and counted, so the offer cannot change what this discovery was worth.
      explainer.offer({
        grade: window.MQClasses ? window.MQClasses.grade() : "3",
        skill: t.subject || t.name, question: puzzle.prompt,
        answer: Number.isFinite(puzzle.target) ? String(puzzle.target) : "",
        given: "", firstTry: attempt === 1 && !support,
        board: `A hands-on ${String(puzzle.concept)} model the child builds by hand.`,
      });
      history.push({ concept: puzzle.concept, level: puzzle.level, independent: attempt === 1 && !support });
      api.emit("solved", { afterMistake: attempt > 1 }); api.sfx.good(); api.addCoins(2, api.center(q("#trailMascot")));
      const center = api.center(q("#trailMascot"));
      api.burst(center.x, center.y, { count: 10, chars: ["✦", trail(puzzle.concept).icon], spread: 70 });
      q(".trail-progress").setAttribute("aria-valuenow", String(round + 1));
      q(`[data-stop="${round}"]`).classList.add("found"); q(`[data-stop="${round}"]`).textContent = "✓";
      q('[data-action="check"]').hidden = true; q('[data-action="help"]').disabled = true;
      const next = q('[data-action="next"]'); next.hidden = false; next.textContent = round === 4 ? "Keep these discoveries ✦" : "Next discovery →";
      renderBoard(); next.focus({ preventScroll: true });
    }
    function finish() {
      m = model();
      if (id === "expedition") m.expeditions += 1; else m.trails[id].completed += 1;
      save(m);
      const gift = id === "expedition" ? "A little practice across different ideas helps them stick together." : `You found the ${trail(id).souvenir.toLowerCase()} for your explorer’s pocket!`;
      api.finish({ stars: independent >= 4 ? 3 : independent >= 2 ? 2 : 1, emoji: id === "expedition" ? "🧭" : trail(id).icon, title: id === "expedition" ? "A pocketful of connections!" : `${trail(id).subject}: a new discovery!`, note: `${gift} You explored five puzzles. Come back for fresh numbers and new connections.` });
    }
    stage.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true" || !api.alive()) return;
      const act = button.dataset.action, n = Number(button.dataset.n);
      if (act === "next") { if (!solved) return; round += 1; if (round === 5) finish(); else begin(); return; }
      if (solved) return;
      if (act === "check") return check();
      if (act === "help") return giveHelp();
      if (act === "gentler") {
        const level = Math.max(1, puzzle.level - 1); m = model(); m.trails[puzzle.concept].level = level; save(m); begin(level); helped = true; return;
      }
      if (act === "pick") {
        if (answer.picks.includes(n)) answer.picks = answer.picks.filter((i) => i !== n);
        else if (puzzle.concept !== "geometry" || answer.picks.length < puzzle.a) answer.picks.push(n);
      } else if (act === "rows") answer.rows = Math.min(6, Math.max(1, answer.rows + n));
      else if (act === "columns") answer.columns = Math.min(8, Math.max(1, answer.columns + n));
      else if (act === "value") answer.value = Math.min(99, Math.max(0, answer.value + n));
      else if (act === "berry" && answer.bowls.reduce((sum, v) => sum + v, 0) < puzzle.target) answer.bowls[n] += 1;
      else if (act === "takeberry") answer.bowls[n] = Math.max(0, answer.bowls[n] - 1);
      else if (act === "shareRound" && puzzle.target - answer.bowls.reduce((sum, v) => sum + v, 0) >= puzzle.a) answer.bowls = answer.bowls.map((v) => v + 1);
      else if (act === "sendFive" && puzzle.a - answer.picks.length >= 5) answer.picks.push(...Array.from({ length: puzzle.a }, (_, i) => i).filter((i) => !answer.picks.includes(i)).slice(0, 5));
      else if (act === "ticket" && answer.sequence.length < 2) answer.sequence.push(n);
      else if (act === "undo") { if (puzzle.concept === "geometry") answer.picks.pop(); else answer.sequence.pop(); }
      move(`${act}: ${n}`); api.sfx.tap(); renderBoard();
    }, { signal: lifecycle.signal });
    stage.addEventListener("keydown", (event) => {
      if (event.target.matches(".pizza-slice") && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
    }, { signal: lifecycle.signal });
    stage.addEventListener("input", (event) => {
      if (solved) return;
      if (event.target.id === "trailValue") answer.value = Math.min(99, Math.max(0, Number(event.target.value) || 0));
      if (event.target.id === "rulerOffset") {
        answer.offset = Number(event.target.value); q(".ruler-strip").style.left = `${answer.offset / 16 * 100}%`; q("#rulerPosition").textContent = `Position ${answer.offset}`;
      }
    }, { signal: lifecycle.signal });
    // What Hoot notices on the trail, and a question for a pause that never gives the model away.
    api.companion.watch(() => puzzle && {
      sees: `${trail(puzzle.concept).subject} · discovery ${round + 1} of 5${solved ? " · found it" : attempt > 1 ? ` · try ${attempt}` : ""}`,
      nudge: attempt > 1 ? "What could you change on the board this time?" : "What is one thing you could try on the board first?",
    });
    begin();
    return () => lifecycle.abort();
  }

  TRAILS.forEach((t) => MQ.register({ id: t.id, name: t.name, emoji: t.icon, pathway: true, stageClass: "trail-stage", mount: (stage, api) => mountTrail(stage, api, t.id) }));
  MQ.register({ id: "expedition", name: "Mystery expedition", emoji: "🧭", pathway: true, stageClass: "trail-stage", mount: (stage, api) => mountTrail(stage, api, "expedition") });
  const start = MQ.start;
  MQ.start = () => { start(); renderAtlas(); new MutationObserver(renderAtlas).observe($("mapBoard"), { childList: true }); };
  window.MQPath = { render: renderAtlas, mountTrail };
})();
