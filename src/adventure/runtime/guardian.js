// Level 3, Guardian Duel: a card battle. Drag (or tap) two number cards into the spell to match the
// Guardian's shield. Between shields the Guardian casts a riddle to block, and Pip casts a buggy spell
// the child fixes and then explains (see guardian-extras.js).
// Arcade layer: a boss bar, spells that charge and fly, critical hits for first-try spells, shields that
// shatter, and a leaf gust when the Guardian blocks a spell that does not match.
import { makeNumberShield } from "../learning";
import { createRng } from "../../engine/rng";
import { generateOperands } from "../../engine/generators";
(function () {
  const STORY_SHIELDS = [
    { target: 45, hand: [28, 17, 20, 27, 15] },
    { target: 63, hand: [38, 25, 35, 28, 24] },
    { target: 80, hand: [46, 34, 44, 36, 26] },
  ];
  const MOUTH = { ready: "M106 192q14 10 28 0", hit: "M108 198q12 -10 24 0", laugh: "M103 188q17 20 34 0", proud: "M102 188q18 16 36 0" };
  const TREE = `<svg class="tree" viewBox="0 0 240 232" aria-hidden="true">
      <rect class="trunk" x="84" y="118" width="72" height="108" rx="24"/>
      <circle class="canopy" cx="120" cy="88" r="72"/>
      <circle class="canopy-light" cx="64" cy="116" r="46"/>
      <circle class="canopy-light" cx="176" cy="114" r="48"/>
      <circle class="eye" cx="105" cy="160" r="12"/><circle class="eye" cx="135" cy="160" r="12"/>
      <circle class="pupil" cx="107" cy="163" r="5.5"/><circle class="pupil" cx="137" cy="163" r="5.5"/>
      <path class="mouth" id="mouth" d="${MOUTH.ready}"/>
    </svg>`;

  MQ.register({
    id: "guardian",
    name: "Guardian Duel",
    emoji: "🌳",
    title: (t) => `${t.guardianName} Duel`,
    icon: (t) => t.guardian,
    boss: true,
    stageClass: "duel-stage",
    mount(stage, api) {
      const t = api.theme;
      const arc = api.arcade;
      const rng = createRng(Math.floor(Math.random() * 0xffffffff));
      const replay = Boolean(api.state.chapters.guardian);
      const opening = api.learningPlan("regroup");
      const SHIELDS = replay || opening.level < 3
        ? Array.from({ length: 3 }, () => makeNumberShield(opening.level, rng))
        : STORY_SHIELDS.map((s) => ({ ...s, hand: [...s.hand], skill: "regroup", level: 3 }));
      const riddlePlan = api.learningPlan("wordProblems");
      const RIDDLE = replay || riddlePlan.level < 3 ? { ...generateOperands("wordProblems", riddlePlan.level, rng), level: riddlePlan.level } : { a: 19, b: 6, level: 3 };
      const body = t.guardian === "🌳"
        ? TREE
        : `<div class="tree emoji-guardian" aria-hidden="true" style="font-size:min(190px, 26vh);line-height:1;text-align:center;filter:drop-shadow(0 14px 10px rgba(36,59,83,.25))">${t.guardian}</div>`;
      stage.innerHTML = `
        <div class="duel" id="duel">
          <p class="duel-speech" id="speech" aria-live="polite"></p>
          <div class="duel-top">
            <div class="guardian" id="guardian">
              <div class="shields" id="shields"></div>
              ${body}
            </div>
          </div>
          <div class="spell" id="spell" aria-live="polite">
            <span class="spell-slot" aria-label="First card">?</span>
            <span class="spell-op" aria-hidden="true">+</span>
            <span class="spell-slot" aria-label="Second card">?</span>
            <span class="spell-op" aria-hidden="true">=</span>
            <span class="spell-total" id="spellTotal">?</span>
            <button type="button" class="spell-help" aria-label="Build the spell with blocks" title="Build the spell with blocks">▦</button>
          </div>
          <div class="hand" id="hand" role="group" aria-label="Your number cards. Drag or tap two."></div>
          <div class="pip-event" id="pipEvent" hidden></div>
        </div>`;

      const q = (id) => stage.querySelector(`#${id}`);
      const duel = q("duel");
      const guardianEl = q("guardian");
      const speechEl = q("speech");
      const spell = q("spell");
      const totalEl = q("spellTotal");
      const handEl = q("hand");
      const pipEl = q("pipEvent");
      const slotEls = [...spell.querySelectorAll(".spell-slot")];
      const shieldEls = SHIELDS.map((s) => {
        const el = document.createElement("span");
        el.className = "shield";
        el.innerHTML = `<span>${s.target}</span>`;
        q("shields").appendChild(el);
        return el;
      });
      // The boss bar counts the shields still standing.
      const bossBar = document.createElement("div");
      bossBar.className = "boss-bar";
      bossBar.setAttribute("role", "img");
      bossBar.innerHTML = '<span class="boss-name"></span><span class="boss-hp" aria-hidden="true"><i class="boss-ghost"></i><i class="boss-fill"></i></span>';
      bossBar.querySelector(".boss-name").textContent = t.guardianName;
      q("shields").appendChild(bossBar);
      function drainBar(left) {
        bossBar.style.setProperty("--hp", `${(left / SHIELDS.length) * 100}%`);
        bossBar.setAttribute("aria-label", `${t.guardianName}: ${left} of ${SHIELDS.length} shields left`);
      }
      drainBar(SHIELDS.length);

      let index = 0;
      let slots = [null, null];
      let misses = 0;
      let busy = false;
      let taught = false;
      let blockedFirstTry = false;
      let shieldAttempt = 1;
      let hintsBefore = api.hintsUsed();
      let usedBlocks = false;
      function setBusy(value) {
        busy = value;
        handEl.setAttribute("aria-busy", String(value));
        handEl.querySelectorAll("button").forEach((card) => { card.disabled = value; });
        stage.querySelector(".spell-help").disabled = value;
      }
      const moves = [];
      const log = (text) => {
        moves.push(text);
        if (moves.length > 8) moves.shift();
      };
      function buildWithBlocks() {
        if (busy) return;
        usedBlocks = true;
        const target = SHIELDS[index].target;
        const selected = slots.find(Boolean);
        const numbers = [{ n: target, label: "The shield needs" }, ...(selected ? [{ n: Number(selected.dataset.n), label: "Your first card has" }] : [])];
        const dialog = document.createElement("dialog");
        dialog.className = "builder-dialog";
        dialog.setAttribute("aria-labelledby", "builderTitle");
        dialog.innerHTML = `<p class="eyebrow">LET’S MAKE IT VISIBLE</p><h2 id="builderTitle">Build a number spell</h2><p>${selected ? "What is missing from your first card to fill the shield? Count the tens, then the ones." : "Each long block is ten. Each little block is one. Pick a card, then come back to compare."}</p><div class="builder-models">${numbers.map(({ n, label }) => `<section><h3>${label} <b>${n}</b></h3><div class="builder-blocks" role="img" aria-label="${Math.floor(n / 10)} tens and ${n % 10} ones">${Array.from({ length: Math.floor(n / 10) }, () => '<i class="build-ten"></i>').join("")}${Array.from({ length: n % 10 }, () => '<i class="build-one"></i>').join("")}</div><p>${Math.floor(n / 10)} tens + ${n % 10} ones</p></section>`).join("")}</div><p class="builder-tip">Ten ones can trade for one ten. The amount stays the same.</p><button type="button" class="btn">Try my spell →</button>`;
        stage.appendChild(dialog);
        dialog.querySelector("button").onclick = () => dialog.close();
        dialog.addEventListener("close", () => { dialog.remove(); stage.querySelector(".spell-help")?.focus(); });
        dialog.showModal();
      }
      stage.querySelector(".spell-help").addEventListener("click", buildWithBlocks);

      const say = (text) => {
        speechEl.textContent = text;
        speechEl.classList.remove("pop");
        void speechEl.offsetWidth;
        speechEl.classList.add("pop");
      };
      function setMood(mood) {
        const mouth = q("mouth");
        if (mouth) {
          mouth.setAttribute("d", MOUTH[mood]);
          return;
        }
        const face = guardianEl.querySelector(".emoji-guardian");
        const frames = {
          hit: [{ transform: "scale(1)" }, { transform: "scale(1.1, 0.85)" }, { transform: "scale(1)" }],
          laugh: [{ transform: "rotate(0)" }, { transform: "rotate(-8deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(0)" }],
          proud: [{ transform: "translateY(0)" }, { transform: "translateY(-18px)" }, { transform: "translateY(0)" }],
        }[mood];
        if (face && frames) face.animate(frames, { duration: 520, easing: "ease-in-out" });
      }

      function updateShields() {
        shieldEls.forEach((el, i) => {
          el.classList.toggle("current", i === index);
          el.setAttribute("aria-label", i < index ? "Broken shield" : `Shield ${SHIELDS[i].target}`);
        });
      }

      function deal() {
        handEl.replaceChildren();
        SHIELDS[index].hand.forEach((n, i) => {
          const card = document.createElement("button");
          card.type = "button";
          card.disabled = busy;
          card.className = "card";
          card.dataset.n = String(n);
          card.style.setProperty("--tilt", `${(i - 2) * 4}deg`);
          card.innerHTML = `<span class="card-rune" aria-hidden="true">✦</span><span class="card-num">${n}</span>`;
          card.setAttribute("aria-label", `Card ${n}`);
          setupDrag(card);
          handEl.appendChild(card);
          card.animate(
            [{ transform: `translateY(140px) rotate(${(i - 2) * 10}deg)`, opacity: 0 }, { transform: `translateY(0) rotate(${(i - 2) * 4}deg)`, opacity: 1 }],
            { duration: 460, delay: i * 80, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" },
          );
        });
      }

      // ---------- Drag or tap a card ----------
      function slotUnder(x, y) {
        const hit = slotEls.findIndex((s) => {
          const r = s.getBoundingClientRect();
          return x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 24 && y <= r.bottom + 24;
        });
        if (hit !== -1) return hit;
        const r = spell.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top - 30 && y <= r.bottom + 30 ? slots.indexOf(null) : -1;
      }
      function setupDrag(card) {
        let pointer = null;
        let start = null;
        let ghost = null;
        const move = (e) => {
          if (e.pointerId !== pointer) return;
          if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
            ghost = document.createElement("span");
            ghost.className = "drag-card";
            ghost.textContent = card.dataset.n;
            document.getElementById("fx").appendChild(ghost);
            card.classList.add("lifted");
            api.sfx.stretch(8);
          }
          if (!ghost) return;
          ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) rotate(-6deg)`;
          const s = slotUnder(e.clientX, e.clientY);
          slotEls.forEach((el, i) => el.classList.toggle("hover", i === s && !slots[i]));
        };
        const up = (e) => {
          if (e.pointerId !== pointer) return;
          pointer = null;
          card.removeEventListener("pointermove", move);
          slotEls.forEach((el) => el.classList.remove("hover"));
          if (!ghost) {
            pick(card);
            return;
          }
          const s = slotUnder(e.clientX, e.clientY);
          ghost.remove();
          ghost = null;
          card.classList.remove("lifted");
          if (s !== -1 && !slots[s]) pick(card, s, true);
          else api.sfx.tap();
        };
        card.addEventListener("pointerdown", (e) => {
          if (busy || card.classList.contains("used")) {
            if (!busy) pick(card);
            return;
          }
          pointer = e.pointerId;
          start = { x: e.clientX, y: e.clientY };
          card.setPointerCapture(pointer);
          card.addEventListener("pointermove", move);
        });
        card.addEventListener("pointerup", up);
        card.addEventListener("pointercancel", up);
        card.addEventListener("click", (e) => {
          if (e.detail === 0) pick(card);
        });
      }

      function ghostFly(fromEl, toEl, text) {
        const a = fromEl.getBoundingClientRect();
        const b = toEl.getBoundingClientRect();
        const g = document.createElement("span");
        g.className = "card-ghost";
        g.textContent = text;
        g.style.width = `${a.width}px`;
        g.style.height = `${a.height}px`;
        document.getElementById("fx").appendChild(g);
        g.animate(
          [{ transform: `translate(${a.left}px, ${a.top}px)` }, { transform: `translate(${b.left}px, ${b.top}px) scale(${b.width / a.width}, ${b.height / a.height})` }],
          { duration: 260, easing: "cubic-bezier(.3,.7,.3,1)" },
        ).onfinish = () => g.remove();
      }

      function pick(card, slotIndex, dropped) {
        if (busy) return;
        if (card.classList.contains("used")) {
          const i = slots.indexOf(card);
          slots[i] = null;
          card.classList.remove("used");
          slotEls[i].textContent = "?";
          slotEls[i].classList.remove("filled");
          api.sfx.tap();
          return;
        }
        const i = slotIndex !== undefined && !slots[slotIndex] ? slotIndex : slots.indexOf(null);
        if (i === -1) return;
        slots[i] = card;
        card.classList.add("used");
        api.sfx.hop(i * 5);
        if (dropped) {
          slotEls[i].textContent = card.dataset.n;
          slotEls[i].classList.add("filled");
          const c = api.center(slotEls[i]);
          api.burst(c.x, c.y, { count: 6, spread: 40 });
        } else {
          ghostFly(card, slotEls[i], card.dataset.n);
          setTimeout(() => {
            if (slots[i] !== card) return;
            slotEls[i].textContent = card.dataset.n;
            slotEls[i].classList.add("filled");
          }, 230);
        }
        if (slots.every(Boolean)) cast();
      }

      function clearSpell() {
        slots.forEach((c) => c && c.classList.remove("used"));
        slots = [null, null];
        slotEls.forEach((s) => {
          s.textContent = "?";
          s.classList.remove("filled");
        });
        totalEl.textContent = "?";
        totalEl.classList.remove("show");
        spell.classList.remove("charging", "fizzle");
      }

      async function cast() {
        setBusy(true);
        const [a, b] = slots.map((c) => Number(c.dataset.n));
        const total = a + b;
        const target = SHIELDS[index].target;
        api.observe({ skill: SHIELDS[index].skill, level: SHIELDS[index].level, format: "missingAddend", correct: total === target, attempt: shieldAttempt, hintLevel: usedBlocks || api.hintsUsed() > hintsBefore ? 1 : 0 });
        if (total !== target) shieldAttempt += 1;
        await api.wait(380);
        if (!api.alive()) return;
        spell.classList.add("charging");
        arc.charge(totalEl);
        api.sfx.zap();
        totalEl.textContent = String(total);
        totalEl.classList.add("show");
        await api.wait(520);
        if (!api.alive()) return;
        if (total === target) await breakShield(a, b, target);
        else await fizzle(a, b, total, target);
      }

      async function bolt(fromEl, toEl, big = false) {
        const from = api.center(fromEl);
        const to = api.center(toEl);
        const orb = document.createElement("span");
        orb.className = big ? "bolt big" : "bolt";
        document.getElementById("fx").appendChild(orb);
        const dur = api.reduced ? 120 : 420;
        arc.snd.whoosh();
        arc.trail(orb, dur);
        await orb.animate(
          [{ transform: `translate(${from.x}px, ${from.y}px) scale(0.6)` }, { transform: `translate(${to.x}px, ${to.y}px) scale(1.3)` }],
          { duration: dur, easing: "cubic-bezier(.5,0,.8,.6)" },
        ).finished;
        orb.remove();
        return to;
      }

      async function breakShield(a, b, target) {
        const shield = shieldEls[index];
        // A spell that works on the first try lands as a critical hit.
        const critical = shieldAttempt === 1;
        log(`broke shield ${target} with ${a} + ${b}`);
        const to = await bolt(totalEl, shield, critical);
        if (!api.alive()) return;
        api.sfx.hit();
        arc.shatter(shield);
        drainBar(SHIELDS.length - index - 1);
        await arc.impact({ x: to.x, y: to.y, power: critical ? 3 : 2, tone: critical ? "coral" : "gold", world: [guardianEl] });
        if (!api.alive()) return;
        api.shake(guardianEl, 12);
        setMood("hit");
        if (!api.reduced) guardianEl.querySelector(".tree")?.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8) saturate(0.6)" }, { filter: "brightness(1)" }], { duration: 300, easing: "ease-out" });
        shield.classList.add("broken");
        shield.classList.remove("current");
        api.burst(to.x, to.y, { count: 20, chars: ["🍃", "✨", t.glow], colors: ["#2eb872", "#ffc933"], spread: 160 });
        // The number sentence rises from the spell itself, clear of the boss bar above the shields.
        const cast = api.center(spell);
        api.floatText(cast.x, cast.y - 76, `${a} + ${b} = ${target}!`, "gold");
        const g = api.center(guardianEl);
        if (critical) arc.note("critical");
        arc.hit({ points: target * 10 * (critical ? 2 : 1), x: g.x, y: g.y + 70, word: critical ? "Critical!" : "Shield break!", tone: critical ? "coral" : "gold", wordY: g.y - 50 });
        api.addCoins(3, to);
        say(index === 0 ? "Ouch! You found my number. Now block my riddle!" : "Ouch! You found my number!");
        await api.wait(1500);
        if (!api.alive()) return;
        clearSpell();
        index += 1;
        api.emit("solved", { afterMistake: misses > (breakShield.missesBefore || 0) });
        breakShield.missesBefore = misses;
        api.fact(`broke the ${target} shield with ${a} + ${b}`);
        if (index === 1) {
          blockedFirstTry = await window.MQDuel.riddle({ host: duel, api, ...RIDDLE, charm: api.state.choice === "gave" });
          if (!api.alive()) return;
          api.emit("riddleBlocked", { firstTry: blockedFirstTry });
          api.fact(blockedFirstTry ? `blocked the riddle ${RIDDLE.a} + ${RIDDLE.b} on the first try` : `solved the riddle ${RIDDLE.a} + ${RIDDLE.b} after trying again`);
          log(blockedFirstTry ? "blocked the riddle on the first try" : "blocked the riddle");
        }
        if (index === 2) {
          const result = await window.MQTeach.mistake({ host: duel, api, id: "carry513", chapter: "guardian" });
          if (!api.alive()) return;
          taught = result.taught;
          await bolt(handEl, guardianEl);
          if (!api.alive()) return;
          api.sfx.hit();
          api.shake(guardianEl, 8);
          const c = api.center(guardianEl);
          api.burst(c.x, c.y, { count: 14, chars: ["✨", "🧚"], spread: 140 });
          api.addCoins(4, c);
          arc.impact({ x: c.x, y: c.y, power: 1, tone: "sky", world: [guardianEl] });
          arc.bonus({ points: 400, x: c.x, y: c.y - 60, label: "Teamwork!", tone: "leaf" });
        }
        if (index >= SHIELDS.length) return win();
        const nextPlan = api.learningPlan("regroup");
        const gentler = nextPlan.level < 3;
        if (gentler || replay) {
          SHIELDS[index] = makeNumberShield(nextPlan.level, rng);
          shieldEls[index].querySelector("span").textContent = String(SHIELDS[index].target);
        }
        shieldAttempt = 1;
        hintsBefore = api.hintsUsed();
        usedBlocks = false;
        setMood("ready");
        say(gentler ? `Let's try a spell with one small card. This shield needs ${SHIELDS[index].target}. Tap ▦ to see the blocks!` : `My next shield is ${SHIELDS[index].target}. Pick two cards that make ${SHIELDS[index].target}!`);
        updateShields();
        deal();
        setBusy(false);
        if (index === SHIELDS.length - 1) arc.banner("Final shield!", { tone: "coral" });
      }

      async function fizzle(a, b, total, target) {
        misses += 1;
        const diff = total - target;
        api.emit("miss");
        api.fact(`tried ${a} + ${b} = ${total} on the ${target} shield`);
        log(`tried ${a} + ${b} = ${total}, ${Math.abs(diff)} too ${diff > 0 ? "many" : "few"}`);
        api.sfx.fizzle();
        arc.miss();
        spell.classList.add("fizzle");
        const c = api.center(totalEl);
        api.burst(c.x, c.y, { count: 10, chars: ["💨"], colors: ["#c9d3dd", "#e6ecf1"], spread: 70 });
        api.floatText(c.x, c.y - 44, diff > 0 ? `${diff} too many!` : `${-diff} too few!`, "warm");
        // The Guardian's shield shrugs the spell off: a glint, a leaf gust and a word, never a penalty.
        const shield = shieldEls[index];
        const s = api.center(shield);
        arc.say(s.x, s.y - 70, "Blocked!", "sky");
        arc.gust();
        if (!api.reduced) shield.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.7)" }, { filter: "brightness(1)" }], { duration: 320, easing: "ease-out" });
        setMood("laugh");
        say(diff > 0 ? `Hoo hoo! ${total} is more than ${target}. Try again!` : `Hoo hoo! ${total} is less than ${target}. Try again!`);
        if (misses === 2) api.nudgeHoot();
        await api.wait(1100);
        if (!api.alive()) return;
        clearSpell();
        setMood("ready");
        setBusy(false);
      }

      async function win() {
        setMood("proud");
        updateShields();
        drainBar(0);
        handEl.replaceChildren();
        guardianEl.classList.add("bow");
        say(`You broke all my shields! ${t.world} is yours to explore.`);
        api.sfx.good();
        const c = api.center(guardianEl);
        arc.banner("Shields down!", { sub: `You woke the ${t.guardianName}!`, tone: "gold" });
        arc.fireworks(5);
        api.burst(c.x, c.y, { count: 28, chars: ["🍃", "⭐", "✨", t.glow], spread: 260 });
        arc.bonus({ points: 1000, x: c.x, y: c.y - 40, label: "Victory +1,000", tone: "gold", pop: false });
        await api.wait(1500);
        if (!api.alive()) return;
        const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
        api.finish({
          stars,
          emoji: "🏆",
          title: `You beat the ${t.guardianName}!`,
          note: taught
            ? "You broke every shield, blocked a riddle, and taught Pip how carrying works. Teaching is the best way to learn!"
            : "You broke every shield. Checking the ones digits first helps you find the right pair faster.",
        });
      }

      guardianEl.addEventListener("click", () => {
        if (busy) return;
        api.sfx.pop();
        setMood("laugh");
        api.shake(guardianEl, 4);
        const c = api.center(guardianEl);
        api.floatText(c.x, c.y - 80, "Hee hee, that tickles!");
      });

      api.setHint(() => {
        if (duel.querySelector(".riddle")) {
          const ones = RIDDLE.a % 10 + RIDDLE.b % 10;
          return `Start with the ones: ${RIDDLE.a % 10} + ${RIDDLE.b % 10} = ${ones}. ${ones >= 10 ? "Trade ten ones for one ten. " : ""}Then put the tens and ones together.`;
        }
        if (!pipEl.hidden) return "Add the ones first: 8 + 5 = 13. Ten of those ones make one more ten.";
        const shield = SHIELDS[index];
        if (!shield) return "You did it!";
        const { target, hand } = shield;
        let pair = null;
        for (let i = 0; i < hand.length && !pair; i++) {
          for (let j = i + 1; j < hand.length; j++) if (hand[i] + hand[j] === target) pair = [hand[i], hand[j]];
        }
        const o1 = pair[0] % 10;
        const o2 = pair[1] % 10;
        const text = `Check the ones digits. ${target} ends in ${target % 10}. Which two cards have ones that add up like ${o1} + ${o2} = ${o1 + o2}?`;
        if (moves.length === 0) return text;
        const tried = moves.flatMap((m) => (m.match(/\d+/g) || []).map(Number));
        return {
          text,
          facts: {
            game: `A card battle. The child picks two number cards whose sum matches the ${t.guardianName}'s shield number.`,
            goal: `Shield number: ${target}. Cards in hand: ${hand.join(", ")}.`,
            moves: moves.slice(-6),
            allowed: [...new Set([target, target % 10, 10, ...tried])],
          },
        };
      });

      // What Hoot notices in the duel, and a question for a pause that never names the right cards.
      api.companion.watch(() => {
        if (duel.querySelector(".riddle")) return { sees: `A riddle about ${RIDDLE.a} and ${RIDDLE.b}`, nudge: "What does the riddle ask you to find?" };
        if (!pipEl.hidden) return { sees: "Pip is showing a spell", nudge: "What do you notice about how Pip added the ones?" };
        const shield = SHIELDS[index];
        if (!shield) return { sees: "Every shield is broken" };
        const first = slots.find(Boolean);
        return first
          ? { sees: `Shield ${shield.target} · your first card is ${first.dataset.n}`, nudge: `Your first card is ${first.dataset.n}. How much more does it need to make ${shield.target}?` }
          : { sees: `Shield ${shield.target} · ${shield.hand.length} cards in your hand`, nudge: `Which two cards together could make ${shield.target}?` };
      });

      say(`I am the ${t.guardianName}! Break my shield of ${SHIELDS[0].target}. Drag two cards that make ${SHIELDS[0].target} into the spell.`);
      updateShields();
      deal();
    },
  });
})();
