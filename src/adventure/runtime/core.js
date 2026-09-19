// Shared game shell: sound, particles, coins, Hoot the companion, living scenery, and the flow
// prologue → chapter intro → level → results → story outro → restored map.
// Each level calls MQ.register({ id, name, emoji, title?(theme), icon?(theme), mount(stage, api) }).
(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.MQS;
  const AI = window.MQAI;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionReduced = () => reduced || Boolean(S.get().calm);

  // ---------- Sound: Web Audio tones, no audio files ----------
  let ctx = null;
  let muted = Boolean(S.get().muted);
  function audio() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, { at = 0, dur = 0.12, type = "sine", vol = 0.16, to = null } = {}) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
  const notes = (list, step, opts) => list.forEach((f, i) => tone(f, { ...opts, at: i * step }));
  const semis = (base, k) => base * Math.pow(2, k / 12);
  const sfx = {
    tap: () => tone(660, { dur: 0.06, type: "triangle", vol: 0.1 }),
    hop: (k = 0) => tone(semis(330, Math.min(k, 24)), { dur: 0.15, to: semis(495, Math.min(k, 24)), vol: 0.15 }),
    bigHop: () => { tone(220, { dur: 0.42, type: "triangle", to: 880, vol: 0.15 }); tone(1320, { at: 0.34, dur: 0.1, vol: 0.07 }); },
    land: () => tone(170, { dur: 0.09, vol: 0.2 }),
    plop: () => tone(520, { dur: 0.12, to: 260, vol: 0.1 }),
    stretch: (k) => tone(semis(200, k), { dur: 0.05, type: "triangle", vol: 0.05 }),
    ribbit: () => { tone(300, { dur: 0.08, type: "square", to: 200, vol: 0.05 }); tone(260, { at: 0.1, dur: 0.1, type: "square", to: 170, vol: 0.05 }); },
    hoot: () => { tone(420, { dur: 0.16, to: 360, vol: 0.08 }); tone(400, { at: 0.2, dur: 0.22, to: 330, vol: 0.08 }); },
    ten: () => notes([784, 988, 1175, 1568], 0.06, { type: "triangle", dur: 0.12, vol: 0.12 }),
    good: () => notes([523, 659, 784, 1047], 0.08, { type: "triangle", dur: 0.16, vol: 0.14 }),
    wrong: () => tone(240, { dur: 0.24, type: "square", to: 150, vol: 0.05 }),
    pop: () => tone(900, { dur: 0.1, to: 280, vol: 0.14 }),
    coin: () => { tone(1319, { dur: 0.06, type: "square", vol: 0.035 }); tone(1760, { at: 0.05, dur: 0.09, type: "square", vol: 0.035 }); },
    combo: (n) => notes([659, 784, 988].map((f) => semis(f, Math.min(n, 7))), 0.05, { type: "triangle", dur: 0.12, vol: 0.12 }),
    zap: () => tone(220, { dur: 0.3, type: "sawtooth", to: 1400, vol: 0.05 }),
    hit: () => { tone(140, { dur: 0.34, to: 55, vol: 0.3 }); tone(90, { at: 0.02, dur: 0.2, type: "square", vol: 0.04 }); },
    fizzle: () => tone(520, { dur: 0.32, to: 180, vol: 0.12 }),
    block: () => notes([392, 523, 784], 0.05, { type: "square", dur: 0.1, vol: 0.05 }),
    win: () => notes([523, 659, 784, 1047, 1319, 1568], 0.1, { type: "triangle", dur: 0.22, vol: 0.13 }),
    star: (i) => tone(semis(880, i * 4), { dur: 0.22, type: "triangle", vol: 0.14 }),
  };

  // ---------- Effects ----------
  function setSound(enabled) {
    muted = !Boolean(enabled);
    S.update((s) => { s.muted = muted; });
    const button = $("muteBtn");
    button.textContent = muted ? "🔇" : "🔊";
    button.setAttribute("aria-pressed", String(!muted));
    button.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
    S.emit("soundChanged", { enabled: !muted });
    if (!muted) sfx.tap();
  }
  const center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  function spawn(text, cls) {
    const s = document.createElement("span");
    if (cls) s.className = cls;
    s.textContent = text;
    $("fx").appendChild(s);
    return s;
  }
  const at = (x, y, extra = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${extra}`;
  function burst(x, y, { count = 14, chars = ["✨"], colors = ["#ffc933", "#2eb872", "#2d9cdb", "#ff6f61"], spread = 110, size = 24, dur = 750 } = {}) {
    const n = motionReduced() ? Math.min(4, count) : count;
    if (motionReduced()) spread = Math.min(spread, 24);
    for (let i = 0; i < n; i++) {
      const dot = i % 2 === 1;
      const s = spawn(dot ? "" : chars[i % chars.length], dot ? "dot" : "");
      if (dot) s.style.background = colors[i % colors.length];
      else s.style.fontSize = `${size}px`;
      const angle = Math.random() * Math.PI * 2;
      const dist = spread * (0.45 + Math.random() * 0.6);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30;
      const anim = s.animate(
        [
          { transform: at(x, y, "scale(0.4)"), opacity: 1 },
          { transform: at(x + dx, y + dy, `scale(1) rotate(${(Math.random() - 0.5) * 260}deg)`), opacity: 1, offset: 0.6 },
          { transform: at(x + dx * 1.1, y + dy + 46, "scale(0.2)"), opacity: 0 },
        ],
        { duration: dur + Math.random() * 250, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      anim.onfinish = () => s.remove();
    }
  }
  function floatText(x, y, text, tint = "") {
    const s = spawn(text, `float-text ${tint}`);
    s.animate(
      [
        { transform: at(x, y, "scale(0.6)"), opacity: 0 },
        { transform: at(x, y - 30, "scale(1.08)"), opacity: 1, offset: 0.25 },
        { transform: at(x, y - 76, "scale(1)"), opacity: 0 },
      ],
      { duration: reduced ? 900 : 1200, easing: "ease-out" },
    ).onfinish = () => s.remove();
  }
  function shake(el, px = 10) {
    if (motionReduced() || !el) return;
    // Game UI rule: only the world shakes. Controls get a brief brightness flash; words and sound carry the "not yet".
    if (el.closest("button, .chip, .node, .map-secret")) {
      el.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.3) saturate(1.2)" }, { filter: "brightness(1)" }], { duration: 240, easing: "ease-out" });
      return;
    }
    el.animate(
      [{ transform: "translate(0, 0)" }, { transform: `translate(${-px}px, ${px / 3}px)` }, { transform: `translate(${px}px, ${-px / 3}px)` }, { transform: `translate(${-px / 2}px, 0)` }, { transform: "translate(0, 0)" }],
      { duration: 360 },
    );
  }
  const fx = { sfx, burst, floatText, shake, center, audio };

  // ---------- HUD: coins and badges ----------
  function refreshHud() {
    $("coinCount").textContent = String(S.get().coins);
    $("badgeCount").textContent = `${window.MQBadges.count()}/${window.MQBadges.total}`;
  }
  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }
  function addCoins(n, from) {
    const target = center($("coinCount"));
    const origin = from || target;
    for (let i = 0; i < n; i++) {
      const s = spawn("🪙");
      s.style.fontSize = "28px";
      const midX = (origin.x + target.x) / 2 + (Math.random() - 0.5) * 140;
      const midY = Math.min(origin.y, target.y) - 50 - Math.random() * 70;
      s.animate(
        [
          { transform: at(origin.x, origin.y, "scale(0.5)"), opacity: 0 },
          { transform: at(midX, midY, "scale(1.15)"), opacity: 1, offset: 0.45 },
          { transform: at(target.x, target.y, "scale(0.7)"), opacity: 1 },
        ],
        { duration: 720, delay: i * 90, easing: "cubic-bezier(.5,0,.4,1)", fill: "backwards" },
      ).onfinish = () => {
        s.remove();
        S.update((st) => (st.coins += 1));
        refreshHud();
        bump($("coinPill"));
        sfx.coin();
      };
    }
  }

  // ---------- Hoot, the companion ----------
  // Hoot's words live in the companion bar (companion.js), which also watches pauses, misses and streaks.
  // The owl in that bar animates here, and asking for help runs the level's own hint.
  let hintFor = null;
  let hintAsk = 0;
  let streak = 0;
  function hoot(text, { fromAI = false, moment } = {}) {
    window.MQCompanion.say(text, { moment: moment || (fromAI ? "ask" : "note"), byAI: fromAI });
  }
  function react(kind) {
    const btn = $("hootBtn");
    btn.classList.remove("cheer", "think", "wow");
    void btn.offsetWidth;
    btn.classList.add(kind);
  }
  S.on("solved", () => {
    streak += 1;
    react(streak === 3 ? "wow" : "cheer");
  });
  S.on("miss", () => {
    streak = 0;
    react("think");
  });
  function nudgeHoot() {
    react("think");
    window.MQCompanion.offer();
  }
  async function askHoot() {
    sfx.hoot();
    hintCount += 1;
    S.emit("hootAsked");
    if (!hintFor) return;
    const h = hintFor();
    if (!h) return;
    if (typeof h === "string") return hoot(h, { moment: "ask" });
    hoot(h.text, { moment: "ask" });
    if (!h.facts || AI.status() !== "on") return;
    const token = mountToken;
    const ask = ++hintAsk;
    const shown = window.MQCompanion.version();
    $("hootBtn").classList.add("thinking");
    const better = await AI.hint(h.facts);
    $("hootBtn").classList.remove("thinking");
    // Only replace the hint if Hoot has not said anything newer since.
    if (better && token === mountToken && ask === hintAsk && shown === window.MQCompanion.version()) hoot(better, { fromAI: true, moment: "ask" });
  }

  // ---------- Living scenery behind each level ----------
  function scenery(levelId, t) {
    const layer = document.createElement("div");
    layer.className = `scenery${levelId === "fireflies" ? " night" : ""}`;
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = window.MQArt.landscape(`scene-${levelId}`, t.palette);
    return layer;
  }

  // ---------- Levels and flow ----------
  const levels = [];
  let cleanup = null;
  let hintCount = 0;
  let mountToken = null;
  const theme = () => AI.theme();
  const titleOf = (level) => (level.title ? level.title(theme()) : level.name);
  const iconOf = (level) => (level.icon ? level.icon(theme()) : level.emoji);
  const isOpen = (i) => Boolean(levels[i]?.pathway) || i === 0 || S.get().unlockAll || Boolean(S.get().chapters[levels[i - 1].id]);

  function register(level) {
    const existing = levels.findIndex((entry) => entry.id === level.id);
    if (existing >= 0) levels[existing] = level; else levels.push(level);
  }

  async function openLevel(level) {
    if (!level || (level.grade && window.MQClasses?.grade() !== level.grade) || (level.canOpen && !level.canOpen())) return;
    sfx.tap();
    closeLevel();
    if (level.intro && !S.get().chapters[level.id]) {
      const proceed = await level.intro();
      if (proceed === false) return;
    }
    if (!level.pathway && !S.get().chapters[level.id]) await window.MQStory.intro(level.id);
    $("mapScreen").hidden = true;
    $("levelScreen").hidden = false;
    $("homeBtn").hidden = false;
    $("hudTitle").textContent = titleOf(level);
    $("hootBubble").hidden = true;
    streak = 0;
    hintCount = 0;
    const stage = $("stage");
    stage.replaceChildren();
    stage.className = `stage ${level.stageClass || ""}`;
    hintFor = null;
    const token = {};
    mountToken = token;
    // Score, streak, banners and music for this visit (arcade.js).
    const arcade = window.MQArcade.attach(level);
    // Hoot stays beside the child for the whole visit (companion.js); levels report what the child is working on.
    const companion = window.MQCompanion.attach({ alive: () => mountToken === token, ask: askHoot, level, markHelp: () => { hintCount += 1; S.emit("hootAsked"); }, hint: () => hintFor?.() });
    const api = {
      sfx, burst, floatText, shake, center, addCoins, hoot, nudgeHoot, react, companion,
      get reduced() { return motionReduced(); },
      theme: theme(),
      ai: AI,
      arcade,
      state: S.get(),
      emit: (event, data) => mountToken === token && S.emit(event, data),
      fact: (text) => S.addFact(level.id, text),
      alive: () => mountToken === token,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, motionReduced() ? Math.min(ms, 250) : ms)),
      setHint: (fn) => { hintFor = fn; hintAsk++; },
      hintsUsed: () => hintCount,
      observe: (evidence) => mountToken === token && window.MQLearning.observe(evidence),
      learningPlan: (skill) => window.MQLearning.plan(skill),
      finish: (result) => {
        if (mountToken !== token) return;
        const summary = arcade.finish();
        showResult(level, result);
        window.MQArcade.decorateResult($("result").querySelector(".result-card"), summary, result.stars);
      },
    };
    cleanup = level.mount(stage, api) || null;
    window.MQCompanion.ready();
    stage.prepend(scenery(level.id, theme()));
    arcade.start(stage);
    window.scrollTo(0, 0);
  }

  function closeLevel() {
    mountToken = null;
    window.MQCompanion.detach();
    window.MQArcade?.detach();
    if (cleanup) cleanup();
    cleanup = null;
    $("stage").replaceChildren();
    document.querySelectorAll(".fx .card-ghost, .fx .bolt, .fx .drag-card, .fx .arcade-spark").forEach((el) => el.remove());
  }

  function showMap(restored) {
    closeLevel();
    $("result").hidden = true;
    $("levelScreen").hidden = true;
    $("mapScreen").hidden = false;
    $("homeBtn").hidden = true;
    $("hootBubble").hidden = true;
    $("hudTitle").textContent = theme().world;
    window.MQMap.render(restored);
    window.scrollTo(0, 0);
  }

  function showResult(level, r) {
    const firstTime = !S.get().chapters[level.id];
    S.update((s) => {
      s.stars[level.id] = Math.max(s.stars[level.id] || 0, r.stars);
      s.chapters[level.id] = true;
    });
    S.emit("levelDone", { id: level.id, stars: r.stars });
    const next = levels[levels.indexOf(level) + 1];
    const box = $("result");
    const s = S.get();
    box.innerHTML = `<div class="result-card" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
        <p class="result-chapter">${level.resultKicker ? level.resultKicker : level.campaign ? level.chapterNumber ? `${level.chapterNumber > 6 ? "A PLACE TO GROW" : "SKYBOUND"} · CHAPTER ${level.chapterNumber}` : "YOUR STORY LAB ADVENTURE" : level.pathway ? "YOUR LEARNING ATLAS" : window.MQStory.chapterTitle(level.id)}</p>
        <div class="result-hero" aria-hidden="true"><span class="rh-main">${r.emoji || iconOf(level)}</span><span class="rh-me">${S.hero()}${s.hat ? `<i class="rh-hat" data-slot="${window.MQShop.slotFor(s.hat)}">${s.hat}</i>` : ""}</span>${s.pet ? `<span class="rh-pet">${s.pet}</span>` : ""}</div>
        <h2 id="resultTitle">${r.title}</h2>
        <div class="result-stars" role="img" aria-label="${r.stars} of 3 stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
        <p class="result-note">${r.note}</p>
        <div class="result-actions">
          <button type="button" class="btn secondary" data-act="again">Play again</button>
          <button type="button" class="btn" data-act="go">${level.resultLabel ? level.resultLabel : level.campaign ? "Story + bonus game →" : level.pathway ? "Back to learning atlas" : firstTime ? "Continue the story" : next ? "Next chapter" : "Back to the map"}</button>
        </div>
      </div>`;
    box.hidden = false;
    sfx.win();
    burst(window.innerWidth / 2, window.innerHeight * 0.32, { count: 26, chars: ["⭐", "✨", theme().glow], spread: 260 });
    box.querySelectorAll(".result-stars span").forEach((el, i) => {
      if (i >= r.stars) return;
      setTimeout(() => {
        el.classList.add("on");
        sfx.star(i);
        const c = center(el);
        burst(c.x, c.y, { count: 8, spread: 60 });
      }, 500 + i * 380);
    });
    box.querySelector('[data-act="again"]').onclick = () => {
      box.hidden = true;
      openLevel(level);
    };
    const go = box.querySelector('[data-act="go"]');
    go.onclick = async () => {
      box.hidden = true;
      if (level.outro) {
        closeLevel();
        await level.outro();
        showMap(level.id);
      } else if (level.pathway) {
        showMap();
      } else if (firstTime) {
        closeLevel();
        await window.MQStory.outro(level.id);
        showMap(level.id);
      } else if (next) {
        openLevel(next);
      } else {
        showMap();
      }
    };
    go.focus();
  }

  function start() {
    window.MQBadges.bind(fx);
    window.MQBadges.onUnlock(refreshHud);
    window.MQStory.bind(fx);
    window.MQShop.bind(fx, () => {
      refreshHud();
      if (!$("mapScreen").hidden) window.MQMap.render();
    });
    if (S.get().theme) AI.setTheme(S.get().theme);
    $("homeBtn").addEventListener("click", () => {
      sfx.tap();
      showMap();
    });
    $("muteBtn").setAttribute("aria-pressed", String(!muted));
    $("muteBtn").setAttribute("aria-label", muted ? "Sound off" : "Sound on");
    $("muteBtn").addEventListener("click", () => setSound(muted));
    $("hootBtn").addEventListener("click", askHoot);
    $("badgeBtn").addEventListener("click", () => {
      sfx.tap();
      window.MQBadges.openBook();
    });
    $("shopBtn").addEventListener("click", () => {
      sfx.tap();
      window.MQShop.open();
    });
    $("storyBtn").addEventListener("click", () => window.MQStory.prologue());
    $("unlockBtn").addEventListener("click", () => {
      S.update((s) => (s.unlockAll = true));
      sfx.good();
      window.MQMap.render();
    });
    // ?demo=1 opens every chapter, and with them Apex. It sets the same playtest flag the hidden
    // "unlock all chapters" button sets, so nothing about how progress is EARNED changes — it is only a
    // way to reach any screen for a recording or a walkthrough. Clear it with unlockAll = false.
    try { if (new URLSearchParams(location.search).has("demo")) S.update((s) => (s.unlockAll = true)); } catch { /* no URL in some embeds */ }
    refreshHud();
    window.MQMap.init();
    if (!S.get().prologue) window.MQStory.prologue();
  }

  window.MQ = { register, start, levels, fx, openLevel, showMap, isOpen, titleOf, iconOf, refreshHud, sound: { enabled: () => !muted, set: setSound } };
})();
