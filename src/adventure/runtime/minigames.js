// Story mini-games: short, non-math games that carry the narrative after each chapter, and replay
// from the Playground. Each game registers { id, name, emoji, desc, chapter, start(stage, kit) }.
(function () {
  const S = window.MQS;
  const CHAPTER_NUMBER = { frog: 1, fireflies: 2, guardian: 3 };
  const games = [];

  function register(game) {
    games.push({ ...game, chapterNumber: game.chapterNumber || CHAPTER_NUMBER[game.chapter] });
  }

  function play(id, { fromStory = false } = {}) {
    const original = games.find((g) => g.id === id);
    const grade = window.MQClasses?.grade();
    const game = original && (window.MQGradeBonus?.resolve(original, grade) || original);
    if (!game) return Promise.resolve();
    return new Promise((resolve) => {
      const fx = window.MQ.fx;
      const el = document.createElement("div");
      el.className = `mini mini-${game.id}`;
      el.dataset.palette = window.MQAI.theme().palette;
      el.innerHTML = `
        <div class="mini-top">
          <p class="mini-title"><span aria-hidden="true">${game.emoji}</span> ${game.name}</p>
          <div class="mini-meter" aria-live="polite"><span class="mini-label"></span><span class="mini-bar" aria-hidden="true"><i></i></span></div>
          <button type="button" class="mini-skip">${fromStory ? "Skip" : "Close"}</button>
        </div>
        <div class="mini-stage" aria-label="${game.name}"></div>`;
      document.body.appendChild(el);
      const stage = el.querySelector(".mini-stage");
      let finished = false;
      let cleanup = null;
      let hintEl = null;

      function close() {
        el.style.transition = "opacity 240ms ease";
        el.style.opacity = "0";
        setTimeout(() => {
          el.remove();
          resolve();
        }, 250);
      }

      const kit = {
        grade,
        profile: window.MQGradeBonus?.profile(grade),
        fx,
        theme: window.MQAI.theme(),
        hero: S.hero(),
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm"),
        alive: () => !finished,
        progress(fraction, label) {
          el.querySelector(".mini-bar i").style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
          if (label !== undefined) el.querySelector(".mini-label").textContent = label;
        },
        hint(emoji, text) {
          if (hintEl) hintEl.remove();
          hintEl = document.createElement("p");
          hintEl.className = "mini-hint";
          hintEl.innerHTML = `<span aria-hidden="true">${emoji}</span>`;
          hintEl.append(text);
          stage.appendChild(hintEl);
        },
        hideHint() {
          if (hintEl) hintEl.classList.add("gone");
        },
        /** An arcade pop word with a rising chime for streaks and big moments. Tier 1 is small, 3 is the loudest. */
        cheer(x, y, text, tier = 2) {
          if (!finished) window.MQArcade.cheer(x, y, text, tier);
        },
        done({ art, title, text, coins = 5 }) {
          if (finished) return;
          finished = true;
          if (cleanup) cleanup();
          stage.inert = true;
          el.querySelector(".mini-skip").disabled = true;
          const firstTime = !(S.get().minis && S.get().minis[game.id]);
          S.update((s) => {
            s.minis = s.minis || {};
            s.minis[game.id] = (s.minis[game.id] || 0) + 1;
            if (firstTime) s.coins += coins;
          });
          window.MQ.refreshHud();
          S.emit("miniDone", { id: game.id });
          const box = document.createElement("div");
          box.className = "mini-done";
          box.innerHTML = `
            <div class="mini-done-card" role="dialog" aria-modal="true" aria-labelledby="mdTitle">
              <span class="md-art" aria-hidden="true">${art}</span>
              <h2 id="mdTitle">${title}</h2>
              <p>${text}</p>
              ${firstTime ? `<p class="md-reward">🪙 +${coins} coins</p>` : ""}
              <button type="button" class="btn">${fromStory ? "Continue the story" : "Back to the map"}</button>
            </div>`;
          el.appendChild(box);
          fx.sfx.win();
          const c = fx.center(box.querySelector(".md-art"));
          fx.burst(c.x, c.y, { count: 26, chars: ["✨", "⭐", art], spread: 220 });
          const btn = box.querySelector(".btn");
          btn.focus();
          btn.addEventListener("click", () => {
            fx.sfx.tap();
            close();
          });
        },
      };

      el.querySelector(".mini-skip").addEventListener("click", () => {
        if (finished) return;
        finished = true;
        if (cleanup) cleanup();
        close();
      });
      cleanup = game.start(stage, kit) || null;
    });
  }

  function playForChapter(chapter) {
    const game = games.find((g) => g.chapter === chapter);
    return game ? play(game.id, { fromStory: true }) : Promise.resolve();
  }

  window.MQMini = { register, list: () => [...games].map((g) => window.MQGradeBonus?.resolve(g, window.MQClasses?.grade()) || g).sort((a, b) => a.chapterNumber - b.chapterNumber), play, playForChapter };
})();
