// Level 1, Hop: addition as movement on a number line. Pull the hopper back like a slingshot
// (or tap +1 / +10) to add, grab gems, predict where it will land, then watch the answer happen.
// Arcade layer: glow bits wait on the pads along the path (a big hop sweeps up ten at once), clean hops
// build the streak, and the catch, a bullseye guess and a perfect round each score with a pop.
import { riverRound } from "../riverLearning";
import { createRng } from "../../engine/rng";
import { additionSkill } from "../learning";
(function () {
  const ROUNDS = [
    { start: 8, hop: 5, predict: false },
    { start: 23, hop: 14, predict: false },
    { start: 28, hop: 17, predict: true },
  ];
  // If the child never used a big hop, the last river skips the carry and stays shorter.
  const PULL_ONE = 28;
  const PULL_TEN = 110;
  const CALLS = { "🐸": "Ribbit!", "🦖": "Rawr!", "🤖": "Beep boop!", "🐰": "Boing!", "🐢": "Splish!", "🐱": "Meow!", "🐧": "Squawk!", "🦄": "Neigh!", "🐙": "Blub!", "🦘": "Boing!" };

  MQ.register({
    id: "frog",
    name: "Frog Hop",
    emoji: "🐸",
    title: (t) => `${t.hopperName} Hop`,
    icon: (t) => t.hopper,
    stageClass: "frog-stage",
    mount(stage, api) {
      const t = api.theme;
      const arc = api.arcade;
      const rng = createRng(Math.floor(Math.random() * 0xffffffff));
      stage.innerHTML = `
        <div class="frog-scene">
          <div class="frog-card">
            <p class="frog-round" id="frogRound"></p>
            <p class="frog-goal" id="frogGoal" aria-live="polite"></p>
            <p class="frog-count" id="frogCount" aria-live="polite"></p>
            <div class="river-place-value" id="riverPlaceValue" role="img"></div>
          </div>
          <div class="river" id="river">
            <div class="track" id="track"></div>
          </div>
          <div class="frog-controls">
            <button type="button" class="btn secondary hop-btn" id="backBtn"><span aria-hidden="true">↩</span> Back 1</button>
            <button type="button" class="btn sky hop-btn" id="oneBtn">Hop +1</button>
            <button type="button" class="btn hop-btn big" id="tenBtn">Big hop +10</button>
            <p class="drag-tip" style="grid-column: 1 / -1">Tip: pull ${t.hopperName} back like a slingshot. A long pull makes a big hop!</p>
          </div>
          <div class="frog-sum" id="frogSum" role="status" hidden></div>
        </div>`;

      const q = (id) => stage.querySelector(`#${id}`);
      const river = q("river");
      const track = q("track");
      const goal = q("frogGoal");
      const count = q("frogCount");
      const sum = q("frogSum");
      const backBtn = q("backBtn");
      const oneBtn = q("oneBtn");
      const tenBtn = q("tenBtn");

      let roundIndex = 0;
      let round = ROUNDS[0];
      let pos = 0;
      let phase = "hop"; // "predict" | "hop" | "done"
      let predicted = null;
      let queue = [];
      let busy = false;
      let hopsThisRound = 0;
      let wasOver = false;
      let roundAttempts = 1;
      let hintsBefore = 0;
      let padW = 96;
      let minN = 0;
      let maxN = 0;
      let frogEl = null;
      let fireflyEl = null;
      let gemPad = null;
      let aimEls = [];
      const moves = [];
      const score = { usedBig: false, overshoots: 0, predictedRight: 0 };
      function observe(correct, format, guided = false) {
        const kind = additionSkill(round.start, round.hop);
        api.observe({ skill: round.skill || kind.skill, level: round.level || kind.level, format, correct,
          attempt: roundAttempts, hintLevel: guided || api.hintsUsed() > hintsBefore ? 1 : 0 });
        if (!correct) roundAttempts += 1;
      }

      const xOf = (n) => (n - minN) * padW + padW / 2;
      const left = () => round.hop - (pos - round.start);
      const log = (text) => {
        moves.push(text);
        if (moves.length > 8) moves.shift();
      };

      function placeFrog() {
        const x = xOf(pos);
        frogEl.style.left = `${x}px`;
        const view = river.clientWidth;
        const trackW = (maxN - minN + 1) * padW;
        const shift = Math.max(Math.min(view * 0.36 - x, 0), Math.min(0, view - trackW));
        track.style.transform = `translateX(${shift}px)`;
      }

      function buildTrack() {
        padW = stage.clientWidth < 600 ? 62 : 96;
        minN = Math.max(0, round.start - 3);
        maxN = round.start + round.hop + 12;
        track.replaceChildren();
        track.style.setProperty("--pad", `${padW}px`);
        track.style.width = `${(maxN - minN + 1) * padW}px`;
        for (let n = minN; n <= maxN; n++) {
          const pad = document.createElement("button");
          pad.type = "button";
          pad.className = n % 10 === 0 ? "pad ten" : "pad";
          pad.style.left = `${xOf(n)}px`;
          pad.dataset.n = String(n);
          pad.innerHTML = `<span class="pad-num">${n}</span>`;
          pad.setAttribute("aria-label", `Pad ${n}`);
          pad.addEventListener("click", () => choosePad(n, pad));
          track.appendChild(pad);
        }
        gemPad = null;
        if (round.hop >= 10) {
          gemPad = round.start + 10;
          const gem = document.createElement("span");
          gem.className = "gem";
          gem.textContent = t.glow === "💎" ? "🌟" : "💎";
          track.querySelector(`.pad[data-n="${gemPad}"]`).appendChild(gem);
        }
        if (!round.predict) placeBits();
        frogEl = document.createElement("div");
        frogEl.className = "frog";
        frogEl.setAttribute("aria-hidden", "true");
        frogEl.innerHTML = `<span class="frog-body">${t.hopper}${api.state.hat ? `<i class="hopper-hat">${api.state.hat}</i>` : ""}</span>`;
        fireflyEl = document.createElement("div");
        fireflyEl.className = "firefly";
        fireflyEl.hidden = true;
        fireflyEl.innerHTML = `<span style="display:grid;place-items:center;height:100%;font-size:30px">${t.glow}</span>`;
        track.append(frogEl, fireflyEl);
        setupSlingshot();
        track.style.transition = "none";
        frogEl.style.transition = "none";
        placeFrog();
        void track.offsetWidth;
        track.style.transition = "";
        frogEl.style.transition = "";
      }

      // ---------- Glow bits ----------
      // Bits wait only on the pads between the start and the landing pad, so they never lure a hop past it.
      // In a guessing round they appear after the guess, so they cannot give the answer away.
      function placeBits() {
        const target = round.start + round.hop;
        for (let n = round.start + 1; n < target; n++) {
          const pad = track.querySelector(`.pad[data-n="${n}"]`);
          if (!pad || n === gemPad || pad.querySelector(".pad-bit")) continue;
          const bit = document.createElement("span");
          bit.className = "pad-bit";
          bit.setAttribute("aria-hidden", "true");
          bit.style.animationDelay = `${-(n % 5) * 0.3}s`;
          pad.appendChild(bit);
        }
      }
      // A hop collects the bits it passes. A big hop sweeps up a whole row of them in mid-air.
      function collect(from, to, dur) {
        const bits = [];
        for (let n = from + 1; n <= to; n++) {
          const bit = track.querySelector(`.pad[data-n="${n}"] .pad-bit`);
          if (bit) bits.push({ bit, when: ((n - from) / (to - from)) * dur });
        }
        bits.forEach(({ bit, when }, i) => {
          setTimeout(() => {
            if (!api.alive() || !bit.isConnected) return;
            const c = api.center(bit);
            bit.remove();
            arc.pickup(c, i, 10);
          }, when);
        });
        if (to - from === 10 && bits.length >= 5) {
          arc.note("leap");
          setTimeout(() => {
            if (!api.alive()) return;
            const c = api.center(frogEl);
            arc.bonus({ points: 100, x: c.x, y: c.y - 130, label: "Super leap!", tone: "sky" });
          }, dur);
        }
      }

      // ---------- Slingshot pull ----------
      function clearAim() {
        for (const el of aimEls) {
          if (el.classList.contains("pad")) el.classList.remove("aim");
          else el.remove();
        }
        aimEls = [];
      }
      function showAim(step) {
        clearAim();
        if (!step) return;
        const land = Math.min(maxN, pos + step);
        const label = document.createElement("span");
        label.className = step === 10 ? "aim-label big" : "aim-label";
        label.textContent = step === 10 ? "Big hop +10" : "Hop +1";
        label.style.left = `${xOf(pos)}px`;
        const dots = document.createElement("span");
        dots.className = "aim-dots";
        dots.style.left = `${xOf(pos)}px`;
        dots.style.width = `${xOf(land) - xOf(pos)}px`;
        track.append(label, dots);
        aimEls = [label, dots];
        const pad = track.querySelector(`.pad[data-n="${land}"]`);
        if (pad) {
          pad.classList.add("aim");
          aimEls.push(pad);
        }
      }
      function ribbit() {
        api.sfx.ribbit();
        frogEl.firstElementChild.animate(
          [{ transform: "scale(1, 1)" }, { transform: "scale(1.25, 0.75)" }, { transform: "scale(0.9, 1.15)" }, { transform: "scale(1, 1)" }],
          { duration: 420, easing: "ease-out" },
        );
        const c = api.center(frogEl);
        api.floatText(c.x, c.y - 60, CALLS[t.hopper] || "Wheee!");
      }
      function setupSlingshot() {
        let startX = 0;
        let pulling = false;
        let step = 0;
        let pointer = null;
        const body = frogEl.firstElementChild;
        frogEl.addEventListener("pointerdown", (e) => {
          if (phase !== "hop" || busy) {
            ribbit();
            return;
          }
          pulling = true;
          pointer = e.pointerId;
          startX = e.clientX;
          step = 0;
          frogEl.setPointerCapture(pointer);
          frogEl.classList.add("dragging");
        });
        frogEl.addEventListener("pointermove", (e) => {
          if (!pulling || e.pointerId !== pointer) return;
          const dist = Math.abs(e.clientX - startX);
          const next = dist >= PULL_TEN ? 10 : dist >= PULL_ONE ? 1 : 0;
          if (next !== step) {
            step = next;
            showAim(step);
            if (step) api.sfx.stretch(step === 10 ? 14 : 5);
          }
          const pull = Math.max(-44, Math.min(44, (e.clientX - startX) * 0.3));
          body.style.transform = `translateX(${pull}px) scale(${1 + Math.min(dist, 160) / 800}, ${1 - Math.min(dist, 160) / 600})`;
        });
        const release = (e) => {
          if (!pulling || e.pointerId !== pointer) return;
          pulling = false;
          frogEl.classList.remove("dragging");
          body.style.transform = "";
          clearAim();
          if (step) {
            log(step === 10 ? "pulled the slingshot for a big hop" : "pulled the slingshot for a small hop");
            hop(step);
          } else if (Math.abs(e.clientX - startX) < 6) {
            ribbit();
          }
        };
        frogEl.addEventListener("pointerup", release);
        frogEl.addEventListener("pointercancel", release);
      }

      function render() {
        const l = left();
        if (phase === "predict") {
          // Guess buttons keep every choice on screen: the right landing, a forgot-the-ten answer and a counting slip.
          const target = round.start + round.hop;
          const options = [...new Set([target - 10, target - 1, target])].sort((x, y) => x - y);
          goal.innerHTML = `${t.hopperName} is on <b>${round.start}</b> and will hop <b>${round.hop}</b>.<br>Where will ${t.hopperName} land?`;
          count.innerHTML = options.map((n) => `<button type="button" class="guess-btn" data-n="${n}">${n}</button>`).join("");
          count.className = "frog-count guess choices";
          count.querySelectorAll(".guess-btn").forEach((b) =>
            b.addEventListener("click", () => choosePad(Number(b.dataset.n), track.querySelector(`.pad[data-n="${b.dataset.n}"]`) || b)),
          );
        } else if (phase === "hop") {
          goal.innerHTML = predicted === null
            ? `${t.hopperName} is on <b>${round.start}</b>. Hop <b>${round.hop}</b> to catch the ${t.glowOne}!`
            : `You guessed <b>${predicted}</b>. Now hop <b>${round.hop}</b> to check!`;
          count.className = l < 0 ? "frog-count over" : "frog-count";
          count.textContent = l > 0 ? `${l} ${l === 1 ? "hop" : "hops"} to go` : l === 0 ? "Landing!" : `${-l} too far! Hop back`;
        }
        const hopping = phase === "hop";
        oneBtn.disabled = !hopping;
        tenBtn.disabled = !hopping;
        backBtn.disabled = !hopping || pos <= round.start;
        backBtn.classList.toggle("pulse", hopping && l < 0);
        track.classList.toggle("predicting", phase === "predict");
        track.querySelectorAll(".pad").forEach((p) => {
          p.disabled = phase !== "predict";
        });
        const tens = Math.floor(pos / 10);
        const ones = pos % 10;
        const model = q("riverPlaceValue");
        model.setAttribute("aria-label", `On ${pos}: ${tens} tens and ${ones} ones`);
        model.innerHTML = `<span class="pv-model" aria-hidden="true">${Array.from({ length: tens }, () => '<i class="pv-ten"></i>').join("")}${Array.from({ length: ones }, () => '<i class="pv-one"></i>').join("")}</span><span>${tens} tens <b>+</b> ${ones} ones</span>`;
      }

      function startRound(i) {
        roundIndex = i;
        const replay = Boolean(api.state.chapters.frog);
        const plan = replay ? api.learningPlan(["simple", "twoDigit", "regroup"][i]) : null;
        round = riverRound({ round: i, replay, overshoots: score.overshoots, usedBig: score.usedBig, learningLevel: plan?.level, maxTotal: window.MQClasses?.grade() === "1" ? 100 : undefined }, rng);
        roundAttempts = 1;
        hintsBefore = api.hintsUsed();
        pos = round.start;
        phase = round.predict ? "predict" : "hop";
        predicted = null;
        queue = [];
        busy = false;
        hopsThisRound = 0;
        wasOver = false;
        moves.length = 0;
        sum.hidden = true;
        q("frogRound").textContent = `Round ${i + 1} of ${ROUNDS.length}`;
        buildTrack();
        render();
        if (i > 0) {
          const last = i === ROUNDS.length - 1;
          arc.banner(last ? "Final round!" : `Round ${i + 1}`, { sub: round.predict ? "Guess first, then hop!" : "", tone: last ? "coral" : "sky" });
        }
        if (round.support) {
          api.hoot("Let's try a shorter path. One big hop is the same as ten little hops.");
        } else if (i === ROUNDS.length - 1) {
          api.hoot(score.usedBig
            ? "You used big hops, so this path crosses a ten. Guess first!"
            : "Here's a path where big hops really help. Guess first!");
        }
      }

      function choosePad(n, pad) {
        if (phase !== "predict") return;
        api.sfx.tap();
        predicted = n;
        observe(n === round.start + round.hop, "multipleChoice");
        log(`guessed pad ${n}`);
        pad.classList.add("guess");
        const flag = document.createElement("span");
        flag.className = "flag";
        flag.textContent = "🚩";
        pad.appendChild(flag);
        const c = api.center(pad);
        api.floatText(c.x, c.y - 40, "Your guess!");
        arc.snd.lock();
        phase = "hop";
        placeBits();
        render();
      }

      function hop(step) {
        if (phase !== "hop") return;
        if (step < 0 && pos + queue.reduce((a, b) => a + b, 0) <= round.start) return;
        queue.push(step);
        if (!busy) nextHop();
      }

      async function nextHop() {
        const step = queue.shift();
        if (step === undefined || phase !== "hop" || !api.alive()) {
          busy = false;
          return;
        }
        busy = true;
        const from = pos;
        pos = Math.max(minN, Math.min(maxN, pos + step));
        hopsThisRound += 1;
        const big = Math.abs(step) === 10;
        if (step === 10) {
          score.usedBig = true;
          api.emit("bigHop");
          api.fact("used big hops of 10 to add");
        }
        log(step === 10 ? `big hop +10 to ${pos}` : step === 1 ? `hop +1 to ${pos}` : `back 1 to ${pos}`);
        const dur = big ? 620 : 300;
        if (big) api.sfx.bigHop();
        else api.sfx.hop(Math.max(0, pos - round.start));
        animateHop(big, dur, step < 0);
        if (step > 0) collect(from, pos, api.reduced ? Math.min(dur, 250) : dur);
        if (step === 10) {
          arc.snd.whoosh();
          arc.trail(frogEl.firstElementChild, dur);
        }
        await api.wait(dur);
        if (!api.alive()) return;
        landed(from);
        render();
        const l = left();
        // Every hop forward that stays on the path keeps the streak going.
        if (step > 0 && l >= 0) arc.hit({ points: big ? 50 : 10, quiet: true });
        if (l === 0) {
          queue = [];
          busy = false;
          celebrate();
          return;
        }
        if (l < 0 && !wasOver) {
          wasOver = true;
          score.overshoots += 1;
          score.missRound = roundIndex;
          observe(false, "visual");
          api.emit("miss");
          api.fact(`hopped ${-l} too far once, then hopped back`);
          log(`went ${-l} too far`);
          api.sfx.wrong();
          arc.miss();
          const c = api.center(frogEl);
          api.burst(c.x, c.y, { count: 10, chars: ["💦"], colors: ["#58b7e8", "#bde5fa"], spread: 70 });
          api.nudgeHoot();
        }
        if (l > 0) wasOver = false;
        nextHop();
      }

      function animateHop(big, dur, backwards) {
        frogEl.style.transitionDuration = `${dur}ms`;
        placeFrog();
        const lift = big ? -130 : -46;
        const tilt = big ? (backwards ? 12 : -14) : 0;
        frogEl.firstElementChild.animate(
          [
            { transform: "translateY(0) scale(1, 1)" },
            { transform: "translateY(6px) scale(1.18, 0.8)", offset: 0.12 },
            { transform: `translateY(${lift}px) scale(0.9, 1.12) rotate(${tilt}deg)`, offset: 0.5 },
            { transform: "translateY(0) scale(1.14, 0.84)", offset: 0.88 },
            { transform: "translateY(0) scale(1, 1)" },
          ],
          { duration: dur, easing: "ease-in-out" },
        );
      }

      function landed(from) {
        api.sfx.land();
        const pad = track.querySelector(`.pad[data-n="${pos}"]`);
        if (pad) {
          pad.animate(
            [{ transform: "translate(-50%, -50%) scale(1)" }, { transform: "translate(-50%, -50%) scale(0.84)" }, { transform: "translate(-50%, -50%) scale(1)" }],
            { duration: 280, easing: "ease-out" },
          );
          const ring = document.createElement("span");
          ring.className = "ripple";
          pad.appendChild(ring);
          setTimeout(() => ring.remove(), 650);
        }
        const c = api.center(frogEl);
        api.floatText(c.x, c.y - 56, String(pos), pos % 10 === 0 ? "gold" : "");
        if (Math.abs(pos - from) === 10) {
          // A big hop lands with a splash and a little shake of the river.
          arc.impact({ x: c.x, y: c.y + 20, power: 2, tone: "sky", world: [river] });
          api.burst(c.x, c.y + 10, { count: 12, chars: ["💧"], colors: ["#bde5fa", "#58b7e8"], spread: 100 });
        }
        if (pos % 10 === 0 && from !== pos) {
          api.sfx.ten();
          api.burst(c.x, c.y, { count: 12, chars: ["✨"], colors: ["#ffc933", "#ffe9b3"], spread: 90 });
        }
        if (pos === gemPad && pad) {
          gemPad = null;
          const gem = pad.querySelector(".gem");
          if (gem) gem.remove();
          log("grabbed the gem");
          api.emit("gem");
          api.fact("grabbed a hidden gem with a big hop");
          api.sfx.combo(4);
          api.burst(c.x, c.y - 30, { count: 14, chars: ["💎", "✨"], spread: 110 });
          api.floatText(c.x + 60, c.y - 90, "Gem! +2", "gold");
          api.addCoins(2, c);
          arc.bonus({ points: 200, x: c.x - 70, y: c.y - 150 });
        }
      }

      async function celebrate() {
        phase = "done";
        render();
        const target = pos;
        fireflyEl.hidden = false;
        fireflyEl.style.left = `${xOf(target)}px`;
        fireflyEl.animate(
          [
            { transform: "translate(-50%, -320%) scale(0.6)", opacity: 0 },
            { transform: "translate(-50%, -190%) scale(1.15)", opacity: 1, offset: 0.55 },
            { transform: "translate(-50%, -90%) scale(0.2)", opacity: 0 },
          ],
          { duration: 900, easing: "ease-in", fill: "forwards" },
        );
        await api.wait(760);
        if (!api.alive()) return;
        frogEl.firstElementChild.animate(
          [{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-70px) rotate(-180deg)", offset: 0.5 }, { transform: "translateY(0) rotate(-360deg)" }],
          { duration: 700, easing: "ease-in-out" },
        );
        api.sfx.good();
        const c = api.center(frogEl);
        api.burst(c.x, c.y - 20, { count: 18, chars: ["✨", "⭐", t.glow], spread: 140 });

        const right = predicted === target;
        await arc.impact({ x: c.x, y: c.y - 30, power: right ? 3 : 2, tone: right ? "coral" : "gold", world: [river] });
        if (!api.alive()) return;
        arc.hit({ points: 250, x: c.x, y: c.y - 40, word: right ? "Bullseye!" : "Caught it!", tone: right ? "coral" : "gold" });
        if (right) {
          score.predictedRight += 1;
          api.emit("predictRight");
          api.fact(`guessed ${round.start} + ${round.hop} = ${target} before hopping`);
        }
        api.emit("solved", { afterMistake: score.missRound === roundIndex });
        // The live hops-remaining counter guides the finish; count it as supported practice.
        // A correct prediction above is the independent evidence, and is recorded only once.
        if (!round.predict || !right) observe(true, "visual", true);
        const efficient = hopsThisRound <= Math.floor(round.hop / 10) + (round.hop % 10);
        api.addCoins(2 + (efficient ? 1 : 0) + (right ? 3 : 0), c);
        const bonuses = [
          right && { points: 500, label: "Bullseye guess", key: "bullseye" },
          score.missRound !== roundIndex && { points: 200, label: "Perfect round", key: "perfect" },
          efficient && round.hop >= 10 && { points: 150, label: "Smart hops" },
        ].filter(Boolean);

        count.textContent = "Caught it!";
        count.className = "frog-count";
        let note;
        if (predicted !== null) note = right ? `🎯 You knew where ${t.hopperName} would land before hopping!` : `You guessed ${predicted}. ${t.hopperName} landed on ${target}. Count the big hop first next time.`;
        else if (round.hop < 10) note = `⚡ Perfect hops! You counted on ${round.hop} from ${round.start}.`;
        else note = efficient ? "⚡ Super hops! A big hop adds 10 at once." : "Try a big hop next time. It jumps 10 pads at once!";
        const last = roundIndex === ROUNDS.length - 1;
        sum.innerHTML = `<p class="sum-eq"><span>${round.start}</span> + <span>${round.hop}</span> = <span class="sum-ans">${target}</span></p>
          ${bonuses.length ? `<ul class="sum-bonus">${bonuses.map((b, i) => `<li style="--i:${i}"><b>+${b.points}</b> ${b.label}</li>`).join("")}</ul>` : ""}
          <p class="sum-note">${note}</p>
          <button type="button" class="btn" id="nextRiver">${last ? "Finish" : "Next round"}</button>`;
        // Let the catch pop land before the round card covers the river.
        await api.wait(1100);
        if (!api.alive()) return;
        if (last && right) {
          await window.MQTeach.strategy({ host: stage, api, a: round.start, b: round.hop, answer: target, chapter: "frog" });
          if (!api.alive()) return;
        }
        window.MQArcade.clearPops();
        sum.hidden = false;
        // Round bonuses count into the score one line at a time, in step with the list.
        bonuses.forEach((b, i) => {
          setTimeout(() => {
            if (!api.alive()) return;
            if (b.key) arc.note(b.key);
            arc.bonus({ points: b.points });
            arc.snd.word(1);
          }, api.reduced ? 0 : 250 + i * 220);
        });
        const nextBtn = sum.querySelector("#nextRiver");
        nextBtn.focus();
        nextBtn.addEventListener("click", async () => {
          api.sfx.tap();
          if (last) {
            finish();
            return;
          }
          if (roundIndex === 0) {
            sum.hidden = true;
            await window.MQTeach.mistake({ host: stage, api, id: "hopStart", chapter: "frog" });
            if (!api.alive()) return;
          }
          startRound(roundIndex + 1);
        });
      }

      function finish() {
        const stars = 1 + (score.usedBig ? 1 : 0) + (score.predictedRight > 0 && score.overshoots <= 1 ? 1 : 0);
        api.finish({
          stars,
          emoji: t.hopper,
          title: stars === 3 ? "Super hopper!" : `${t.hopperName} made it home!`,
          note: score.usedBig
            ? "You added with big hops of 10. That's the same trick grown-ups use for mental math."
            : "Next time try big hops of 10. They make adding big numbers much faster.",
        });
      }

      function builtInHint() {
        const l = left();
        const tens = Math.floor(round.hop / 10) * 10;
        if (phase === "predict") {
          return tens
            ? `Start at ${round.start}. A big hop of ${tens} lands on ${round.start + tens}. Then count on ${round.hop - tens} more.`
            : `Start at ${round.start} and count on ${round.hop} more.`;
        }
        if (l < 0) return `Oops, ${-l} too far. Tap Back until the counter says 0.`;
        if (l >= 10) return `${l} to go. One big hop jumps 10 pads at once!`;
        if (l > 0) return `${l} to go. Use little hops and count them as you go.`;
        return `Nice! Watch ${t.hopperName} catch the ${t.glowOne}.`;
      }

      api.setHint(() => {
        const text = builtInHint();
        if (phase === "done" || moves.length === 0) return text;
        const l = left();
        const target = round.start + round.hop;
        const nextTen = Math.ceil((pos + 1) / 10) * 10;
        const allowed = [...new Set([round.start, round.hop, Math.abs(l), pos, 1, 10, nextTen])].filter((n) => n !== target || pos === target);
        return {
          text,
          facts: {
            game: `${t.hopperName} hops along numbered pads. The child taps +1 or +10, or pulls ${t.hopperName} like a slingshot, to hop exactly ${round.hop} pads starting from ${round.start}.`,
            goal: phase === "predict"
              ? `Guess the landing pad before hopping. ${t.hopperName} is on ${round.start} and will hop ${round.hop}.`
              : l < 0 ? `${t.hopperName} is on ${pos}, which is ${-l} too far.` : `${t.hopperName} is on ${pos} with ${l} hops still to go.`,
            moves: moves.slice(-6),
            allowed,
          },
        };
      });

      // What Hoot notices on the river, and a question for a pause that never gives the landing pad away.
      api.companion.watch(() => {
        if (!round) return null;
        const l = left(), who = t.hopperName;
        if (phase === "predict") return { sees: `${who} is on ${round.start} and will hop ${round.hop}`, nudge: `Before hopping, where do you think ${who} will land?` };
        if (phase === "done") return { sees: `${who} caught the ${t.glowOne}` };
        if (l < 0) return { sees: `${who} is on ${pos}, ${-l} too far`, nudge: `${who} went past the ${t.glowOne}. Which button hops back?` };
        return { sees: `${who} is on ${pos} · ${l} to go`, nudge: l >= 10 ? `${l} pads to go. Is there a hop that covers ten pads at once?` : `${l} pads to go. How many little hops is that?` };
      });

      oneBtn.addEventListener("click", () => hop(1));
      tenBtn.addEventListener("click", () => hop(10));
      backBtn.addEventListener("click", () => hop(-1));
      river.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".pad, .frog")) return;
        const r = river.getBoundingClientRect();
        const ring = document.createElement("span");
        ring.className = "water-ripple";
        ring.style.left = `${e.clientX - r.left}px`;
        ring.style.top = `${e.clientY - r.top}px`;
        river.appendChild(ring);
        setTimeout(() => ring.remove(), 750);
        api.sfx.plop();
      });
      const onKey = (e) => {
        if (e.target.closest && e.target.closest("button.pad, input")) return;
        if (e.key === "ArrowRight") hop(1);
        else if (e.key === "ArrowUp") hop(10);
        else if (e.key === "ArrowLeft") hop(-1);
        else return;
        e.preventDefault();
      };
      const onResize = () => frogEl && placeFrog();
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", onResize);

      startRound(0);
      return () => {
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
      };
    },
  });
})();
