import { MISSIONS, restoreVoyage, chapterOpen } from "../voyage";
import { frontierPuzzle, gardenMeasure, gardenReady, waterMove, waterReady, waterSolution, WATER_ACTIONS, WATER_LABELS } from "../frontier";
import { restoreCurriculum, recordPractice } from "../curriculum";

(function () {
  const S = window.MQS, MQ = window.MQ;
  const labels = { garden: ["A patch for Pip", "Room for the robots", "A fence for the seedlings", "Nimbus’s welcome garden"], water: ["The sleepy shell", "A puddle for the crabs", "The turtle nursery", "A little storm’s big gift"] };
  const safe = (text) => { const el = document.createElement("span"); el.textContent = text; return el.innerHTML; };
  function mount(stage, api, mission, dream = null) {
    const id = mission.id, key = dream ? "dreamProgress" : "voyage", life = new AbortController();
    const state = () => restoreVoyage(S.get()[key]);
    const edit = (fn) => S.update((s) => { const v = state(); fn(v); s[key] = v; });
    let cp = state().runs[id];
    if (dream || !cp || (cp.round >= 4 && S.get().chapters[id])) {
      cp = { seed: (Math.random() * 0xffffffff) >>> 0, round: 0, independent: 0, helped: false };
      edit((v) => { v.runs[id] = cp; v.visits++; });
    }
    let round = cp.round, independent = cp.independent, helped = cp.helped, puzzle, cells = [], tanks = [0, 0], history = [], attempts = 0, solved = false, hintVersion = 0, hintPending = false;
    stage.dataset.voyage = id;
    const q = (selector) => stage.querySelector(selector);
    stage.innerHTML = `<div class="fg-shell" data-kind="${id}" data-theme="${dream?.theme || "home"}"><header class="fg-header"><p class="voyage-kicker">${dream ? "YOUR STORY LAB ADVENTURE" : `CHAPTER ${mission.number} · A PLACE TO GROW`}</p><h1>${safe(dream?.title || mission.name)}</h1><p>${dream ? safe(dream.opening) : id === "garden" ? "Every friend deserves a place to belong. Design it your way." : "Nimbus can make rain. You can help it reach exactly the right place."}</p></header><div class="fg-steps" aria-label="Mission progress"></div><section class="fg-play"><div class="fg-brief"><span class="fg-friend" aria-hidden="true">${id === "garden" ? "🌻" : "🐢"}</span><div><p class="voyage-kicker fg-round"></p><h2 tabindex="-1"></h2><p class="fg-goal"></p><p class="fg-beat"></p></div></div><div class="fg-workbench"></div></section><div class="fg-console"><p class="fg-feedback" role="status"></p><div class="fg-actions"><button type="button" class="fg-button" data-fg="undo">↶ Undo</button><button type="button" class="fg-button" data-fg="hint">🦉 Think with Hoot</button><button type="button" class="btn" data-fg="check">${id === "garden" ? "Plant my garden" : "Fill the tidepool"} →</button><button type="button" class="btn" data-fg="next" hidden>Next mission →</button></div><p class="fg-caption">${dream ? dream.byAI ? "✦ A story made with AI and your choices" : "✦ A built-in story made with your choices" : "Every finished mission saves. No clock. Try, undo, discover."}</p></div></div>`;
    const remember = () => edit((v) => { v.runs[id] = { seed: cp.seed, round, independent, helped }; });
    const feedback = (text, result = "") => { q(".fg-feedback").textContent = text; q(".fg-feedback").dataset.state = result; };
    const markHelp = () => { helped = true; remember(); };
    function localHint() {
      if (id === "garden") {
        const m = gardenMeasure(cells);
        if (cells.length && !m.connected) return "Join your planted patches along an edge. Touching only at a corner leaves separate gardens.";
        if (m.area === puzzle.area && puzzle.perimeter !== null && m.perimeter !== puzzle.perimeter) return "Keep the same number of flowers. Move a patch: shared edges need no fence. A more compact shape uses less fence.";
        return "Each planted square adds one square unit of area. Start with equal rows. Count only outside edges for the fence.";
      }
      const step = waterSolution(puzzle, tanks)?.[0];
      return step ? `${WATER_LABELS[step]} next. A pour stops when the first jar is empty or the other is full. Watch how much moves.` : "A jar already holds the target amount. Send that water to the tidepool.";
    }
    function hintFacts() {
      return { game: id === "garden" ? "Design a connected square garden with area and optional perimeter" : "Measure water with two jars; fill, empty, or pour until full or empty", goal: q(".fg-goal").textContent, moves: [id === "garden" ? `Current area ${gardenMeasure(cells).area}, perimeter ${gardenMeasure(cells).perimeter}, connected ${gardenMeasure(cells).connected}` : `Jar A ${tanks[0]} of ${puzzle.capacities[0]} L; Jar B ${tanks[1]} of ${puzzle.capacities[1]} L`, `Code-checked guidance: ${localHint()}`], allowed: id === "garden" ? [1, puzzle.area, puzzle.perimeter, gardenMeasure(cells).area, gardenMeasure(cells).perimeter].filter(Number.isInteger) : [...puzzle.capacities, ...tanks, puzzle.target] };
    }
    async function help() {
      if (solved || hintPending) return;
      markHelp(); feedback(localHint());
      if (window.MQAI.status() !== "on") return;
      const token = ++hintVersion; hintPending = true; q('[data-fg="hint"]').disabled = true;
      const text = await window.MQAI.hint(hintFacts());
      if (!api.alive() || token !== hintVersion) return;
      hintPending = false; q('[data-fg="hint"]').disabled = solved;
      if (text && !solved) feedback(`Hoot · AI hint: ${text}`);
    }
    function begin() {
      hintVersion++; hintPending = false; puzzle = frontierPuzzle(id, cp.seed, round); cells = []; tanks = [0, 0]; history = []; attempts = 0; solved = false;
      q(".fg-steps").innerHTML = labels[id].map((label, i) => `<span class="${i < round ? "complete" : ""}" ${i === round ? 'aria-current="step"' : ""}><b>${i < round ? "✓" : i + 1}</b>${label}</span>`).join("");
      q(".fg-round").textContent = `MISSION ${round + 1} / 4`;
      q(".fg-brief h2").textContent = labels[id][round];
      q(".fg-goal").textContent = id === "garden" ? `Plant ${puzzle.area} squares in one connected garden.${puzzle.perimeter === null ? " You choose its shape." : ` Use exactly ${puzzle.perimeter} fence edges.`}` : `Measure exactly ${puzzle.target} litres in either jar. Then fill the tidepool.`;
      q(".fg-beat").textContent = dream?.beats[round] || (id === "garden" ? ["Pip saved you the very first seed.", "The robots want somewhere to watch the moonflowers.", "Nimbus worries about squashing a seedling. A fence will help.", "“I thought clouds couldn’t have roots,” Nimbus whispers. “Maybe friends are roots.”"][round] : ["“I can hear the sea, but I can’t reach it,” says a tiny shell.", "The crabs make a little bucket brigade. You are in charge of measuring.", "Hoot spots baby turtles waiting in the shade. Let’s give them a gentle pool.", "“The mist was too much. But just enough rain… that can help!” says Nimbus."][round]);
      q('[data-fg="check"]').hidden = false; q('[data-fg="next"]').hidden = true;
      feedback(id === "garden" ? "Tap a patch to plant. Tap it again to lift it. Shared edges do not need a fence." : "Fill a jar from the spring, pour into the other jar, or return water to the spring. Nothing is wasted.");
      api.setHint(() => { markHelp(); return { text: localHint(), facts: hintFacts() }; });
      render(); q(".fg-brief h2").focus({ preventScroll: true });
    }
    function render() {
      const focus = document.activeElement?.id;
      if (id === "garden") {
        const m = gardenMeasure(cells);
        q(".fg-workbench").innerHTML = `<div class="garden-layout"><div class="garden-grid" role="group" aria-label="Garden design, five rows of five patches">${Array.from({ length: 25 }, (_, i) => {
          const on = cells.includes(i), edges = [!cells.includes(i - 5), i % 5 === 4 || !cells.includes(i + 1), !cells.includes(i + 5), i % 5 === 0 || !cells.includes(i - 1)];
          return `<button type="button" id="fg-cell-${i}" data-cell="${i}" aria-label="Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}" aria-pressed="${on}" ${solved ? "disabled" : ""} style="${on ? edges.map((edge, j) => `border-${["top", "right", "bottom", "left"][j]}-color:${edge ? "#f3c783" : "transparent"}`).join(";") : ""}">${on ? ({ moon: "✦", ocean: "🪸", dinosaurs: "🌿", candy: "🍭" })[dream?.theme] || "🌼" : '<span aria-hidden="true">+</span>'}</button>`;
        }).join("")}</div><div class="garden-readout"><span>YOUR BLUEPRINT</span><p><b>${m.area}</b> / ${puzzle.area} squares</p><p><b>${m.perimeter}</b>${puzzle.perimeter !== null ? ` / ${puzzle.perimeter}` : ""} fence edges</p><p>${m.connected ? "✓ One connected garden" : "◇ Join patches along their edges"}</p><small>Each patch is one square unit.<br>Each gold edge is one fence unit.</small></div></div>`;
      } else {
        q(".fg-workbench").innerHTML = `<div class="water-scene"><span class="water-cloud">${window.MQVoyageArt.nimbus}</span><div class="water-jars">${puzzle.capacities.map((cap, i) => `<div class="water-vessel"><p>JAR ${i ? "B" : "A"} · ${cap} L</p><div class="water-jar" style="--capacity:${cap}"><div class="water-fill" style="height:${tanks[i] / cap * 100}%"></div><div class="water-ticks">${Array.from({ length: cap }, () => "<i></i>").join("")}</div><output aria-label="Jar ${i ? "B" : "A"} litres">${tanks[i]} L</output></div></div>`).join("")}</div><div class="water-pool"><span>🐢 🐚 🦀</span><b>TIDEPOOL · ${puzzle.target} L NEEDED</b></div></div><div class="water-controls">${WATER_ACTIONS.map((action) => { const next = waterMove(puzzle, tanks, action); return `<button type="button" class="fg-button" id="fg-${action}" data-water="${action}" ${solved || next.join() === tanks.join() ? "disabled" : ""}>${WATER_LABELS[action]}</button>`; }).join("")}</div>`;
      }
      q('[data-fg="undo"]').disabled = solved || !history.length;
      q('[data-fg="hint"]').disabled = solved || hintPending;
      if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
    }
    function check() {
      if (solved) return;
      attempts++; hintVersion++; hintPending = false;
      const correct = id === "garden" ? gardenReady(puzzle, cells) : waterReady(puzzle, tanks);
      const solo = correct && attempts === 1 && !helped;
      const skill = id === "garden" ? "geometry" : "measurement";
      S.update((s) => { s.curriculum = recordPractice(restoreCurriculum(s.curriculum), skill, correct, attempts, helped, 1, id === "garden" ? "area-perimeter-design" : "capacity-pouring"); });
      if (!correct) {
        markHelp(); api.emit("miss"); api.sfx.plop();
        feedback(id === "garden" ? `Your plan has ${gardenMeasure(cells).area} squares and ${gardenMeasure(cells).perimeter} outside edges. ${!gardenMeasure(cells).connected ? "Join the patches along an edge." : "Compare your blueprint with the mission, then adjust your design."}` : `Your jars hold ${tanks[0]} L and ${tanks[1]} L. The tidepool needs ${puzzle.target} L from one jar. Try another pour.`, "retry");
        render(); return;
      }
      solved = true; if (solo) independent++;
      api.emit("solved", { afterMistake: attempts > 1 }); api.sfx.good();
      const fact = id === "garden" ? `Designed ${gardenMeasure(cells).area} square units with ${gardenMeasure(cells).perimeter} fence edges.` : `Measured ${puzzle.target} L using ${puzzle.capacities[0]} L and ${puzzle.capacities[1]} L jars.`;
      api.fact(fact); feedback(`✓ ${fact} ${id === "garden" ? "Your friends love this little corner of the island." : "The tidepool is full. Listen to those happy little splashes!"}`, "correct");
      render(); q(".fg-workbench").classList.add("fg-celebrate");
      round++; helped = false; remember();
      q('[data-fg="check"]').hidden = true; q('[data-fg="next"]').hidden = false;
      q('[data-fg="next"]').textContent = round === 4 ? "See what happens →" : "Next mission →";
      q('[data-fg="next"]').focus({ preventScroll: true });
    }
    stage.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const action = b.dataset.fg;
      if (action === "next" && solved) { if (round === 4) finish(); else { q(".fg-workbench").classList.remove("fg-celebrate"); begin(); } return; }
      if (solved) return;
      if (action === "hint") { help(); return; }
      if (action === "check") { check(); return; }
      if (action === "undo" && history.length) { const prev = history.pop(); cells = prev.cells; tanks = prev.tanks; }
      else if (b.dataset.cell !== undefined) { history.push({ cells: [...cells], tanks: [...tanks] }); const n = Number(b.dataset.cell); cells = cells.includes(n) ? cells.filter((c) => c !== n) : [...cells, n]; }
      else if (b.dataset.water) {
        history.push({ cells: [...cells], tanks: [...tanks] }); const before = [...tanks]; tanks = waterMove(puzzle, tanks, b.dataset.water);
        const moved = Math.abs(tanks[0] - before[0]) || Math.abs(tanks[1] - before[1]);
        feedback(b.dataset.water.startsWith("pour") ? `${WATER_LABELS[b.dataset.water]}: moved ${moved} L. Jar A: ${before[0]} → ${tanks[0]} L. Jar B: ${before[1]} → ${tanks[1]} L.` : `${WATER_LABELS[b.dataset.water]}. Jar A now holds ${tanks[0]} L; Jar B holds ${tanks[1]} L.`);
      } else return;
      if (history.length > 150) history.shift();
      // A hint for the previous board must not overwrite guidance for a new move.
      hintVersion++; hintPending = false; api.sfx.tap(); render();
    }, { signal: life.signal });
    function finish() { api.finish({ stars: independent >= 3 ? 3 : independent ? 2 : 1, title: dream ? "Your imagined adventure is real!" : id === "garden" ? "Everyone has a place to grow!" : "A little storm. A very big heart.", emoji: mission.emoji, note: dream ? safe(dream.closing) : `${independent} of 4 missions solved on your first check without hints. ${mission.reward}.` }); }
    // What Hoot notices in the garden or at the jars, and a question for a pause that never gives a design or pour.
    api.companion.watch(() => {
      if (!puzzle) return null;
      if (solved) return { sees: "Mission complete" };
      if (id === "garden") {
        const m = gardenMeasure(cells), apart = cells.length > 0 && !m.connected;
        const fence = puzzle.perimeter !== null ? `${m.perimeter} of ${puzzle.perimeter} fence edges` : `${m.perimeter} fence edges`;
        const nudge = apart ? "Are all your patches touching along an edge?" : m.area < puzzle.area ? "How many more squares does your garden need?" : puzzle.perimeter !== null && m.perimeter !== puzzle.perimeter ? "Could moving one patch change how much fence you need?" : "Is your garden ready to check?";
        return { sees: `${m.area} of ${puzzle.area} squares · ${fence}${apart ? " · not joined yet" : ""}`, nudge };
      }
      return { sees: `Jar A ${tanks[0]} of ${puzzle.capacities[0]} L · Jar B ${tanks[1]} of ${puzzle.capacities[1]} L · need ${puzzle.target} L`, nudge: `Which pour could leave exactly ${puzzle.target} litres in one jar?` };
    });
    if (round === 4) queueMicrotask(() => { if (api.alive()) finish(); }); else begin();
    return () => { hintVersion++; life.abort(); delete stage.dataset.voyage; };
  }
  MISSIONS.filter((m) => m.number > 6).forEach((mission) => MQ.register({ id: mission.id, name: mission.name, emoji: mission.emoji, pathway: true, campaign: true, chapterNumber: mission.number, stageClass: "frontier-stage", canOpen: () => chapterOpen(mission.id, S.get().chapters) || S.get().unlockAll, intro: () => window.MQVoyageStory.intro(mission.id), outro: () => window.MQVoyageStory.outro(mission.id), mount: (stage, api) => mount(stage, api, mission) }));
  window.MQFrontier = { playDream(kind, dream) {
    const mission = MISSIONS.find((m) => m.id === kind), id = `dream-${kind}`;
    let level = MQ.levels.find((l) => l.id === id);
    if (!level) { level = { id, name: "Your Story Lab adventure", emoji: mission.emoji, pathway: true, campaign: true, stageClass: "frontier-stage" }; MQ.register(level); level = MQ.levels.find((l) => l.id === id); }
    level.name = dream.title;
    level.mount = (stage, api) => mount(stage, api, mission, dream);
    level.outro = () => window.MQMini.playForChapter(kind);
    MQ.openLevel(level);
  } };
})();
