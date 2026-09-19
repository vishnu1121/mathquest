// Achievements: badges earned for good learning habits (strategies, persistence, teaching, exploring),
// never for speed. Unlock toasts, progress pings and the Badge Book.
(function () {
  const S = window.MQS;
  const DEFS = [
    { id: "first_splash", emoji: "💦", name: "First Splash", desc: "Finish Chapter 1", on: "levelDone", test: (d) => d.id === "frog" },
    { id: "big_hopper", emoji: "⚡", name: "Big Hopper", desc: "Make 5 big hops of 10", on: "bigHop", goal: 5 },
    { id: "mind_reader", emoji: "🎯", name: "Mind Reader", desc: "Guess the landing pad before hopping", on: "predictRight" },
    { id: "gem_hunter", emoji: "💎", name: "Gem Hunter", desc: "Grab 2 hidden gems", on: "gem", goal: 2 },
    { id: "triple_glow", emoji: "✨", name: "Triple Glow", desc: "Make 10 with three numbers", on: "triple" },
    { id: "combo_star", emoji: "🔥", name: "Combo Star", desc: "Make a ×3 combo", on: "combo", test: (d) => d.n >= 2 },
    { id: "lantern_lighter", emoji: "🏮", name: "Lantern Lighter", desc: "Finish Chapter 2", on: "levelDone", test: (d) => d.id === "fireflies" },
    { id: "riddle_blocker", emoji: "🛡️", name: "Riddle Blocker", desc: "Block a riddle on the first try", on: "riddleBlocked", test: (d) => d.firstTry },
    { id: "pip_teacher", emoji: "🧑‍🏫", name: "Pip's Teacher", desc: "Teach Pip 3 times", on: "taught", goal: 3 },
    { id: "strategy_star", emoji: "🧠", name: "Strategy Star", desc: "Tell Hoot how you solved it", on: "strategyShared" },
    { id: "brave_asker", emoji: "🦉", name: "Brave Asker", desc: "Ask Hoot for help, then solve it", on: "hootHelped" },
    { id: "never_give_up", emoji: "💪", name: "Never Give Up", desc: "Get it right after a mistake, 3 times", on: "solved", test: (d) => d.afterMistake, goal: 3 },
    { id: "looking_sharp", emoji: "🎩", name: "Looking Sharp", desc: "Buy something at Hoot's Shop", on: "bought" },
    { id: "secret_finder", emoji: "🗝️", name: "Secret Finder", desc: "Open the hidden treasure chest", on: "secret", secret: "Something on the map loves to be tapped…" },
    { id: "guardian_friend", emoji: "🤝", name: "Guardian's Friend", desc: "Wake up the Guardian", on: "levelDone", test: (d) => d.id === "guardian" },
    { id: "mist_painter", emoji: "🎨", name: "Mist Painter", desc: "Wipe away the Muddle Mist", on: "miniDone", test: (d) => d.id === "mist" },
    { id: "night_flyer", emoji: "🌙", name: "Night Flyer", desc: "Fly the lantern light home with Hoot", on: "miniDone", test: (d) => d.id === "flight" },
    { id: "dance_star", emoji: "🥁", name: "Dance Star", desc: "Keep the beat at the Guardian's party", on: "miniDone", test: (d) => d.id === "dance" },
    { id: "power_surge", emoji: "🚀", name: "Power Surge", desc: "Build a streak that turns on power mode", on: "powerMode" },
    { id: "high_scorer", emoji: "🏆", name: "High Scorer", desc: "Beat your own best score in a game", on: "newBest", test: (d) => d.previous > 0 },
    { id: "three_star_hero", emoji: "🌟", name: "Three-Star Hero", desc: "Get 3 stars in every chapter", on: "levelDone", test: () => ["frog", "fireflies", "guardian"].every((id) => (S.get().stars[id] || 0) >= 3) },
  ];

  let fx = null;
  const unlockListeners = new Set();
  const queue = [];
  let showing = false;

  const isUnlocked = (id) => Boolean(S.get().badges[id]);
  const count = () => DEFS.filter((d) => isUnlocked(d.id)).length;

  // Stats for the story director and the journey note.
  S.on("*", (event, d) => {
    S.update((s) => {
      const st = s.stats;
      if (event === "bigHop") st.bigHops += 1;
      if (event === "predictRight") st.predictedRight += 1;
      if (event === "gem") st.gems += 1;
      if (event === "triple") st.triples += 1;
      if (event === "combo") st.bestCombo = Math.max(st.bestCombo, d.n + 1);
      if (event === "miss") st.misses += 1;
      if (event === "riddleBlocked" && d.firstTry) st.riddleFirstTry += 1;
      if (event === "taught") st.taught += 1;
      if (event === "strategyShared" && d.strategy && !st.strategies.includes(d.strategy)) st.strategies.push(d.strategy);
      if (event === "hootAsked") st.hootAsks += 1;
      if (event === "solved" && d.afterMistake) st.solvedAfterMistake += 1;
    });
  });

  // Asking Hoot and then solving within a minute earns Brave Asker.
  let askedAt = -Infinity;
  S.on("hootAsked", () => (askedAt = Date.now()));
  S.on("solved", () => {
    if (Date.now() - askedAt < 60000) {
      askedAt = -Infinity;
      S.emit("hootHelped");
    }
  });

  for (const def of DEFS) {
    S.on(def.on, (d) => {
      if (isUnlocked(def.id) || (def.test && !def.test(d))) return;
      const goal = def.goal || 1;
      let n = 0;
      S.update((s) => {
        n = (s.counts[def.id] || 0) + 1;
        s.counts[def.id] = n;
        if (n >= goal) s.badges[def.id] = Date.now();
      });
      if (n >= goal) enqueue({ def, unlocked: true });
      else enqueue({ def, unlocked: false, n, goal });
    });
  }

  // ---------- Toasts ----------
  function enqueue(item) {
    queue.push(item);
    if (!showing) next();
  }
  function next() {
    const item = queue.shift();
    if (!item) {
      showing = false;
      return;
    }
    showing = true;
    const { def, unlocked } = item;
    const toast = document.createElement("div");
    toast.className = unlocked ? "badge-toast" : "badge-toast small";
    toast.setAttribute("role", "status");
    toast.innerHTML = unlocked
      ? `<span class="bt-emoji" aria-hidden="true">${def.emoji}</span>
         <span class="bt-copy"><span class="bt-kicker">Badge unlocked!</span><span class="bt-name">${def.name}</span><span class="bt-desc">${def.desc}</span></span>`
      : `<span class="bt-emoji" aria-hidden="true">${def.emoji}</span>
         <span class="bt-copy"><span class="bt-name">${def.name}</span><span class="bt-progress"><span style="width:${(item.n / item.goal) * 100}%"></span></span><span class="bt-desc">${item.n} of ${item.goal}</span></span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    if (unlocked) {
      unlockListeners.forEach((fn) => fn(def));
      if (fx) {
        fx.sfx.win();
        setTimeout(() => {
          const c = fx.center(toast.querySelector(".bt-emoji"));
          fx.burst(c.x, c.y, { count: 22, chars: [def.emoji, "⭐", "✨"], spread: 160 });
        }, 250);
      }
    } else if (fx) {
      fx.sfx.star(0);
    }
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
        next();
      }, 350);
    }, unlocked ? 3000 : 1400);
  }

  // ---------- Badge Book ----------
  function openBook() {
    const s = S.get();
    const box = document.createElement("div");
    box.className = "book";
    box.innerHTML = `
      <div class="book-card" role="dialog" aria-modal="true" aria-labelledby="bookTitle">
        <div class="book-head">
          <h2 id="bookTitle">🏅 Badge Book</h2>
          <p class="book-count">${count()} of ${DEFS.length} badges</p>
          <button type="button" class="hud-pill hud-icon book-close" aria-label="Close the Badge Book">✕</button>
        </div>
        <ul class="book-grid">
          ${DEFS.map((d) => {
            const got = isUnlocked(d.id);
            const goal = d.goal || 1;
            const n = Math.min(s.counts[d.id] || 0, goal);
            if (!got && d.secret) {
              return `<li class="book-badge locked secret"><span class="bb-emoji" aria-hidden="true">❓</span><span class="bb-name">Secret badge</span><span class="bb-desc">${d.secret}</span></li>`;
            }
            return `<li class="book-badge ${got ? "got" : "locked"}">
              <span class="bb-emoji" aria-hidden="true">${d.emoji}</span>
              <span class="bb-name">${d.name}</span>
              <span class="bb-desc">${d.desc}</span>
              ${got ? '<span class="bb-state">Unlocked!</span>' : goal > 1 ? `<span class="bt-progress" aria-label="${n} of ${goal}"><span style="width:${(n / goal) * 100}%"></span></span>` : ""}
            </li>`;
          }).join("")}
        </ul>
        <button type="button" class="book-reset">Start the whole game over</button>
      </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector(".book-close").addEventListener("click", close);
    box.addEventListener("click", (e) => e.target === box && close());
    box.querySelector(".book-reset").addEventListener("click", () => {
      if (window.confirm("Start over? This clears coins, badges and story progress on this device.")) {
        S.reset();
        window.location.reload();
      }
    });
    box.querySelector(".book-close").focus();
  }

  window.MQBadges = {
    DEFS,
    count,
    total: DEFS.length,
    isUnlocked,
    openBook,
    bind: (effects) => (fx = effects),
    onUnlock: (fn) => unlockListeners.add(fn),
  };
})();
