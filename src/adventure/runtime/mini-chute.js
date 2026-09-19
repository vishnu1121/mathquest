// Number Chute: the upper-class bonus game, in two modes. Crystals fall down four chutes and the child
// slides the catcher under the ones that belong. Rules, waves and scoring are pure code in ../chute.ts;
// this module only draws, moves and asks. Bonus play never counts as curriculum mastery.
import { CATCH_POINTS, EXACT_POINTS, LANES, LIVES, MEDALS, WAVES, WAVE_POINTS, basePossible, comboMultiplier, judge, medalFor, planWave, recordRun, remaining, restoreChute, rivalScore } from "../chute";
import { createRng } from "../../engine/rng";

(function () {
  const S = window.MQS;
  const esc = (v) => window.MQClassArt.esc(String(v));
  const BAND = 0.84; // where down the chute the catcher sits

  function start(stage, kit, mode) {
    const grade = kit.grade === "5" ? "5" : kit.grade === "4" ? "4" : "3";
    const slow = kit.reduced ? 1.6 : 1;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const waves = Array.from({ length: WAVES }, (_, i) => planWave(mode, grade, i, createRng(seed + i * 7919)));
    const base = basePossible(mode, waves), rival = rivalScore(base);
    const key = mode === "sort" ? "chuteSort" : "chuteExact";
    let record = restoreChute((S.get().best || {})[key]);

    let waveIndex = 0, wave = waves[0], score = 0, chain = 0, bestChain = 0, lives = LIVES, lane = 1;
    let caught = 0, total = 0, queue = [], live = [], spawnAt = 0, raf = null, running = false, finished = false;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    stage.innerHTML = `<div class="ch-game" data-mode="${mode}">
      <div class="ch-hud">
        <p class="ch-rule" role="status"></p>
        <div class="ch-stats"><span class="ch-score">0</span><span class="ch-mult">×1</span><span class="ch-lives" aria-label="Lives left"></span></div>
      </div>
      <div class="ch-load" role="status"></div>
      <div class="ch-well"><div class="ch-grid" aria-hidden="true">${Array.from({ length: LANES }, () => "<i></i>").join("")}</div>
        <div class="ch-drops" aria-hidden="true"></div>
        <div class="ch-catcher" style="--lane:${lane}" aria-hidden="true"><span>🧺</span></div></div>
      <div class="ch-controls" role="group" aria-label="Move the catcher">${Array.from({ length: LANES }, (_, i) => `<button type="button" data-lane="${i}" aria-label="Move the catcher to chute ${i + 1}">${i + 1}</button>`).join("")}</div>
      <p class="ch-hint"></p>
      <div class="ch-start"><h3>${mode === "sort" ? "Only the right numbers belong in the basket." : "Fill each order exactly — never over."}</h3>
        <p>Move the catcher with the buttons, the arrow keys, or by touching a chute. ${mode === "sort" ? "Let the wrong ones fall past." : "Watch what is left to fill."}</p>
        <p class="ch-rival">Pip scored <b>${rival}</b>${record.best ? ` · your best is <b>${record.best}</b> ${record.medal ? MEDALS[record.medal] : ""}` : ""}</p>
        <button type="button" class="btn ch-go">Start the run →</button></div></div>`;

    const q = (sel) => stage.querySelector(sel);
    const well = q(".ch-well"), drops = q(".ch-drops"), catcher = q(".ch-catcher");
    const setLane = (next) => { lane = Math.max(0, Math.min(LANES - 1, next)); catcher.style.setProperty("--lane", lane); };
    const hud = () => {
      q(".ch-score").textContent = score;
      q(".ch-mult").textContent = `×${comboMultiplier(chain)}`;
      q(".ch-lives").textContent = "❤".repeat(lives) + "♡".repeat(LIVES - lives);
    };
    const load = () => {
      q(".ch-load").innerHTML = mode === "exact"
        ? `<b>${total}</b> of <b>${wave.target}</b> · <span>${remaining(total, wave.target)} to go</span>`
        : `<b>${caught}</b> of <b>${wave.quota}</b> caught · <span>wave ${waveIndex + 1} of ${WAVES}</span>`;
    };

    function announce(text, tone) {
      const note = document.createElement("p");
      note.className = `ch-flash ${tone}`;
      note.textContent = text;
      well.append(note);
      later(() => note.remove(), 900);
    }
    function beginWave() {
      wave = waves[waveIndex];
      caught = 0; total = 0; queue = [...wave.drops]; live.forEach((d) => d.el.remove()); live = [];
      q(".ch-rule").textContent = wave.rule;
      q(".ch-hint").textContent = wave.hint;
      spawnAt = performance.now();
      load(); hud();
    }
    function spawn(now) {
      const plan = queue.shift();
      if (!plan) return;
      const el = document.createElement("span");
      el.className = "ch-drop";
      el.style.setProperty("--lane", plan.lane);
      el.innerHTML = `<b>${esc(plan.label)}</b>`; // the crystal is a pseudo-element, so the number needs its own box
      drops.append(el);
      live.push({ ...plan, el, born: now });
    }
    function resolve(drop, hit) {
      drop.el.remove();
      live = live.filter((d) => d !== drop);
      if (mode === "sort") {
        if (hit && drop.good) {
          chain += 1; bestChain = Math.max(bestChain, chain); caught += 1;
          score += CATCH_POINTS * comboMultiplier(chain);
        } else if (hit) { chain = 0; lives -= 1; announce(`${drop.value} is not one of them`, "bad"); kit.fx?.sfx?.wrong?.(); }
        else if (drop.good) { chain = 0; announce(`${drop.value} slipped past`, "miss"); }
      } else if (hit) {
        const verdict = judge(total, drop.value, wave.target);
        if (verdict === "over") { chain = 0; lives -= 1; total = 0; announce(`${drop.value} would spill the load`, "bad"); kit.fx?.sfx?.wrong?.(); }
        else {
          chain += 1; bestChain = Math.max(bestChain, chain);
          total = Math.round((total + drop.value) * 10) / 10;
          score += CATCH_POINTS * comboMultiplier(chain);
          if (verdict === "exact") { score += EXACT_POINTS; announce(`Exactly ${wave.target}!`, "good"); }
        }
      }
      hud(); load();
      kit.progress?.((waveIndex + (mode === "sort" ? caught / Math.max(1, wave.quota) : total / wave.target)) / WAVES, `Wave ${waveIndex + 1} of ${WAVES}`);
      if (lives <= 0) return end();
      const done = mode === "sort" ? caught >= wave.quota : total === wave.target;
      if (done) return clearWave();
      if (!queue.length && !live.length) return clearWave(true);
    }
    function clearWave(ranOut = false) {
      if (!running) return; // two crystals can finish the wave in the same frame
      running = false;
      if (!ranOut) { score += WAVE_POINTS; announce("Wave complete!", "good"); }
      hud();
      later(() => {
        waveIndex += 1;
        if (waveIndex >= WAVES) return end();
        beginWave(); running = true; spawnAt = performance.now(); raf = requestAnimationFrame(frame);
      }, 1100);
    }
    function frame(now) {
      if (!running || !kit.alive()) return;
      if (queue.length && now >= spawnAt) { spawn(now); spawnAt = now + wave.gapMs * slow; }
      const height = well.clientHeight || 360;
      for (const drop of [...live]) {
        const progress = (now - drop.born) / (wave.fallMs * slow);
        drop.el.style.setProperty("--y", `${Math.min(1, progress) * height}px`);
        if (progress >= BAND) resolve(drop, drop.lane === lane);
      }
      if (running) raf = requestAnimationFrame(frame);
    }
    function end() {
      if (finished) return;
      finished = true; running = false;
      if (raf) cancelAnimationFrame(raf);
      const medal = medalFor(score, base);
      const saved = recordRun(record, score, medal);
      record = saved.record;
      S.update((s) => { s.best = { ...(s.best || {}), [key]: record }; });
      later(() => kit.done({
        coins: medal === "gold" ? 8 : medal === "silver" ? 6 : 5, // a harder-won medal is worth more
        art: medal ? MEDALS[medal] : "🧺",
        title: score >= rival ? `${score} points — you beat Pip!` : `${score} points`,
        text: `${mode === "sort" ? `You sorted ${waveIndex >= WAVES ? "every wave" : `${waveIndex} of ${WAVES} waves`}` : `You filled ${waveIndex >= WAVES ? "every order" : `${waveIndex} of ${WAVES} orders`}`}, with a best streak of ${bestChain}. Pip scored ${rival}.${saved.newBest ? " A new best!" : ""}`,
      }), 900);
    }

    // ---------- Controls: buttons, arrow keys and touching a chute all move the same catcher ----------
    const onKey = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setLane(lane - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); setLane(lane + 1); }
    };
    const onPoint = (e) => {
      const box = well.getBoundingClientRect();
      if (!box.width) return;
      setLane(Math.floor(((e.clientX - box.left) / box.width) * LANES));
    };
    stage.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lane]");
      if (b) { setLane(Number(b.dataset.lane)); return; }
      if (e.target.closest(".ch-go")) {
        q(".ch-start").remove();
        beginWave(); running = true; spawnAt = performance.now(); raf = requestAnimationFrame(frame);
      }
    });
    well.addEventListener("pointerdown", onPoint);
    well.addEventListener("pointermove", (e) => { if (e.buttons) onPoint(e); });
    window.addEventListener("keydown", onKey);
    hud();
    q(".ch-go").focus({ preventScroll: true });

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
  }

  window.MQChute = { start };
})();
