// Guardian Duel riddle attack: a story problem written by AI in the child's world (numbers checked by
// code, built-in story otherwise). Tap the right floating bubble to block it. If the child helped their
// friend earlier in the story, a lucky charm pops one wrong bubble. A block scores on the arcade streak.
(function () {
  function riddle({ host, api, a, b, level = 3, charm = false }) {
    return new Promise((resolve) => {
      const t = api.theme;
      const total = a + b;
      const answers = [total, Math.max(0, total - 10), total + 10].sort(() => Math.random() - 0.5);
      const box = document.createElement("div");
      box.className = "riddle";
      box.innerHTML = `
        <div class="riddle-card" role="dialog" aria-modal="true" aria-labelledby="riddleText">
          <p class="riddle-tag" id="riddleTag">🛡️ The ${t.guardianName} casts a riddle! Tap the right bubble to block it.</p>
          <p class="riddle-text loading" id="riddleText">The ${t.guardianName} is thinking up a riddle…</p>
        </div>
        <div class="riddle-field" id="riddleField"></div>`;
      host.appendChild(box);
      api.arcade.banner("Riddle attack!", { tone: "coral", hold: 700 });
      const field = box.querySelector("#riddleField");
      const textEl = box.querySelector("#riddleText");
      const tagEl = box.querySelector("#riddleTag");

      let done = false;
      let misses = 0;
      let charmUsed = false;
      const hintsBefore = api.hintsUsed();
      let raf = 0;
      let last = performance.now();
      const bubbles = answers.map((n, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "riddle-bubble";
        el.innerHTML = `<span class="rb-num">${n}</span>`;
        el.setAttribute("aria-label", `Answer ${n}`);
        el.disabled = true;
        field.appendChild(el);
        const bub = { el, n, base: (i + 0.5) / answers.length, y: 0, t: Math.random() * 6, gone: false };
        el.addEventListener("click", () => pop(bub));
        return bub;
      });

      function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const w = field.clientWidth;
        const h = field.clientHeight;
        for (const bub of bubbles) {
          if (bub.gone) continue;
          if (!bub.y) bub.y = h * (0.55 + Math.random() * 0.35);
          if (api.reduced) bub.y = h * .62;
          else if (document.activeElement !== bub.el && !api.arcade.frozen) {
            bub.t += dt;
            bub.y -= 18 * dt;
          }
          if (bub.y < 50) bub.y = h - 50;
          const x = Math.min(w - 54, Math.max(54, bub.base * w + (api.reduced ? 0 : Math.sin(bub.t * 1.3) * 26)));
          bub.el.style.transform = `translate(${x}px, ${bub.y}px)`;
        }
        if (!done) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);

      function useCharm() {
        charmUsed = true;
        const wrong = bubbles.find((bub) => bub.n !== total);
        const c = api.center(wrong.el);
        wrong.gone = true;
        wrong.el.hidden = true;
        api.sfx.pop();
        api.burst(c.x, c.y, { count: 14, chars: ["🍀", "✨"], spread: 90 });
        api.floatText(c.x, c.y - 50, `${t.npc}'s lucky charm!`, "gold");
      }

      function show(story, byAI) {
        textEl.textContent = story;
        textEl.classList.remove("loading");
        if (byAI) tagEl.innerHTML += ' <span class="by-ai">✨ Riddle written by AI</span>';
        bubbles.forEach((bub) => (bub.el.disabled = false));
        if (charm) setTimeout(() => api.alive() && !done && useCharm(), 700);
        bubbles.find((bub) => !bub.gone).el.focus();
      }

      const fallback = `The ${t.guardianName} has ${a} ${t.glowName}. It finds ${b} more. How many ${t.glowName} does it have now?`;
      if (api.ai.status() === "on") {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 3000);
        api.ai.riddle({ a, b, theme: t }, ctl.signal).then((story) => {
          clearTimeout(timer);
          if (api.alive()) show(story || fallback, Boolean(story));
        });
      } else {
        setTimeout(() => api.alive() && show(fallback, false), 500);
      }

      async function pop(bub) {
        if (done || bub.el.disabled || bub.gone) return;
        const c = api.center(bub.el);
        api.observe({ skill: "wordProblems", level, format: "wordProblem", correct: bub.n === total, attempt: misses + 1, hintLevel: charmUsed || api.hintsUsed() > hintsBefore ? 1 : 0 });
        if (bub.n !== total) {
          misses += 1;
          api.emit("miss");
          api.sfx.wrong();
          api.arcade.miss();
          bub.el.classList.remove("nope");
          void bub.el.offsetWidth;
          bub.el.classList.add("nope");
          api.floatText(c.x, c.y - 60, bub.n < total ? "Too small! Try another" : "Too big! Try another", "warm");
          return;
        }
        done = true;
        cancelAnimationFrame(raf);
        api.emit("solved", { afterMistake: misses > 0 });
        api.sfx.block();
        api.burst(c.x, c.y, { count: 18, chars: ["🛡️", "✨"], spread: 140 });
        api.floatText(c.x, c.y - 60, `Blocked! ${a} + ${b} = ${total}`, "gold");
        api.addCoins(misses === 0 ? 3 : 1, c);
        if (misses === 0) api.arcade.note("block");
        api.arcade.impact({ x: c.x, y: c.y, power: 2, tone: "sky" });
        api.arcade.hit({ points: misses === 0 ? 300 : 150, x: c.x, y: c.y + 56, word: misses === 0 ? "Perfect block!" : "Nice block!", tone: "sky", wordY: c.y - 130 });
        bubbles.forEach((other) => (other.el.disabled = true));
        await api.wait(1300);
        box.remove();
        resolve(misses === 0);
      }
    });
  }

  window.MQDuel = { riddle };
})();
