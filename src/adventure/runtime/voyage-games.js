import { MISSIONS, restoreVoyage, chapterOpen, voyagePuzzle, operate, railValue, robotReady, bridgeReady, fractionName } from "../voyage";
import { restoreCurriculum, recordPractice } from "../curriculum";

(function () {
  const S = window.MQS, MQ = window.MQ;
  const model = () => restoreVoyage(S.get().voyage);
  const edit = (fn) => S.update((s) => { const v = model(); fn(v); s.voyage = v; });
  const labels = { skyrail: ["Load the bell", "A picnic for Pip", "The cloud scarf", "Find the compass"], robotworks: ["Wake the scouts", "Build the lifters", "Ready the pilots", "Assemble the rescue crew"], cloudbridge: ["A path for Pip", "Here come the robots", "Hoot’s turn", "Bring Nimbus home"] };

  function mount(stage, api, mission) {
    const id = mission.id, lifecycle = new AbortController();
    let cp = model().runs[id];
    if (!cp || (cp.round >= 4 && S.get().chapters[id])) {
      cp = { seed: (Math.random() * 0xffffffff) >>> 0, round: 0, independent: 0, helped: false };
      edit((v) => { v.runs[id] = cp; v.visits++; });
    }
    let round = cp.round, independent = cp.independent, p, picks = [], supplies = [0, 0], pieces = [], attempts = 0, helped = cp.helped, busy = false, solved = false, hintsBefore = 0;
    const q = (s) => stage.querySelector(s);
    const puzzleSkill = () => (p.kind === "bridge" ? "fractions" : p.kind === "robot" ? (p.cellPack > 1 || p.gearPack > 1 ? "division" : "multiplication") : "operation sequences");
    const puzzleAnswer = () => (p.kind === "rail" ? String(p.target) : p.kind === "robot" ? String(p.robots * p.cells) : fractionName(p.target));
    const puzzleBoard = () => (p.kind === "rail"
      ? `A train starting at ${p.start} with ${p.gates.length} switches to choose along the line.`
      : p.kind === "robot"
        ? `Two belts of crates. Batteries come ${p.cellPack} to a crate and gears come ${p.gearPack} to a crate.`
        : `A ruler showing one whole bridge split into twelve equal lengths, and planks of ${p.pieces.map(fractionName).join(", ")}.`);
    stage.dataset.voyage = id;
    stage.innerHTML = `<div class="vg-shell"><header class="vg-heading"><div><p class="voyage-kicker">CHAPTER ${mission.number} · SKYBOUND</p><h1>${mission.name}</h1></div><span class="vg-keepsake">${mission.emoji}<span>${mission.reward}</span></span></header><div class="vg-progress" aria-label="Mission progress"></div><section class="vg-world" aria-label="${mission.name} play area"><div class="vg-world-back" aria-hidden="true"></div><div class="vg-mission"><span class="vg-round"></span><h2 tabindex="-1"></h2><p></p></div><div class="vg-board"></div></section><div class="vg-console"><div class="vg-feedback" role="status"></div><div class="cg-how-host vg-how"></div><div class="vg-controls"></div><div class="vg-actions"><button type="button" class="vg-help" data-vg="help">🦉 Build it with Hoot</button><button type="button" class="btn" data-vg="launch"></button><button type="button" class="btn" data-vg="next" hidden>Keep going →</button></div><p class="vg-save-note">Every delivery saves your place. Explore whenever you like.</p></div></div>`;
    /**
     * The shared "You wanna know how?" control (runtime/explain-ui.js). Every voyage puzzle has one
     * value the explanation can be checked against: the train's destination, the fraction the gap
     * measures, or the battery total the recipe works out to.
     */
    const explainer = window.MQExplain.create({ actions: q(".vg-actions"), panel: q(".vg-how"), signal: lifecycle.signal, buttonClass: "vg-help" });
    const remember = () => edit((v) => { v.runs[id] = { seed: cp.seed, round, independent, helped }; });
    const feedback = (text, state = "") => { q(".vg-feedback").textContent = text; q(".vg-feedback").dataset.state = state; };
    const opLabel = (op) => `${op.sign}${op.amount}`;
    function begin() {
      explainer.reset();
      p = voyagePuzzle(id, cp.seed, round); picks = Array(p.kind === "rail" ? p.gates.length : 0).fill(-1); supplies = [0, 0]; pieces = []; attempts = 0; solved = false; busy = false; hintsBefore = api.hintsUsed();
      q(".vg-board").classList.toggle("with-helper", helped);
      q(".vg-progress").innerHTML = labels[id].map((label, i) => `<span ${i === round ? 'aria-current="step"' : ""} class="${i < round ? "complete" : ""}"><b>${i < round ? "✓" : i + 1}</b><span>${label}</span></span>`).join("");
      q(".vg-round").textContent = `MISSION ${round + 1} / 4`;
      q(".vg-mission h2").textContent = labels[id][round];
      q(".vg-mission p").textContent = p.kind === "rail" ? `Deliver ${p.parcel}. Change the train’s number to ${p.target}.` : p.kind === "robot" ? `Build ${p.robots} robots. Every robot needs ${p.cells} batteries and ${p.gears} gears.` : `Help ${p.friend} cross a gap that is ${fractionName(p.target)} of a whole bridge.${p.minimum > 1 ? " Use at least two planks." : ""}`;
      q('[data-vg="launch"]').textContent = p.kind === "rail" ? "Send the train →" : p.kind === "robot" ? "Build the crew →" : "Test the bridge →";
      q('[data-vg="launch"]').hidden = false; q('[data-vg="next"]').hidden = true;
      feedback(p.kind === "rail" ? "Choose a switch at every stop. The train uses them from left to right." : p.kind === "robot" ? "Load crates onto both belts. Use the recipe to plan enough for everyone." : "Each plank is part of the same whole. Tap planks to lay your path.");
      api.setHint(() => { markHelp(); return hint(); });
      render();
      if (helped) feedback(hint());
      q(".vg-mission h2").focus({ preventScroll: true });
    }
    function hint() {
      if (p.kind === "rail") return `Start at ${p.start}. Work out the first switch, then use that new number at the next switch. You can change any switch before sending the train.`;
      if (p.kind === "robot") return `Count ${p.robots} equal groups of ${p.cells} batteries. Do the same with ${p.gears} gears. Each crate may hold more than one part.`;
      return `The ruler shows one whole split into twelve equal lengths. A half spans six marks, a third spans four, and a quarter spans three. Undo a plank to try another path.`;
    }
    function markHelp() { helped = true; remember(); }
    function render() {
      const focus = document.activeElement?.id;
      if (p.kind === "rail") {
        q(".vg-world-back").innerHTML = '<div class="vg-mountains"></div><div class="vg-moon"></div><div class="vg-trestle"></div>';
        q(".vg-board").innerHTML = `<div class="rail-platform start"><small>DEPART</small><b>${p.start}</b></div><div class="rail-platform goal"><small>DELIVER TO</small><b>${p.target}</b></div><div class="rail-line"><div class="rail-cart" aria-label="Train"><span>${S.hero()}</span>🚂<output>${p.start}</output></div>${p.gates.map((_, i) => `<div class="rail-switch" style="left:${25 + i * (48 / Math.max(1, p.gates.length - 1))}%"><span>${i + 1}</span><b>${p.gates[i][picks[i]] ? opLabel(p.gates[i][picks[i]]) : "?"}</b></div>`).join("")}</div><div class="rail-history" aria-live="off"></div>`;
        q(".vg-controls").innerHTML = `<div class="rail-gates">${p.gates.map((ops, i) => `<fieldset><legend>Switch ${i + 1}</legend>${ops.map((op, j) => `<button type="button" id="vg-gate-${i}-${j}" data-vg="gate" data-i="${i}" data-j="${j}" aria-pressed="${picks[i] === j}" ${busy || solved ? "disabled" : ""}>${opLabel(op)}</button>`).join("")}</fieldset>`).join("")}</div>`;
      } else if (p.kind === "robot") {
        q(".vg-world-back").innerHTML = '<div class="forge-window"></div><div class="forge-pipes"></div>';
        q(".vg-board").innerHTML = `<div class="robot-recipe"><b>ONE ROBOT</b><span>${p.cells} 🔋 + ${p.gears} ⚙ = 🤖</span></div><div class="robot-line">${Array.from({ length: p.robots }, (_, i) => `<div class="robot-bay"><span class="robot-body">${window.MQVoyageArt.robot}</span><span class="robot-needs">${p.cells} 🔋 · ${p.gears} ⚙</span><span class="robot-parts" aria-label="${p.cells} batteries and ${p.gears} gears"><span>${"▮".repeat(p.cells)}</span><span>${"⚙".repeat(p.gears)}</span></span><small>ROBOT ${i + 1}</small></div>`).join("")}</div><div class="forge-belts"><div><span>🔋 Battery belt</span><b>${supplies[0] * p.cellPack} loaded</b></div><div><span>⚙ Gear belt</span><b>${supplies[1] * p.gearPack} loaded</b></div></div>`;
        q(".vg-controls").innerHTML = `<div class="supply-controls">${[p.cellPack, p.gearPack].map((pack, i) => `<div class="supply-bin"><div><b>${i ? "⚙ Gears" : "🔋 Batteries"}</b><span>${pack} ${pack === 1 ? "part" : "parts"} per crate</span></div><button type="button" id="vg-remove-${i}" data-vg="supply" data-i="${i}" data-n="-1" aria-label="Remove ${i ? "gear" : "battery"} crate" ${supplies[i] === 0 ? "disabled" : ""}>−</button><output aria-label="${i ? "Gear" : "Battery"} crates">${supplies[i]}</output><button type="button" id="vg-add-${i}" data-vg="supply" data-i="${i}" data-n="1" aria-label="Add ${i ? "gear" : "battery"} crate">+</button></div>`).join("")}</div>`;
      } else {
        q(".vg-world-back").innerHTML = '<div class="bridge-stars">✦ · ✧ · ✦</div><div class="bridge-clouds"></div>';
        q(".vg-board").innerHTML = `<div class="bridge-friend">${p.friend === "Nimbus" ? window.MQVoyageArt.nimbus : `<span>${p.friend === "Hoot" ? "🦉" : p.friend === "Pip" ? "🧚" : "🤖"}</span>`}</div><div class="bridge-whole"><span>ONE WHOLE BRIDGE</span><div>${Array(12).fill("<i></i>").join("")}</div></div><div class="bridge-gap-track"><div class="bridge-gap" style="width:${p.target / 12 * 100}%"><span>${fractionName(p.target)} gap</span></div><div class="bridge-laid">${pieces.map((n, i) => `<span style="width:${n / 12 * 100}%" data-piece="${i}">${fractionName(n)}</span>`).join("")}</div><div class="bridge-end" style="left:${p.target / 12 * 100}%">⚑</div></div><div class="bridge-equation">${pieces.length ? pieces.map(fractionName).join(" + ") : "Your planks go here"}</div>`;
        q(".vg-controls").innerHTML = `<div class="plank-palette">${p.pieces.map((n) => `<button type="button" id="vg-plank-${n}" data-vg="plank" data-n="${n}" aria-label="Lay ${fractionName(n)} plank"><span style="width:${n * 10}px"></span><b>${fractionName(n)}</b></button>`).join("")}<button type="button" data-vg="undo" ${pieces.length ? "" : "disabled"}>↶ Undo</button></div>`;
      }
      if (busy || solved) q(".vg-controls").querySelectorAll("button").forEach((b) => b.disabled = true);
      q('[data-vg="launch"]').disabled = busy;
      q('[data-vg="help"]').disabled = busy || solved;
      if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
    }
    function record(correct) {
      const skill = p.kind === "bridge" ? "fractions" : p.kind === "robot" ? (p.cellPack > 1 || p.gearPack > 1 ? "division" : "multiplication") : "subtraction";
      const solo = correct && attempts === 1 && !helped && api.hintsUsed() === hintsBefore;
      edit((v) => { v.recent = [...v.recent, { skill: p.kind === "rail" ? "operation sequences" : skill, correct, independent: solo }].slice(-24); });
      // A compound rail route is not evidence for one isolated addition/subtraction skill.
      if (p.kind !== "rail") S.update((s) => { s.curriculum = recordPractice(restoreCurriculum(s.curriculum), skill, correct, attempts, helped || api.hintsUsed() > hintsBefore, 1, p.kind === "robot" ? "recipe-crates" : "bridge-composition"); });
      return solo;
    }
    async function launch() {
      if (busy || solved) return;
      if (p.kind === "rail" && picks.some((n) => n < 0)) { feedback("Choose a switch at every stop before sending your train."); return; }
      busy = true; attempts++; render();
      const correct = p.kind === "rail" ? railValue(p, picks) === p.target : p.kind === "robot" ? robotReady(p, ...supplies) : bridgeReady(p, pieces);
      if (p.kind === "rail") {
        let value = p.start;
        const lines = [];
        for (let i = 0; i < picks.length; i++) {
          const op = p.gates[i][picks[i]], before = value; value = operate(value, op);
          q(".rail-cart").style.left = `${25 + i * (48 / Math.max(1, p.gates.length - 1))}%`;
          q(".rail-cart output").textContent = value;
          lines.push(`${before} ${opLabel(op)} = ${value}`); q(".rail-history").textContent = lines.join("  →  ");
          api.sfx.hop(i); await api.wait(550); if (!api.alive()) return;
        }
        q(".rail-cart").style.left = "94%"; await api.wait(350); if (!api.alive()) return;
      } else if (correct && p.kind === "robot") {
        for (const robot of q(".robot-line").children) {
          robot.classList.add("online"); api.sfx.ten(); await api.wait(240); if (!api.alive()) return;
        }
      } else if (correct) {
        q(".bridge-friend").style.left = `${Math.min(85, p.target / 12 * 87)}%`; api.sfx.bigHop(); await api.wait(850); if (!api.alive()) return;
      }
      const solo = record(correct);
      busy = false;
      if (!correct) {
        api.emit("miss"); api.sfx.plop();
        const reason = p.kind === "rail" ? `The train reached ${railValue(p, picks)}. This parcel belongs at ${p.target}. Change a switch and try a new route.` : p.kind === "robot" ? `Your belts have ${supplies[0] * p.cellPack} batteries and ${supplies[1] * p.gearPack} gears. Count the recipe once for each robot, then adjust your crates.` : pieces.length < p.minimum ? "This crossing needs at least two planks. Can you make the same length with smaller pieces?" : `Your planks ${pieces.reduce((a,b)=>a+b,0) > p.target ? "go past the flag" : "don’t reach the flag yet"}. Use the whole-bridge ruler to compare lengths.`;
        feedback(reason, "retry");
        markHelp();
        // Keep the train’s worked route visible until a switch changes.
        q(".vg-controls").querySelectorAll("button").forEach((b) => b.disabled = false);
        q('[data-vg="launch"]').disabled = false; q('[data-vg="help"]').disabled = false;
        return;
      }
      solved = true;
      if (solo) independent++;
      const equation = p.kind === "rail" ? `Parcel delivered to ${p.target}. Your switches made the route!` : p.kind === "robot" ? `${p.robots} × ${p.cells} = ${p.robots * p.cells} batteries; ${p.robots} × ${p.gears} = ${p.robots * p.gears} gears. ${p.cellPack > 1 ? `${p.robots * p.cells} ÷ ${p.cellPack} = ${supplies[0]} battery crates. ` : ""}${p.gearPack > 1 ? `${p.robots * p.gears} ÷ ${p.gearPack} = ${supplies[1]} gear crates. ` : ""}Crew ready!` : `${pieces.map(fractionName).join(" + ")} = ${fractionName(p.target)}. ${p.friend} made it across!`;
      feedback(equation, "correct");
      // Offered only now: the mission is already marked and saved, so asking changes nothing.
      explainer.offer({
        grade: window.MQClasses ? window.MQClasses.grade() : "3",
        skill: puzzleSkill(), question: q(".vg-mission p").textContent, answer: puzzleAnswer(),
        given: p.kind === "rail" ? String(railValue(p, picks)) : p.kind === "robot" ? `${supplies[0]} battery crates, ${supplies[1]} gear crates` : pieces.map(fractionName).join(" + "),
        firstTry: solo, board: puzzleBoard(),
      });
      api.emit("solved", { afterMistake: attempts > 1 }); api.sfx.good(); api.fact(equation);
      // Save immediately; leaving during the reward cannot lose this completed encounter.
      round++; helped = false; remember();
      q('[data-vg="launch"]').hidden = true; q('[data-vg="next"]').hidden = false; q('[data-vg="help"]').disabled = true;
      q('[data-vg="next"]').textContent = round === 4 ? "See what happens →" : "Next stop →";
      q('[data-vg="next"]').focus({ preventScroll: true });
    }
    stage.addEventListener("click", (event) => {
      const b = event.target.closest("[data-vg]"); if (!b || busy) return;
      const act = b.dataset.vg;
      if (act === "next") { if (round >= 4) finish(); else begin(); return; }
      if (solved) return;
      if (act === "help") { markHelp(); feedback(hint()); q(".vg-board").classList.add("with-helper"); return; }
      if (act === "launch") { launch(); return; }
      if (act === "gate") picks[Number(b.dataset.i)] = Number(b.dataset.j);
      if (act === "supply") { const i = Number(b.dataset.i); supplies[i] = Math.max(0, Math.min(30, supplies[i] + Number(b.dataset.n))); }
      if (act === "plank" && pieces.length < 6 && pieces.reduce((a,c)=>a+c,0) + Number(b.dataset.n) <= 18) pieces.push(Number(b.dataset.n));
      if (act === "undo") pieces.pop();
      api.sfx.tap(); render();
    }, { signal: lifecycle.signal });
    function finish() {
      api.finish({ stars: independent >= 3 ? 3 : independent >= 1 ? 2 : 1, title: ["The compass is safe!", "Your rescue crew is ready!", "Nimbus is home!"][mission.number - 4], emoji: mission.emoji, note: `${mission.reward}. ${independent} of 4 missions solved on your first try without help. Your friends have a bonus game waiting.` });
    }
    // What Hoot notices on this mission, and a question for a pause that never gives the route, crates or planks.
    api.companion.watch(() => {
      if (!p || solved) return p ? { sees: "Mission complete" } : null;
      if (p.kind === "rail") {
        const set = picks.filter((n) => n >= 0).length;
        return { sees: `Train leaves ${p.start} · deliver to ${p.target} · ${set} of ${p.gates.length} switches set`, nudge: set < p.gates.length ? `Which switch at stop ${set + 1} moves the train toward ${p.target}?` : `Where do you think your route will end?` };
      }
      if (p.kind === "robot") return { sees: `${p.robots} robots · ${supplies[0] * p.cellPack} batteries and ${supplies[1] * p.gearPack} gears loaded`, nudge: `How many batteries do ${p.robots} robots need altogether?` };
      return { sees: `Gap: ${fractionName(p.target)} · planks: ${pieces.length ? pieces.map(fractionName).join(" + ") : "none yet"}`, nudge: pieces.length ? "Does your path reach the flag, go past it, or stop short?" : `Which planks could fill ${fractionName(p.target)} of the bridge?` };
    });
    if (round >= 4) queueMicrotask(() => { if (api.alive()) finish(); }); else begin();
    return () => { lifecycle.abort(); delete stage.dataset.voyage; };
  }
  MISSIONS.filter((m) => m.number <= 6).forEach((mission) => MQ.register({ id: mission.id, name: mission.name, emoji: mission.emoji, pathway: true, campaign: true, chapterNumber: mission.number, stageClass: "voyage-stage", canOpen: () => chapterOpen(mission.id, S.get().chapters) || S.get().unlockAll, intro: () => window.MQVoyageStory.intro(mission.id), outro: () => window.MQVoyageStory.outro(mission.id), mount: (stage, api) => mount(stage, api, mission) }));
})();
