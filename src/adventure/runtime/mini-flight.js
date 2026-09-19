// Lantern Flight (after Chapter 2): hold to fly Hoot up, let go to glide, across four night skies. Catch fireflies
// to fill the ten-frame lantern (every full ten lights a home), fly through the ring that answers each sky
// question, ride the wind and dodge clouds. The score rewards lights, right answers and unbroken chains, never
// speed; a cloud bump or a wrong ring only resets the chain. Rules and numbers live in ../flight (unit-tested).
import {
  ASK_AHEAD, GATE_POINTS, GUST_SECONDS, LEGS, LIGHT_POINTS, MEDALS, SMOOTH_LEG_POINTS, STAR_POINTS, TEN_POINTS,
  addLights, basePossible, gateLabel, gatePrompt, gateResult, makeGate, medalFor, missedGateText, multiplier, planLeg,
  recordRun, restoreFlight, rivalScore,
} from "../flight";
import { createRng } from "../../engine/rng";

(function () {
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  // Where the three rings of a sky question sit in the flying band, top to bottom.
  const RING_FRACTIONS = [0.12, 0.5, 0.88];

  window.MQMini.register({
    id: "flight",
    name: "Lantern Flight",
    emoji: "🌙",
    desc: "Fly Hoot across four night skies, fill the lantern ten by ten, and try to beat Pip’s score.",
    chapter: "fireflies",
    start(stage, kit) {
      const S = window.MQS, fx = kit.fx, t = kit.theme;
      const rng = createRng((Math.random() * 0xffffffff) >>> 0);
      const plans = LEGS.map((_, i) => planLeg(i, rng));
      const base = basePossible(plans), rival = rivalScore(base);
      const record = restoreFlight(S.get().flight);
      const pace = kit.reduced ? 0.75 : 1;

      stage.innerHTML = `
        <div class="mf-sky" aria-hidden="true"><span class="mf-moon"></span><div class="mf-stars"></div><div class="mf-stars far"></div></div>
        <div class="mf-hills far" aria-hidden="true"></div>
        <div class="mf-hills near" aria-hidden="true"></div>
        <div class="mf-gust" hidden><b></b></div>
        <div class="mf-homes" aria-hidden="true"></div>
        <div class="mf-world"></div>
        <div class="mf-hoot" aria-label="Hoot carrying the lantern"><span class="mf-owl">🦉</span><span class="mf-lamp">🏮</span></div>
        <div class="mf-hud">
          <p class="mf-score"><span>SCORE</span><b>0</b><em class="mf-mult">×1</em></p>
          <div class="mf-lantern" role="img" aria-label="Lantern: 0 lights" data-lights="0"><div class="mf-frame">${"<i></i>".repeat(10)}</div><p><b class="mf-total">0</b> lights <span class="mf-tens"></span></p></div>
          <p class="mf-rivals"><span>🧚 Pip <b>${fmt(rival)}</b></span><span>⭐ Your best <b>${record.best ? fmt(record.best) : "—"}</b></span></p>
          <p class="mf-ask" role="status" aria-live="polite"></p>
        </div>
        <p class="mf-leg" aria-live="polite" hidden></p>
        <div class="mf-intro">
          <p class="mf-intro-kicker">A FOUR-LEG NIGHT FLIGHT</p>
          <h2>Carry the lantern light home</h2>
          <ol>${LEGS.map((leg) => `<li><span aria-hidden="true">${leg.emoji}</span> ${leg.name}</li>`).join("")}</ol>
          <ul>
            <li><b>Hold</b> to fly up. Let go to glide down.</li>
            <li>Catch <b>fireflies</b> to fill your lantern. Every full ten lights a home.</li>
            <li>When the sky asks a question, fly through the <b>ring</b> that answers it.</li>
            <li>Catches in a row grow your <b>×multiplier</b>. A cloud only breaks the chain.</li>
          </ul>
          <p class="mf-intro-goal">Beat Pip’s <b>${fmt(rival)}</b>${record.best ? ` and your best of <b>${fmt(record.best)}</b>` : ""}!</p>
        </div>`;

      const q = (selector) => stage.querySelector(selector);
      const world = q(".mf-world"), hoot = q(".mf-hoot"), homesEl = q(".mf-homes"), askEl = q(".mf-ask"), legEl = q(".mf-leg"), gustEl = q(".mf-gust");
      const hillsFar = q(".mf-hills.far"), hillsNear = q(".mf-hills.near");
      const lanternEl = q(".mf-lantern"), cells = [...q(".mf-frame").children], totalEl = q(".mf-total"), tensEl = q(".mf-tens");
      const scoreEl = q(".mf-score b"), multEl = q(".mf-mult");
      const W = () => stage.clientWidth, H = () => stage.clientHeight;

      let y = H() * 0.45, vy = 0, holding = false, started = false, ending = false, raf = 0, last = performance.now();
      let legIndex = 0, clock = 0, travelled = 0, nextVisual = 0, nextGust = 0, gust = null, visuals = [], gusts = [];
      let lights = 0, tens = 0, score = 0, chain = 0, bestChain = 0, bumpedLeg = false;
      let gatesAsked = 0, gatesRight = 0, passedPip = false, passedBest = false;
      let bandTop = 90, hudTimer = 0, askTimer = 0, legTimer = 0, endTimer = 0, shownScore = -1, shownMult = 0;
      const things = [];

      /** The flying band starts below the HUD, so nothing to catch hides behind it. */
      function measure() {
        const box = stage.getBoundingClientRect(), hud = q(".mf-hud").getBoundingClientRect();
        bandTop = Math.max(70, hud.bottom - box.top + 44);
      }
      const yAt = (fraction) => bandTop + fraction * Math.max(120, H() - 150 - bandTop);

      function setupLeg(index) {
        legIndex = index;
        clock = 0; nextVisual = 0; nextGust = 0; gust = null; bumpedLeg = false;
        visuals = plans[index].filter((e) => e.kind !== "gust");
        gusts = plans[index].filter((e) => e.kind === "gust");
        things.length = 0;
        world.replaceChildren();
        gustEl.hidden = true;
        stage.dataset.leg = LEGS[index].id;
        homesEl.innerHTML = LEGS[index].village.map((e) => `<span>${e}<i>💤</i></span>`).join("");
      }
      function banner(text) {
        legEl.textContent = text;
        legEl.hidden = false;
        clearTimeout(legTimer);
        legTimer = setTimeout(() => { legEl.hidden = true; }, 2400);
      }
      function say(text, state) {
        askEl.textContent = text;
        askEl.dataset.on = state;
        clearTimeout(askTimer);
        if (state !== "question") askTimer = setTimeout(() => { if (askEl.dataset.on === state) askEl.removeAttribute("data-on"); }, 3600);
      }

      // ---------- Lantern and score ----------
      function renderLantern(fullTen) {
        const ones = lights % 10, tensNow = Math.floor(lights / 10);
        cells.forEach((cell, i) => cell.classList.toggle("on", i < ones));
        totalEl.textContent = String(lights);
        tensEl.textContent = tensNow ? `· ${tensNow} ${tensNow === 1 ? "ten" : "tens"}` : "";
        lanternEl.dataset.lights = String(lights);
        lanternEl.setAttribute("aria-label", `Lantern: ${lights} lights, ${tensNow} tens and ${ones} ones`);
        if (fullTen) {
          lanternEl.classList.remove("full");
          void lanternEl.offsetWidth;
          lanternEl.classList.add("full");
        }
      }
      function gainLights(n, at) {
        const result = addLights(lights, n);
        lights = result.lights;
        if (result.tens) {
          tens += result.tens;
          score += TEN_POINTS * result.tens * multiplier(chain);
          fx.sfx.ten();
          for (let i = 0; i < result.tens; i++) [...homesEl.children].find((home) => !home.classList.contains("lit"))?.classList.add("lit");
          kit.cheer(at.x, at.y - 70, `${Math.floor(lights / 10) * 10} lights!`, 2);
        }
        renderLantern(result.tens > 0);
      }
      function grow() {
        chain += 1;
        bestChain = Math.max(bestChain, chain);
      }
      function renderScore() {
        if (score !== shownScore) {
          shownScore = score;
          scoreEl.textContent = fmt(score);
          const c = fx.center(scoreEl);
          if (!passedPip && score >= rival) { passedPip = true; kit.cheer(c.x + 60, c.y + 70, "You passed Pip!", 2); }
          if (!passedBest && record.best > 0 && score > record.best) { passedBest = true; kit.cheer(c.x + 60, c.y + 110, "New best!", 3); }
        }
        const m = multiplier(chain);
        if (m !== shownMult) {
          shownMult = m;
          multEl.textContent = `×${m}`;
          multEl.dataset.hot = String(m >= 3);
          hoot.classList.toggle("power", m >= 3);
        }
      }

      // ---------- Things in the sky ----------
      function spawn(event) {
        const el = document.createElement("span");
        const thing = { ...event, el, wob: rng.next() * 6 };
        if (event.kind === "cluster") {
          el.className = `mf-fly${event.golden ? " golden" : ""}`;
          el.innerHTML = `<span aria-hidden="true">${event.golden ? "🌟" : t.glow}</span><b>+${event.lights}</b>`;
        } else if (event.kind === "cloud") {
          el.className = "mf-cloud";
          el.textContent = "☁️";
        } else if (event.kind === "star") {
          el.className = "mf-star";
          el.textContent = "🌠";
        } else {
          el.className = "mf-gate";
          el.innerHTML = RING_FRACTIONS.map(() => '<span class="mf-ring"><b>?</b></span>').join("");
          thing.rings = [...el.children];
        }
        world.appendChild(el);
        things.push(thing);
      }
      function catchFly(thing) {
        grow();
        score += LIGHT_POINTS * thing.lights * multiplier(chain);
        thing.el.remove();
        const c = fx.center(hoot);
        fx.burst(c.x, c.y, { count: kit.reduced ? 4 : 10, chars: ["✨", thing.golden ? "🌟" : t.glow], colors: ["#ffe27a", "#fff"], spread: 70 });
        fx.sfx.hop(Math.min(24, chain));
        fx.floatText(c.x + 30, c.y - 40, `+${thing.lights}`, "gold");
        if (chain % 8 === 0) kit.cheer(c.x + 40, c.y - 90, `Chain of ${chain}! ×${multiplier(chain)}`, Math.min(3, chain / 8));
        gainLights(thing.lights, c);
      }
      function catchStar(thing) {
        grow();
        const points = STAR_POINTS * multiplier(chain);
        score += points;
        thing.el.remove();
        const c = fx.center(hoot);
        fx.sfx.combo(5);
        fx.burst(c.x, c.y, { count: kit.reduced ? 5 : 16, chars: ["🌠", "✨"], spread: 110 });
        kit.cheer(c.x + 40, c.y - 90, `Shooting star! +${points}`, 3);
      }
      function bump(thing) {
        thing.bumped = true;
        vy = 260;
        chain = 0;
        bumpedLeg = true;
        hoot.classList.remove("boing");
        void hoot.offsetWidth;
        hoot.classList.add("boing");
        fx.sfx.plop();
        const c = fx.center(hoot);
        fx.floatText(c.x, c.y - 50, "Boing! Chain reset");
      }
      function startGust(event) {
        gust = { until: event.t + GUST_SECONDS, lift: event.lift };
        gustEl.hidden = false;
        gustEl.dataset.lift = event.lift > 0 ? "up" : "down";
        gustEl.firstElementChild.textContent = event.lift > 0 ? "Wind lifts you ↑" : "Wind pushes you down ↓";
        fx.sfx.stretch(6);
      }

      // ---------- Sky questions ----------
      function reveal(thing) {
        const g = makeGate(thing.gate, lights, rng);
        thing.g = g;
        thing.order = rng.shuffle(g.options);
        thing.el.dataset.kind = g.kind;
        thing.rings.forEach((ring, i) => {
          ring.dataset.add = String(thing.order[i]);
          ring.firstElementChild.textContent = gateLabel(g, thing.order[i]);
        });
        gatesAsked += 1;
        say(gatePrompt(g), "question");
        fx.sfx.hoot();
      }
      function pass(thing) {
        thing.passed = true;
        const g = thing.g;
        const hit = thing.rings.findIndex((ring) => Math.abs(y - parseFloat(ring.style.top)) < ring.offsetWidth / 2 + 12);
        if (hit < 0) { say(missedGateText(g), "missed"); return; }
        const add = thing.order[hit], result = gateResult(g, add), ring = thing.rings[hit], c = fx.center(ring);
        if (result.correct) {
          gatesRight += 1;
          grow();
          score += GATE_POINTS * multiplier(chain);
          ring.classList.add("right");
          fx.sfx.good();
          fx.burst(c.x, c.y, { count: kit.reduced ? 6 : 18, chars: ["✨", "⭐", t.glow], spread: 120 });
          kit.cheer(c.x, c.y - 70, g.kind === "nextTen" ? "Perfect ten!" : "Ten more!", 3);
        } else {
          chain = 0;
          ring.classList.add("wrong");
          fx.sfx.plop();
          fx.floatText(c.x, c.y - 50, "Not quite");
        }
        say(result.text, result.correct ? "right" : "wrong");
        gainLights(add, c);
      }

      // ---------- Legs and the finish ----------
      function finishLeg() {
        if (!bumpedLeg) {
          score += SMOOTH_LEG_POINTS;
          const c = fx.center(stage);
          kit.cheer(c.x, c.y - 80, `Smooth flying! +${SMOOTH_LEG_POINTS}`, 2);
        }
        if (legIndex + 1 >= LEGS.length) { end(); return; }
        setupLeg(legIndex + 1);
        const leg = LEGS[legIndex];
        banner(`Leg ${legIndex + 1} of ${LEGS.length} · ${leg.emoji} ${leg.name}`);
        fx.sfx.ten();
      }
      function end() {
        ending = true;
        holding = false;
        renderScore();
        const medal = medalFor(score, base), prize = MEDALS[medal];
        let newBest = false;
        S.update((s) => {
          const result = recordRun(restoreFlight(s.flight), score, medal);
          s.flight = result.record;
          newBest = result.newBest;
        });
        stage.classList.add("glow-all");
        homesEl.querySelectorAll("span").forEach((home) => home.classList.add("lit"));
        askEl.removeAttribute("data-on");
        kit.progress(1, `Home! ${fmt(score)} points`);
        fx.sfx.win();
        const c = fx.center(stage);
        fx.burst(c.x, c.y, { count: kit.reduced ? 8 : 30, chars: ["⭐", "✨", t.glow, prize.emoji], spread: 300 });
        endTimer = setTimeout(() => {
          if (!kit.alive()) return;
          kit.done({
            art: prize.emoji,
            title: `${prize.title} ${t.world} is glowing!`,
            text: `Score ${fmt(score)}${newBest ? ", a new best" : ""}. You lit ${tens} ${tens === 1 ? "ten" : "tens"}, answered ${gatesRight} of ${gatesAsked} sky questions, and your longest chain was ${bestChain}. ${score >= rival ? `You beat Pip’s ${fmt(rival)}!` : `Pip scored ${fmt(rival)}. Fly again to catch up!`}`,
          });
        }, 1400);
      }

      // ---------- The flight loop ----------
      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const h = H(), w = W(), hx = w * 0.22, bottom = h - 130;
        const leg = LEGS[legIndex], speed = leg.speed * pace;
        if (started && !ending) {
          clock += dt;
          travelled += speed * dt;
          while (nextGust < gusts.length && clock >= gusts[nextGust].t) startGust(gusts[nextGust++]);
          if (gust && clock >= gust.until) { gust = null; gustEl.hidden = true; }
          const force = (holding ? -900 : 520) - (gust ? gust.lift * 420 : 0);
          vy = Math.max(-340, Math.min(300, vy + force * dt));
          y += vy * dt;
          if (y < bandTop) { y = bandTop; vy = Math.max(0, vy); }
          if (y > bottom) { y = bottom; vy = Math.min(0, vy); }
          // Bring things on screen as they arrive; a question's rings also appear as soon as it is asked.
          while (nextVisual < visuals.length) {
            const event = visuals[nextVisual];
            const due = hx + (event.t - clock) * speed < w + 90 || (event.kind === "gate" && clock >= event.t - ASK_AHEAD);
            if (!due) break;
            spawn(event);
            nextVisual += 1;
          }
          hillsFar.style.backgroundPositionX = `${-travelled * 0.15}px`;
          hillsNear.style.backgroundPositionX = `${-travelled * 0.4}px`;
        } else if (!started) {
          y = h * 0.45 + Math.sin(now / 400) * 10;
        }
        hoot.style.transform = `translate(${hx}px, ${y}px) rotate(${Math.max(-18, Math.min(18, vy / 18))}deg)`;
        for (let i = things.length - 1; i >= 0; i--) {
          const thing = things[i], x = hx + (thing.t - clock) * speed;
          if (x < -110) {
            thing.el.remove();
            things.splice(i, 1);
            continue;
          }
          if (thing.kind === "gate") {
            thing.el.style.transform = `translateX(${x}px)`;
            thing.rings.forEach((ring, k) => { ring.style.top = `${yAt(RING_FRACTIONS[k])}px`; });
            if (!thing.g && clock >= thing.t - ASK_AHEAD) reveal(thing);
            if (started && !ending && thing.g && !thing.passed && clock >= thing.t) pass(thing);
            continue;
          }
          thing.wob += dt;
          const ty = yAt(thing.y) + Math.sin(thing.wob * 2) * (thing.kind === "cloud" ? 4 : 10);
          thing.el.style.transform = `translate(${x}px, ${ty}px)`;
          if (!started || ending || thing.bumped) continue;
          if (Math.hypot(x - hx, ty - (y + 10)) < (thing.kind === "cloud" ? 46 : 30) + 34) {
            if (thing.kind === "cloud") bump(thing);
            else {
              things.splice(i, 1);
              if (thing.kind === "star") catchStar(thing);
              else catchFly(thing);
            }
          }
        }
        if (started && !ending) {
          renderScore();
          hudTimer -= dt;
          if (hudTimer <= 0) {
            hudTimer = 0.25;
            kit.progress((legIndex + Math.min(1, clock / leg.duration)) / LEGS.length, `Leg ${legIndex + 1} of ${LEGS.length} · ${fmt(score)} points`);
          }
          if (clock >= leg.duration) finishLeg();
        }
        raf = requestAnimationFrame(frame);
      }

      const press = (e) => {
        if (ending || e.target.closest("button")) return;
        holding = true;
        if (!started) {
          started = true;
          stage.classList.add("flying");
          kit.hideHint();
          measure();
          banner(`Leg 1 of ${LEGS.length} · ${LEGS[0].emoji} ${LEGS[0].name}`);
        }
        fx.sfx.stretch(10);
      };
      const release = () => (holding = false);
      const keyDown = (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
          e.preventDefault();
          press({ target: stage });
        }
      };
      const keyUp = (e) => (e.code === "Space" || e.code === "ArrowUp") && release();
      stage.addEventListener("pointerdown", press);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      window.addEventListener("resize", measure);

      setupLeg(0);
      renderLantern(false);
      measure();
      kit.progress(0, `Leg 1 of ${LEGS.length} · 0 points`);
      kit.hint("👆", "Hold anywhere or press Space to take off!");
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(askTimer);
        clearTimeout(legTimer);
        clearTimeout(endTimer);
        stage.removeEventListener("pointerdown", press);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("resize", measure);
      };
    },
  });
})();
