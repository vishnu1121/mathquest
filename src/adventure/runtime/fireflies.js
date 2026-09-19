// Level 2, Make-10: make-ten facts as an arcade. Drag a light thread through two or three glowing
// numbers that add to 10 (or tap two), and they fuse into a ten that fills the lantern.
// Arcade layer: each connection scores with the streak multiplier, three in a row turns on power mode,
// golden lights are worth bonus points, and every fusion knocks the nearby lights aside.
(function () {
  const GOAL = 5;
  const COUNT = 8;
  const KICK = 0.45;
  const SVGNS = "http://www.w3.org/2000/svg";
  const BLOOMS = { forest: ["🌸", "🌼", "🌷"], volcano: ["💎", "🔥", "🪨"], space: ["🪐", "⭐", "🌙"], ocean: ["🐚", "🪸", "🐠"], candy: ["🍭", "🧁", "🍬"] };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  MQ.register({
    id: "fireflies",
    name: "Firefly Tens",
    emoji: "✨",
    title: (t) => `Make-10 ${cap(t.glowName)}`,
    icon: (t) => t.glow,
    stageClass: "firefly-stage",
    mount(stage, api) {
      const t = api.theme;
      const arc = api.arcade;
      const slots = Array.from({ length: GOAL }, () => '<span class="slot"></span>').join("");
      stage.innerHTML = `
        <div class="glade">
          <div class="glade-light" id="gladeLight"></div>
          <div class="glade-card">
            <p class="glade-goal">Connect ${t.glowName} that make <b>10</b>.</p>
            <p class="glade-sub" id="gladeSub" aria-live="polite">Drag a light thread through 2 or 3 of them, or tap two.</p>
            <div class="glade-frame" id="gladeFrame" role="img" aria-label="Ten empty spaces"></div>
          </div>
          <div class="swarm" id="swarm"></div>
          <div class="lantern" id="lantern" role="img" aria-label="Lantern: 0 of ${GOAL} tens">
            <span class="lantern-cap" aria-hidden="true"></span>
            <span class="lantern-glass" aria-hidden="true">${slots}</span>
          </div>
        </div>`;

      const glade = stage.querySelector(".glade");
      const swarm = stage.querySelector("#swarm");
      const lantern = stage.querySelector("#lantern");
      const sub = stage.querySelector("#gladeSub");
      const light = stage.querySelector("#gladeLight");
      const slotEls = [...lantern.querySelectorAll(".slot")];
      const flies = [];
      const moves = [];
      let selected = null;
      let made = 0;
      let misses = 0;
      let triples = 0;
      let combo = 0;
      let finished = false;
      let resolving = false;
      let connectionAttempt = 1;
      let hintsBefore = api.hintsUsed();
      let steady = false;
      let raf = 0;
      let last = performance.now();

      const log = (text) => {
        moves.push(text);
        if (moves.length > 8) moves.shift();
      };
      const calm = () => steady || api.reduced || document.documentElement.hasAttribute("data-calm");
      function showFrame(n = 0) {
        const frame = stage.querySelector("#gladeFrame");
        frame.setAttribute("aria-label", `${n} filled spaces and ${10 - n} empty spaces. Make ten.`);
        frame.innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? "filled" : ""}"></i>`).join("");
      }
      showFrame();
      function ensurePair() {
        const available = flies.filter((f) => !f.busy);
        if (available.length >= 2 && !available.some((f) => available.some((g) => f !== g && f.n + g.n === 10))) {
          const change = available.find((f) => !f.selected);
          const anchor = available.find((f) => f !== change);
          if (change && anchor) setNumber(change, 10 - anchor.n);
        }
      }
      const others = (f) => flies.filter((g) => g !== f && !g.busy).map((g) => g.n);
      function pickNumber(f) {
        const pool = others(f);
        const lonely = pool.filter((n) => pool.filter((m) => m === 10 - n).length < (n === 5 ? 2 : 1));
        if (lonely.length && Math.random() < 0.7) return 10 - lonely[Math.floor(Math.random() * lonely.length)];
        return 1 + Math.floor(Math.random() * 9);
      }
      function setNumber(f, n) {
        f.n = n;
        f.label.textContent = String(n);
        f.el.setAttribute("aria-label", `${f.golden ? `Golden ${t.glowOne}` : cap(t.glowOne)} ${n}`);
      }
      // A golden light is still an ordinary number; using it in a make-ten earns bonus points.
      function maybeGolden(f) {
        f.golden = made > 0 && !flies.some((g) => g !== f && g.golden) && Math.random() < 0.3;
        f.el.classList.toggle("golden", f.golden);
        setNumber(f, f.n);
      }
      // A fusion pushes the nearby lights aside for a moment; the frame loop eases them back.
      function push(mx, my) {
        if (calm()) return;
        for (const f of flies) {
          if (f.busy) continue;
          const dx = f.x - mx;
          const dy = f.y - my;
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < 220) f.kick = { x: (dx / d) * (220 - d) * 0.3, y: (dy / d) * (220 - d) * 0.3, life: KICK };
        }
      }

      // Light thread layer and running sum
      const layer = document.createElementNS(SVGNS, "svg");
      layer.classList.add("thread-layer");
      const line = document.createElementNS(SVGNS, "polyline");
      layer.appendChild(line);
      swarm.appendChild(layer);
      const sumTag = document.createElement("span");
      sumTag.className = "chain-sum";
      sumTag.hidden = true;
      swarm.appendChild(sumTag);

      for (let i = 0; i < COUNT; i++) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "fly";
        el.innerHTML = '<span class="fly-inner"><span class="fly-num"></span></span>';
        const f = {
          el,
          label: el.querySelector(".fly-num"),
          n: 1,
          baseX: (i + 0.5) / COUNT + (Math.random() - 0.5) * 0.06,
          x: 0,
          y: 0,
          t: Math.random() * 10,
          vy: api.reduced ? 12 : 22 + Math.random() * 16,
          amp: 10 + Math.random() * 18,
          freq: 0.8 + Math.random() * 0.8,
          busy: false,
          selected: false,
          golden: false,
          kick: null,
        };
        // Keyboard activation only; pointers are handled by the thread below.
        el.addEventListener("click", (e) => {
          if (e.detail === 0) tapFly(f);
        });
        flies.push(f);
        swarm.appendChild(el);
      }
      const height = () => swarm.clientHeight || 400;
      flies.forEach((f, i) => {
        setNumber(f, pickNumber(f));
        f.y = height() * (0.15 + ((i * 0.37) % 1) * 0.8);
      });
      ensurePair();

      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        // Hit-stop: everything holds still for a moment after a big fusion.
        if (arc.frozen) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const w = swarm.clientWidth;
        const h = swarm.clientHeight;
        for (const [i, f] of flies.entries()) {
          if (f.busy) continue;
          if (calm()) {
            f.x = w * ((i % 4 + .5) / 4);
            f.y = h * (i < 4 ? .3 : .72);
          } else if (!f.selected && document.activeElement !== f.el && !resolving) {
            f.y -= f.vy * dt;
            f.t += dt;
          }
          if (!calm()) f.x = Math.min(w - 40, Math.max(40, f.baseX * w + Math.sin(f.t * f.freq) * f.amp));
          if (f.y < -50) {
            f.y = h + 40;
            setNumber(f, pickNumber(f));
            maybeGolden(f);
            ensurePair();
          }
          let ox = 0;
          let oy = 0;
          if (f.kick) {
            f.kick.life -= dt;
            if (f.kick.life <= 0 || calm()) {
              f.kick = null;
            } else {
              const k = Math.sin(Math.PI * (1 - f.kick.life / KICK));
              ox = f.kick.x * k;
              oy = f.kick.y * k;
            }
          }
          f.el.style.transform = `translate(${f.x + ox}px, ${f.y + oy}px)`;
        }
        if (chain.length) drawChain();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);

      const clientPoint = (x, y) => {
        const r = swarm.getBoundingClientRect();
        return { x: r.left + x, y: r.top + y };
      };
      const nums = (list) => list.map((f) => f.n);

      // ---------- Drag a light thread ----------
      let chain = [];
      let dragging = false;
      let moved = false;
      let pointer = null;
      let startPt = null;
      let lastPt = null;
      const local = (e) => {
        const r = swarm.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      const flyAt = (p) => flies.find((f) => !f.busy && !f.el.hidden && Math.hypot(f.x - p.x, f.y - p.y) < 44);
      const chainSum = () => chain.reduce((s, f) => s + f.n, 0);

      function drawChain() {
        const pts = chain.map((f) => `${f.x},${f.y}`);
        if (dragging && lastPt) pts.push(`${lastPt.x},${lastPt.y}`);
        line.setAttribute("points", pts.join(" "));
        const s = chainSum();
        const ready = s === 10 && chain.length > 1;
        const anchor = dragging && lastPt ? lastPt : chain[chain.length - 1];
        line.classList.toggle("ready", ready);
        sumTag.hidden = false;
        sumTag.textContent = `${nums(chain).join(" + ")} = ${s}`;
        sumTag.className = ready ? "chain-sum ten" : s > 10 ? "chain-sum over" : "chain-sum";
        sumTag.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -150%)`;
      }
      function hideChain() {
        line.setAttribute("points", "");
        line.classList.remove("ready");
        sumTag.hidden = true;
      }

      swarm.addEventListener("pointerdown", (e) => {
        if (finished || resolving) return;
        const p = local(e);
        const f = flyAt(p);
        if (!f) {
          api.sfx.stretch(12);
          api.burst(e.clientX, e.clientY, { count: 6, chars: ["✨"], colors: ["#fff3c4", "#ffc933"], spread: 45, size: 18 });
          return;
        }
        e.preventDefault();
        dragging = true;
        moved = false;
        pointer = e.pointerId;
        startPt = p;
        lastPt = p;
        swarm.setPointerCapture(pointer);
        chain = [f];
        f.selected = true;
        f.el.classList.add("chained");
        api.sfx.hop(f.n);
        drawChain();
      });
      swarm.addEventListener("pointermove", (e) => {
        if (!dragging || e.pointerId !== pointer) return;
        const p = local(e);
        lastPt = p;
        if (Math.hypot(p.x - startPt.x, p.y - startPt.y) > 12) moved = true;
        const f = flyAt(p);
        if (f && !chain.includes(f) && chain.length < 3 && chainSum() < 10) {
          chain.push(f);
          f.selected = true;
          f.el.classList.add("chained");
          api.sfx.hop(chainSum());
          if (chainSum() === 10) arc.snd.lock();
        }
        drawChain();
      });
      const endDrag = (e) => {
        if (!dragging || e.pointerId !== pointer) return;
        dragging = false;
        const picked = chain;
        chain = [];
        hideChain();
        picked.forEach((f) => {
          f.el.classList.remove("chained");
          f.selected = false;
        });
        if (!moved && picked.length === 1) {
          tapFly(picked[0]);
          return;
        }
        if (picked.length < 2) return;
        if (selected) {
          selected.selected = false;
          selected.el.classList.remove("picked");
          selected = null;
        }
        const total = picked.reduce((s, f) => s + f.n, 0);
        if (total === 10) fuse(picked);
        else miss(picked);
      };
      swarm.addEventListener("pointerup", endDrag);
      swarm.addEventListener("pointercancel", endDrag);

      // ---------- Tap two ----------
      function tapFly(f) {
        if (f.busy || finished || resolving) return;
        if (!selected) {
          selected = f;
          f.selected = true;
          f.el.classList.add("picked");
          showFrame(f.n);
          api.sfx.hop(f.n);
          return;
        }
        if (selected === f) {
          f.selected = false;
          f.el.classList.remove("picked");
          selected = null;
          showFrame();
          api.sfx.tap();
          return;
        }
        const a = selected;
        selected = null;
        a.selected = false;
        a.el.classList.remove("picked");
        showFrame();
        if (a.n + f.n === 10) fuse([a, f]);
        else miss([a, f]);
      }

      let missedSince = false;
      function miss(list) {
        combo = 0;
        arc.miss();
        api.observe({ skill: "simple", level: 2, format: "visual", correct: false, attempt: connectionAttempt++, hintLevel: api.hintsUsed() > hintsBefore ? 1 : 0 });
        misses += 1;
        missedSince = true;
        const total = list.reduce((s, f) => s + f.n, 0);
        log(`tried ${nums(list).join(" + ")} = ${total}`);
        api.emit("miss");
        api.fact(`tried ${nums(list).join(" + ")} and saw it made ${total}, not 10`);
        api.sfx.wrong();
        for (const f of list) {
          f.el.classList.remove("nope");
          void f.el.offsetWidth;
          f.el.classList.add("nope");
        }
        const mid = list.reduce((m, f) => ({ x: m.x + f.x / list.length, y: m.y + f.y / list.length }), { x: 0, y: 0 });
        const p = clientPoint(mid.x, mid.y);
        api.floatText(p.x, p.y - 30, `${nums(list).join(" + ")} = ${total}`, "warm");
        sub.textContent = total > 10 ? `${total} is ${total - 10} too many. Try a smaller partner.` : `${total} needs ${10 - total} more to fill ten. Try a bigger partner.`;
        if (connectionAttempt >= 3) {
          steady = true;
          swarm.dataset.steady = "true";
          sub.textContent += " The lights will stay still. Use the ten spaces to help.";
        }
        if (misses === 2) api.nudgeHoot();
      }

      async function fuse(list) {
        if (resolving || finished) return;
        resolving = true;
        api.observe({ skill: "simple", level: 2, format: "visual", correct: true, attempt: connectionAttempt, hintLevel: api.hintsUsed() > hintsBefore ? 1 : 0 });
        connectionAttempt = 1;
        hintsBefore = api.hintsUsed();
        swarm.setAttribute("aria-busy", "true");
        const triple = list.length === 3;
        const golden = list.some((f) => f.golden);
        list.forEach((f) => {
          f.busy = true;
          f.el.classList.add("picked");
        });
        // A combo celebrates consecutive connections, regardless of time taken.
        combo += 1;
        if (triple) triples += 1;
        log(`made ${nums(list).join(" + ")} = 10`);
        api.emit("solved", { afterMistake: missedSince });
        missedSince = false;
        if (triple) {
          api.emit("triple");
          api.fact(`made 10 with three numbers: ${nums(list).join(" + ")}`);
          arc.zap(list.map((f) => clientPoint(f.x, f.y)));
        }
        if (combo > 1) api.emit("combo", { n: combo - 1 });
        api.sfx.combo(combo + (triple ? 3 : 0));

        const mx = list.reduce((s, f) => s + f.x, 0) / list.length;
        const my = list.reduce((s, f) => s + f.y, 0) / list.length;
        list.forEach((f) =>
          f.el.animate(
            [{ transform: `translate(${f.x}px, ${f.y}px)` }, { transform: `translate(${mx}px, ${my}px) scale(0.5)` }],
            { duration: 320, easing: "ease-in", fill: "forwards" },
          ),
        );
        await api.wait(320);
        if (!api.alive()) return;
        list.forEach((f) => (f.el.hidden = true));

        const p = clientPoint(mx, my);
        push(mx, my);
        await arc.impact({ x: p.x, y: p.y, power: triple ? 3 : 2, tone: "gold" });
        if (!api.alive()) return;
        api.burst(p.x, p.y, { count: triple ? 22 : 14, chars: ["✨", t.glow], colors: ["#ffc933", "#fff3c4", "#ffe9b3"], spread: triple ? 140 : 90 });
        api.floatText(p.x, p.y + 44, `${nums(list).join(" + ")} = 10`, "gold");
        arc.hit({ points: triple ? 400 : 200, x: p.x, y: p.y - 6, word: triple ? "Triple glow!" : null, tone: "gold" });
        if (triple) arc.note("triple");
        if (golden) {
          arc.note("golden");
          arc.bonus({ points: 300, x: p.x, y: p.y - 170, label: "Golden +300", tone: "gold", pop: false });
        }

        const slot = slotEls[made];
        const orb = document.createElement("span");
        orb.className = "orb";
        orb.textContent = "10";
        swarm.appendChild(orb);
        const sr = swarm.getBoundingClientRect();
        const sc = api.center(slot);
        await orb.animate(
          [
            { transform: `translate(${mx}px, ${my}px) scale(0.4)` },
            { transform: `translate(${mx}px, ${my - 30}px) scale(1.3)`, offset: 0.3 },
            { transform: `translate(${sc.x - sr.left}px, ${sc.y - sr.top}px) scale(0.5)` },
          ],
          { duration: api.reduced ? 200 : 700, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
        ).finished;
        if (!api.alive()) return;
        orb.remove();
        made += 1;
        slot.classList.add("lit");
        lantern.classList.remove("glow");
        void lantern.offsetWidth;
        lantern.classList.add("glow");
        lantern.setAttribute("aria-label", `Lantern: ${made} of ${GOAL} tens`);
        light.style.setProperty("--light", String(made / GOAL));
        bloom();
        api.sfx.ten();
        api.addCoins(1 + (combo > 1 ? 1 : 0) + (triple ? 2 : 0), sc);
        sub.textContent = made < GOAL
          ? `${GOAL - made} more ${GOAL - made === 1 ? "ten" : "tens"} to fill the lantern.${made === 1 && !triples ? " Pro move: drag through three!" : ""}`
          : "The lantern is full!";
        if (made === GOAL - 1) arc.banner("One more ten!", { tone: "sky", hold: 700 });

        for (const f of list) {
          f.el.getAnimations().forEach((anim) => anim.cancel());
          f.el.classList.remove("picked");
          f.y = swarm.clientHeight + 40 + Math.random() * 60;
          setNumber(f, pickNumber(f));
          maybeGolden(f);
          f.el.hidden = false;
          f.busy = false;
          f.selected = false;
        }
        ensurePair();
        if (made >= GOAL) { finish(); return; }
        else if (made === 2 && !fuse.pipShown) {
          fuse.pipShown = true;
          await api.wait(600);
          if (!api.alive()) return;
          await window.MQTeach.mistake({ host: stage, api, id: "sixFive", chapter: "fireflies" });
        }
        resolving = false;
        swarm.setAttribute("aria-busy", "false");
      }

      function bloom() {
        const set = BLOOMS[t.palette] || BLOOMS.forest;
        for (let i = 0; i < 2; i++) {
          const b = document.createElement("span");
          b.className = "bloom";
          b.textContent = set[Math.floor(Math.random() * set.length)];
          b.style.left = `${6 + Math.random() * 88}%`;
          b.style.animationDelay = `${i * 120}ms`;
          glade.appendChild(b);
        }
      }

      async function finish() {
        finished = true;
        lantern.classList.add("full");
        const c = api.center(lantern);
        arc.banner("Lantern full!", { tone: "gold" });
        arc.fireworks(4);
        await arc.impact({ x: c.x, y: c.y, power: 3, tone: "gold" });
        if (!api.alive()) return;
        api.burst(c.x, c.y, { count: 26, chars: ["✨", "⭐", t.glow], colors: ["#ffc933", "#fff3c4"], spread: 220 });
        arc.bonus({ points: 500, x: c.x, y: c.y - 110, label: "Lantern +500", tone: "gold", pop: false });
        await api.wait(1000);
        if (!api.alive()) return;
        const stars = misses <= 1 ? 3 : misses <= 4 ? 2 : 1;
        api.finish({
          stars,
          emoji: "🏮",
          title: triples ? `Triple glow master!` : "The lantern is glowing!",
          note: triples
            ? `You found ${triples === 1 ? "a way" : `${triples} ways`} to make 10 with three numbers. Breaking 10 into parts is how fast adders think.`
            : stars === 3
              ? "You found make-ten pairs. Try that idea with 8 + 5: make 10 with 8 + 2, then add the 3 left over."
              : "Every connection lights the lantern. Look for the empty spaces in a ten frame to find a number's partner.",
        });
      }

      function onScreen() {
        return flies.filter((f) => !f.busy && !f.el.hidden && f.y > 0 && f.y < swarm.clientHeight);
      }
      api.setHint(() => {
        const free = onScreen();
        const f = free.find((g) => free.some((h) => h !== g && h.n === 10 - g.n));
        let text = `New ${t.glowName} are rising. Look for two that make 10!`;
        if (f) {
          f.el.classList.remove("hinted");
          void f.el.offsetWidth;
          f.el.classList.add("hinted");
          text = `This ${f.n} needs a ${10 - f.n} to make 10. Can you find a ${10 - f.n}?`;
        }
        if (moves.length === 0) return text;
        const tried = moves.flatMap((m) => (m.match(/\d+/g) || []).map(Number));
        return {
          text,
          facts: {
            game: `Glowing ${t.glowName} with numbers float up. The child connects two or three whose numbers add to exactly 10 to fill a lantern.`,
            goal: `Lantern has ${made} of ${GOAL} tens. Numbers floating now: ${free.map((g) => g.n).join(", ")}.`,
            moves: moves.slice(-6),
            allowed: [...new Set([10, ...tried])],
          },
        };
      });

      // What Hoot notices in the glade, and a question for a pause that never points at a partner.
      api.companion.watch(() => ({
        sees: `${made} of ${GOAL} lantern lights lit${selected ? ` · you picked ${selected.n}` : ""}`,
        nudge: selected ? `You picked ${selected.n}. What number would make 10 with it?` : "Which two floating numbers could make 10 together?",
      }));

      return () => cancelAnimationFrame(raf);
    },
  });
})();
