// Arcade layer shared by every level: score, streak multiplier, power mode, pop words, banners, impacts,
// hit-stop, a small synthesized soundtrack and the score tally on the result card. Points reward correct
// thinking and runs of it, never speed; a miss only resets the streak. Reduced motion and calm mode keep
// the numbers and words but drop shakes, flashes, hit-stops and particles. Calm mode also stops the music.
import { award, formatScore, multiplier, nextStreak, powerFill, praise, recordBest, restoreBest, ruleFor } from "../arcadeScore";

(function () {
  const S = window.MQS;
  const $ = (id) => document.getElementById(id);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const calm = () => Boolean(S.get().calm);
  const still = () => motion.matches || calm();
  const fx = () => window.MQ.fx;
  const semis = (base, k) => base * Math.pow(2, k / 12);
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const at = (x, y, extra = "") => `translate(${x}px, ${y}px) translate(-50%, -50%) ${extra}`;
  // These games award their own points; every other level (the atlas trails) scores each discovery.
  const OWN_SCORING = new Set(["frog", "fireflies", "guardian"]);

  // ---------- Sound effects: synthesized, silent while the sound button is off ----------
  let noise = null;
  function voice(ac, dest, freq, t, { dur = 0.1, type = "square", vol = 0.05, to = null } = {}) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function hiss(ac, dest, t, { dur = 0.1, vol = 0.05, type = "highpass", freq = 5000, to = null, q = 0.8 } = {}) {
    if (!noise || noise.sampleRate !== ac.sampleRate) {
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer = noise;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    filter.Q.value = q;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  function play(fn) {
    const ac = fx().audio?.();
    if (ac) fn(ac, ac.destination, ac.currentTime);
  }
  const snd = {
    ready: () => play((ac, d, t) => voice(ac, d, 587, t, { dur: 0.14, vol: 0.05 })),
    go: () => play((ac, d, t) => [784, 988, 1175, 1568].forEach((f, i) => voice(ac, d, f, t + i * 0.035, { dur: 0.26, vol: 0.04 }))),
    lock: () => play((ac, d, t) => [1047, 1568].forEach((f, i) => voice(ac, d, f, t + i * 0.06, { dur: 0.16, type: "triangle", vol: 0.07 }))),
    pickup: (i) => play((ac, d, t) => voice(ac, d, semis(880, Math.min(i, 18)), t, { dur: 0.07, vol: 0.035 })),
    word: (tier) => play((ac, d, t) => [0, 4, 7, 12].slice(0, tier + 1).forEach((k, i) => voice(ac, d, semis(659, k + tier * 2), t + i * 0.05, { dur: 0.15, type: "triangle", vol: 0.07 }))),
    impact: (power) => play((ac, d, t) => {
      voice(ac, d, 150, t, { dur: 0.2 + power * 0.06, type: "sine", to: 40, vol: 0.18 + power * 0.05 });
      hiss(ac, d, t, { dur: 0.1 + power * 0.05, vol: 0.05 + power * 0.03, type: "lowpass", freq: 2600, to: 280 });
    }),
    whoosh: () => play((ac, d, t) => hiss(ac, d, t, { dur: 0.38, vol: 0.07, type: "bandpass", freq: 380, to: 3200, q: 1.3 })),
    charge: () => play((ac, d, t) => voice(ac, d, 330, t, { dur: 0.46, type: "sawtooth", to: 1320, vol: 0.022 })),
    powerOn: () => play((ac, d, t) => [0, 4, 7, 12, 16, 19, 24].forEach((k, i) => voice(ac, d, semis(523, k), t + i * 0.045, { dur: 0.16, vol: 0.035 }))),
    cool: () => play((ac, d, t) => voice(ac, d, 523, t, { dur: 0.32, type: "triangle", to: 262, vol: 0.05 })),
    shatter: () => play((ac, d, t) => {
      hiss(ac, d, t, { dur: 0.3, vol: 0.09, type: "highpass", freq: 2400 });
      [2093, 2637, 3136].forEach((f, i) => voice(ac, d, f, t + 0.03 + i * 0.05, { dur: 0.09, type: "triangle", vol: 0.04 }));
    }),
    tick: () => play((ac, d, t) => voice(ac, d, 1760, t, { dur: 0.03, vol: 0.016 })),
    stamp: () => play((ac, d, t) => {
      voice(ac, d, 120, t, { dur: 0.2, type: "sine", to: 55, vol: 0.22 });
      [1047, 1319, 1568, 2093].forEach((f, i) => voice(ac, d, f, t + 0.1 + i * 0.06, { dur: 0.18, type: "triangle", vol: 0.06 }));
    }),
  };

  // ---------- Soundtrack: a small step sequencer per game, with a lead line in power mode ----------
  const SONGS = {
    frog: {
      bpm: 126, key: 60, chords: [[0, 4], [7, 4], [9, 3], [5, 4]],
      kick: "x.......x.......", hat: "..x...x...x...x.", bass: "x..x....x..x..x.",
      lead: [0, null, 1, 2, null, 3, 2, null, 1, null, 2, 3, null, 2, 1, null],
    },
    fireflies: {
      bpm: 96, key: 57, chords: [[0, 3], [5, 3], [3, 4], [7, 3]],
      kick: "x.........x.....", hat: "....x.......x...", bass: "x.......x.....x.",
      lead: [3, null, null, 2, null, null, 1, null, 2, null, null, 3, null, 1, null, null],
    },
    guardian: {
      bpm: 136, key: 50, chords: [[0, 3], [0, 3], [5, 3], [3, 4]],
      kick: "x...x...x...x...", hat: "..x...x...x...xx", bass: "x.xx..x.x.xx..x.",
      lead: [0, 0, 2, null, 0, 0, 3, null, 0, 0, 2, null, 1, null, 2, 3],
    },
  };
  const music = { song: null, timer: 0, step: 0, next: 0, bus: null, power: false };
  function fadeBus() {
    const bus = music.bus;
    music.bus = null;
    if (!bus) return;
    const t = bus.context.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    setTimeout(() => bus.disconnect(), 450);
  }
  function startMusic(id) {
    stopMusic();
    if (!SONGS[id]) return;
    music.song = SONGS[id];
    music.step = 0;
    music.next = 0;
    music.timer = setInterval(schedule, 40);
  }
  function stopMusic() {
    clearInterval(music.timer);
    music.timer = 0;
    music.song = null;
    music.power = false;
    fadeBus();
  }
  function schedule() {
    const song = music.song;
    const ac = song && !calm() && !document.hidden ? fx().audio?.() : null;
    if (!ac) {
      fadeBus();
      music.next = 0;
      return;
    }
    if (!music.bus || music.bus.context !== ac) {
      music.bus = ac.createGain();
      music.bus.gain.setValueAtTime(0.0001, ac.currentTime);
      music.bus.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.8);
      music.bus.connect(ac.destination);
    }
    const len = 60 / song.bpm / 4;
    if (music.next < ac.currentTime) music.next = ac.currentTime + 0.05;
    while (music.next < ac.currentTime + 0.15) {
      beat(ac, song, music.step, music.next, len);
      music.next += len;
      music.step += 1;
    }
  }
  function beat(ac, song, n, t, len) {
    const bus = music.bus;
    const i = n % 16;
    const [root, third] = song.chords[Math.floor(n / 16) % song.chords.length];
    const base = song.key + root;
    if (song.kick[i] === "x") voice(ac, bus, 120, t, { dur: 0.14, type: "sine", to: 45, vol: 0.1 });
    if (song.hat[i] === "x") hiss(ac, bus, t, { dur: 0.035, vol: music.power ? 0.028 : 0.016, freq: 7200 });
    if (song.bass[i] === "x") voice(ac, bus, midi(base - 12), t, { dur: len * 1.7, type: "triangle", vol: 0.075 });
    if (i === 0 || i === 8) [0, third, 7].forEach((k) => voice(ac, bus, midi(base + k), t, { dur: len * 7, type: "sine", vol: 0.012 }));
    const tone = music.power ? song.lead[i] : null;
    if (tone !== null && tone !== undefined) voice(ac, bus, midi(base + 12 + [0, third, 7, 12][tone]), t, { dur: len * 0.9, type: "square", vol: 0.016 });
  }

  // ---------- Score panel: stacked under Hoot, outside the stage so levels can redraw freely ----------
  let hud = null;
  let live = null;
  function ensureHud() {
    if (hud) return;
    hud = document.createElement("div");
    hud.className = "arcade-hud";
    hud.hidden = true;
    hud.innerHTML = '<p class="ah-score"><span class="ah-label">Score</span><b class="ah-value">0</b></p><div class="ah-streak"><b class="ah-mult">×1</b><span class="ah-meter" aria-hidden="true"><i></i></span></div><p class="ah-power">Power ×2</p>';
    $("hootBubble").before(hud);
    live = document.createElement("p");
    live.className = "visually-hidden";
    live.setAttribute("aria-live", "polite");
    $("levelScreen").appendChild(live);
  }
  function announce(text) {
    if (!live) return;
    live.textContent = "";
    setTimeout(() => (live.textContent = text), 60);
  }

  let run = null;
  let rolling = 0;
  function spawn(cls, text = "") {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    $("fx").appendChild(s);
    return s;
  }
  function once(el, frames, duration, easing = "ease-out") {
    el.animate(frames, { duration, easing }).onfinish = () => el.remove();
  }
  function show(r) {
    if (run !== r) return;
    hud.querySelector(".ah-mult").textContent = `×${multiplier(r.streak, r.rule) * (r.power ? 2 : 1)}`;
    hud.querySelector(".ah-meter i").style.width = `${powerFill(r.streak, r.rule) * 100}%`;
    hud.toggleAttribute("data-power", r.power);
    const value = hud.querySelector(".ah-value");
    cancelAnimationFrame(rolling);
    if (r.shown === r.score) {
      value.textContent = formatScore(r.score);
      return;
    }
    const from = r.shown;
    const begin = performance.now();
    const dur = still() ? 0 : 450;
    const roll = (now) => {
      const k = dur ? Math.min(1, (now - begin) / dur) : 1;
      r.shown = Math.round(from + (r.score - from) * (1 - Math.pow(1 - k, 3)));
      value.textContent = formatScore(r.shown);
      if (k < 1 && run === r) rolling = requestAnimationFrame(roll);
    };
    rolling = requestAnimationFrame(roll);
    if (!still()) {
      value.classList.remove("bump");
      void value.offsetWidth;
      value.classList.add("bump");
    }
  }

  // ---------- Pop words, points and banners ----------
  function word(x, y, text, tone = "gold", size = "big") {
    const s = spawn("arcade-word", text);
    s.dataset.tone = tone;
    s.dataset.size = size;
    const halfW = s.offsetWidth / 2 + 12;
    const cx = Math.min(window.innerWidth - halfW, Math.max(halfW, x));
    const cy = Math.max(s.offsetHeight / 2 + 12, y);
    const tilt = `rotate(${((Math.random() - 0.5) * 8).toFixed(1)}deg)`;
    const frames = still()
      ? [{ transform: at(cx, cy), opacity: 0 }, { transform: at(cx, cy), opacity: 1, offset: 0.12 }, { transform: at(cx, cy), opacity: 1, offset: 0.8 }, { transform: at(cx, cy), opacity: 0 }]
      : [
          { transform: at(cx, cy + 24, `${tilt} scale(0.2)`), opacity: 0 },
          { transform: at(cx, cy, `${tilt} scale(1.22)`), opacity: 1, offset: 0.16 },
          { transform: at(cx, cy, `${tilt} scale(1)`), opacity: 1, offset: 0.28 },
          { transform: at(cx, cy - 18, `${tilt} scale(1)`), opacity: 1, offset: 0.8 },
          { transform: at(cx, cy - 44, `${tilt} scale(0.92)`), opacity: 0 },
        ];
    once(s, frames, size === "big" ? 1250 : 1100);
  }
  function points(x, y, n, mult) {
    const s = spawn("arcade-points", `+${formatScore(n)}`);
    if (mult > 1) {
      const b = document.createElement("b");
      b.textContent = ` ×${mult}`;
      s.appendChild(b);
    }
    const frames = still()
      ? [{ transform: at(x, y), opacity: 0 }, { transform: at(x, y), opacity: 1, offset: 0.15 }, { transform: at(x, y), opacity: 0 }]
      : [{ transform: at(x, y, "scale(0.5)"), opacity: 0 }, { transform: at(x, y - 24, "scale(1.15)"), opacity: 1, offset: 0.2 }, { transform: at(x, y - 64, "scale(1)"), opacity: 0 }];
    once(s, frames, 1000);
  }
  function banner(r, text, { sub = "", tone = "gold", hold = 900 } = {}) {
    if (run !== r) return Promise.resolve();
    const el = document.createElement("div");
    el.className = "arcade-banner";
    el.dataset.tone = tone;
    el.setAttribute("aria-hidden", "true");
    const title = document.createElement("b");
    title.textContent = text;
    el.appendChild(title);
    if (sub) {
      const line = document.createElement("span");
      line.textContent = sub;
      el.appendChild(line);
    }
    $("levelScreen").appendChild(el);
    announce(sub ? `${text} ${sub}` : text);
    const frames = still()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: "translateX(-40%) skewX(-14deg)" },
          { opacity: 1, transform: "translateX(3%) skewX(-4deg)", offset: 0.16 },
          { opacity: 1, transform: "translateX(0) skewX(0)", offset: 0.24 },
          { opacity: 1, transform: "translateX(0) skewX(0)", offset: 0.84 },
          { opacity: 0, transform: "translateX(40%) skewX(12deg)" },
        ];
    const done = () => el.remove();
    return el.animate(frames, { duration: hold + 520, easing: "ease-out" }).finished.then(done, done);
  }

  // ---------- Impacts: ring, flash, world shake and a short freeze ----------
  function ring(x, y, power, tone) {
    const s = spawn("arcade-ring");
    s.dataset.tone = tone;
    once(s, [{ transform: at(x, y, "scale(0.15)"), opacity: 1 }, { transform: at(x, y, `scale(${1.1 + power * 0.55})`), opacity: 0 }], 460 + power * 70, "cubic-bezier(.2,.8,.3,1)");
  }
  function flash(r, x, y, tone, power) {
    const now = performance.now();
    if (now - r.flashAt < 450) return; // never more than about two flashes a second
    r.flashAt = now;
    const screen = $("levelScreen");
    const box = screen.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "arcade-flash";
    el.dataset.tone = tone;
    el.style.setProperty("--fx-x", `${x - box.left}px`);
    el.style.setProperty("--fx-y", `${y - box.top}px`);
    screen.appendChild(el);
    once(el, [{ opacity: 0 }, { opacity: Math.min(0.55, 0.25 + power * 0.1), offset: 0.25 }, { opacity: 0 }], 280);
  }
  // Only the world shakes: the scenery and the game objects a level passes in, never panels or controls.
  function quake(r, els, px) {
    const scenery = r.stage && r.stage.querySelector(":scope > .scenery");
    for (const el of [scenery, ...els]) {
      if (!el) continue;
      el.animate(
        [{ translate: "0 0" }, { translate: `${-px}px ${px * 0.45}px` }, { translate: `${px * 0.8}px ${-px * 0.35}px` }, { translate: `${-px * 0.45}px ${px * 0.2}px` }, { translate: "0 0" }],
        { duration: 300, easing: "ease-out" },
      );
    }
  }
  function freeze(r, ms) {
    const keep = ".arcade-ring, .arcade-word, .arcade-points";
    const anims = [r.stage, $("fx")]
      .filter(Boolean)
      .flatMap((el) => el.getAnimations({ subtree: true }))
      .filter((a) => a.playState === "running" && !a.effect?.target?.matches?.(keep));
    anims.forEach((a) => a.pause());
    r.frozenUntil = performance.now() + ms;
    return new Promise((resolve) => {
      setTimeout(() => {
        anims.forEach((a) => a.playState === "paused" && a.play());
        resolve();
      }, ms);
    });
  }

  // ---------- A run: one visit to one level ----------
  function attach(level) {
    ensureHud();
    detach();
    const r = {
      id: level.id, rule: ruleFor(level.pathway ? "trail" : level.id), auto: !OWN_SCORING.has(level.id),
      score: 0, shown: 0, streak: 0, bestStreak: 0, power: false, counts: {}, frozenUntil: 0, flashAt: 0, stage: null, queue: Promise.resolve(),
    };
    run = r;
    hud.hidden = false;
    hud.dataset.game = level.pathway ? "trail" : level.id;
    show(r);
    r.api = makeApi(r);
    return r.api;
  }
  function detach() {
    run = null;
    stopMusic();
    if (hud) hud.hidden = true;
    const screen = $("levelScreen");
    if (!screen) return;
    delete screen.dataset.power;
    screen.querySelectorAll(".arcade-banner, .arcade-flash").forEach((el) => el.remove());
  }

  function makeApi(r) {
    const alive = () => run === r;
    const queueBanner = (text, opts) => (r.queue = r.queue.then(() => banner(r, text, opts)));
    function powerCheck() {
      const on = r.streak >= r.rule.power;
      if (on === r.power) return;
      r.power = on;
      music.power = on;
      const screen = $("levelScreen");
      if (on) {
        screen.dataset.power = "on";
        r.counts.power = (r.counts.power || 0) + 1;
        snd.powerOn();
        queueBanner("Power mode!", { sub: "Points ×2", tone: "rainbow", hold: 700 });
        S.emit("powerMode", { id: r.id });
      } else {
        delete screen.dataset.power;
        snd.cool();
        announce("Power mode is resting. Start a new streak!");
      }
    }
    return {
      snd,
      /** True during a hit-stop; animation loops skip movement while it lasts. */
      get frozen() {
        return alive() && performance.now() < r.frozenUntil;
      },
      start(stage) {
        if (!alive()) return;
        r.stage = stage;
        if (r.auto) return;
        startMusic(r.id);
        snd.ready();
        queueBanner("Ready?", { tone: "sky", hold: 320 }).then(() => {
          if (!alive()) return;
          snd.go();
          queueBanner("Go!", { tone: "gold", hold: 240 });
        });
      },
      /** A success: grows the streak, then awards points with the streak's multiplier. */
      hit({ points: base = 100, x, y, word: text = null, tone = "gold", wordX, wordY, quiet = false } = {}) {
        if (!alive()) return 0;
        r.streak = nextStreak(r.streak, true);
        r.bestStreak = Math.max(r.bestStreak, r.streak);
        powerCheck();
        const got = award(base, r.streak, r.rule);
        r.score += got.points;
        show(r);
        if (quiet || x === undefined) return got.points;
        points(x, y, got.points, got.mult * (got.power ? 2 : 1));
        const cheer = text ? { word: text, tier: 2 } : praise(r.streak);
        if (cheer) {
          word(wordX ?? x, wordY ?? y - 84, cheer.word, text ? tone : ["leaf", "leaf", "sky", "coral"][cheer.tier], cheer.tier >= 2 ? "big" : "small");
          snd.word(cheer.tier);
        }
        return got.points;
      },
      /** Extra points for something special; bonuses never change the streak. */
      bonus({ points: n = 100, x, y, label = "", tone = "gold", pop = true } = {}) {
        if (!alive()) return 0;
        r.score += n;
        show(r);
        if (x !== undefined) {
          if (label) {
            word(x, y, label, tone, "small");
            snd.word(1);
          }
          if (pop) points(x, y + 46, n, 1);
        }
        return n;
      },
      say(x, y, text, tone = "sky") {
        if (alive()) word(x, y, text, tone, "small");
      },
      /** A miss cools the streak and nothing else: no points are ever taken away. */
      miss() {
        if (!alive()) return;
        const had = r.streak;
        r.streak = nextStreak(r.streak, false);
        if (r.power) powerCheck();
        else if (had >= 2) snd.cool();
        show(r);
      },
      /** A collectible: points at the current multiplier, and a spark that flies into the score. */
      pickup(from, i = 0, base = 10) {
        if (!alive()) return 0;
        const got = award(base, Math.max(1, r.streak), r.rule);
        r.score += got.points;
        snd.pickup(i);
        const value = hud.querySelector(".ah-value");
        const to = fx().center(value);
        if (still() || !to.x) {
          show(r);
          return got.points;
        }
        const s = spawn("arcade-spark");
        const midX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 120;
        const midY = Math.min(from.y, to.y) - 40 - Math.random() * 60;
        s.animate(
          [{ transform: at(from.x, from.y, "scale(1)") }, { transform: at(midX, midY, "scale(1.2)"), offset: 0.45 }, { transform: at(to.x, to.y, "scale(0.4)"), opacity: 0.6 }],
          { duration: 560, easing: "cubic-bezier(.5,0,.4,1)" },
        ).onfinish = () => {
          s.remove();
          show(r);
        };
        return got.points;
      },
      banner: (text, opts) => (alive() ? queueBanner(text, opts) : Promise.resolve()),
      impact({ x, y, power = 2, tone = "gold", world = [] } = {}) {
        if (!alive()) return Promise.resolve();
        snd.impact(power);
        if (still()) return Promise.resolve();
        ring(x, y, power, tone);
        flash(r, x, y, tone, power);
        quake(r, world, 2 + power * 3);
        return freeze(r, 30 + power * 30);
      },
      /** Sparkles that follow a moving element, such as a hopper mid-leap or a spell bolt. */
      trail(el, dur) {
        if (!alive() || still()) return;
        const n = 8;
        for (let k = 1; k <= n; k++) {
          setTimeout(() => {
            if (!alive() || !el.isConnected) return;
            const c = fx().center(el);
            const s = spawn("arcade-sparkle", "✦");
            const dx = (Math.random() - 0.5) * 24;
            once(s, [{ transform: at(c.x + dx, c.y + 14, "scale(1)"), opacity: 0.95 }, { transform: at(c.x + dx, c.y + 44, "scale(0.2) rotate(120deg)"), opacity: 0 }], 520);
          }, (dur * k) / (n + 1));
        }
      },
      /** A crackle of light joining points on the screen, for three-number connections. */
      zap(pts) {
        if (!alive() || still() || pts.length < 2) return;
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "arcade-zap");
        svg.setAttribute("aria-hidden", "true");
        const line = document.createElementNS(NS, "polyline");
        const jag = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          for (let k = 0; k < 5; k++) {
            const u = k / 5;
            const off = k === 0 ? 0 : (Math.random() - 0.5) * 26;
            jag.push(`${a.x + (b.x - a.x) * u + off},${a.y + (b.y - a.y) * u - off}`);
          }
        }
        const last = pts[pts.length - 1];
        jag.push(`${last.x},${last.y}`);
        line.setAttribute("points", jag.join(" "));
        svg.appendChild(line);
        $("fx").appendChild(svg);
        svg.animate([{ opacity: 1 }, { opacity: 0.35, offset: 0.3 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 320 }).onfinish = () => svg.remove();
        snd.charge();
      },
      shatter(el, { tone = "leaf", count = 8 } = {}) {
        if (!alive()) return;
        snd.shatter();
        if (still()) return;
        const c = fx().center(el);
        for (let i = 0; i < count; i++) {
          const s = spawn("arcade-shard");
          s.dataset.tone = tone;
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 60 + Math.random() * 80;
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist - 40;
          const spin = (Math.random() - 0.5) * 720;
          once(s, [
            { transform: at(c.x, c.y, "rotate(0deg) scale(1)"), opacity: 1 },
            { transform: at(c.x + dx, c.y + dy, `rotate(${spin * 0.6}deg) scale(0.9)`), opacity: 1, offset: 0.4 },
            { transform: at(c.x + dx * 1.25, c.y + dy + 170, `rotate(${spin}deg) scale(0.55)`), opacity: 0 },
          ], 950 + Math.random() * 250, "cubic-bezier(.25,.6,.4,1)");
        }
      },
      /** Leaves blown across the scene when the Guardian blocks a spell. */
      gust() {
        if (!alive() || still() || !r.stage) return;
        const box = r.stage.getBoundingClientRect();
        for (let i = 0; i < 7; i++) {
          const s = spawn("arcade-leaf", "🍃");
          const y = box.top + box.height * (0.15 + Math.random() * 0.55);
          s.animate(
            [
              { transform: at(box.left - 40, y, "rotate(0deg)"), opacity: 0 },
              { opacity: 1, offset: 0.2 },
              { transform: at(box.right + 40, y - 70 + Math.random() * 140, `rotate(${400 + Math.random() * 300}deg)`), opacity: 0 },
            ],
            { duration: 950 + i * 60, delay: i * 55, easing: "ease-in-out", fill: "backwards" },
          ).onfinish = () => s.remove();
        }
      },
      fireworks(n = 3) {
        if (!alive()) return;
        const box = (r.stage || $("levelScreen")).getBoundingClientRect();
        for (let i = 0; i < n; i++) {
          setTimeout(() => {
            if (run !== r) return;
            const x = box.left + box.width * (0.18 + 0.64 * Math.random());
            const y = box.top + box.height * (0.18 + 0.32 * Math.random());
            fx().burst(x, y, { count: 20, chars: ["✨", "⭐", "✦"], colors: ["#ffd84d", "#ff6f61", "#2eb872", "#2d9cdb", "#b98cff"], spread: 170 });
            if (!still()) ring(x, y, 1, i % 2 ? "sky" : "gold");
            fx().sfx.pop();
          }, 150 + i * 280);
        }
      },
      /** Sparks gathering into an element while a spell charges. */
      charge(target) {
        if (!alive()) return;
        snd.charge();
        if (still()) return;
        const c = fx().center(target);
        for (let i = 0; i < 10; i++) {
          const s = spawn("arcade-sparkle", "✦");
          const angle = (i / 10) * Math.PI * 2;
          const dist = 90 + Math.random() * 50;
          s.animate(
            [
              { transform: at(c.x + Math.cos(angle) * dist, c.y + Math.sin(angle) * dist, "scale(0.7)"), opacity: 0 },
              { opacity: 1, offset: 0.3 },
              { transform: at(c.x, c.y, "scale(0.2)"), opacity: 0.1 },
            ],
            { duration: 460, delay: i * 16, easing: "cubic-bezier(.6,0,.9,.5)", fill: "backwards" },
          ).onfinish = () => s.remove();
        }
      },
      /** Count a highlight for the result card, such as a bullseye or a critical spell. */
      note(key) {
        if (alive()) r.counts[key] = (r.counts[key] || 0) + 1;
      },
      /** End of the level: stop the music, save a best score and summarize the run for the result card. */
      finish() {
        if (!alive()) return null;
        stopMusic();
        const record = recordBest(restoreBest(S.get().best), r.id, r.score);
        S.update((s) => {
          s.best = record.best;
        });
        if (record.newBest && record.previous > 0) S.emit("newBest", { id: r.id, score: r.score, previous: record.previous });
        const c = r.counts;
        const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
        const highlights = [
          r.bestStreak >= 2 && ["🔥", `Best streak ${r.bestStreak}`],
          c.power && ["⚡", "Power mode"],
          c.bullseye && ["🎯", count(c.bullseye, "bullseye", "bullseyes")],
          c.leap && ["🚀", count(c.leap, "super leap", "super leaps")],
          c.perfect && ["💯", count(c.perfect, "perfect round", "perfect rounds")],
          c.golden && ["🌟", count(c.golden, "golden glow", "golden glows")],
          c.triple && ["✨", count(c.triple, "triple", "triples")],
          c.critical && ["💥", count(c.critical, "critical spell", "critical spells")],
          c.block && ["🛡️", "Perfect block"],
        ].filter(Boolean).slice(0, 4);
        return { id: r.id, score: r.score, best: record.best[r.id] || 0, previous: record.previous, newBest: record.newBest, highlights };
      },
    };
  }

  // ---------- Score tally on the result card ----------
  function decorateResult(card, a, stars = 0) {
    if (!card || !a) return;
    const block = document.createElement("div");
    block.className = "result-score";
    block.innerHTML = `<p class="visually-hidden">Score ${formatScore(a.score)}. ${a.newBest ? "A new best score!" : `Best score ${formatScore(a.best)}.`}</p>
      <p class="rs-row" aria-hidden="true"><span class="rs-label">Score</span><b class="rs-value">${still() ? formatScore(a.score) : "0"}</b>${a.newBest ? '<span class="rs-new">New best!</span>' : `<span class="rs-best">Best ${formatScore(a.best)}</span>`}</p>
      ${a.highlights.length ? `<ul class="rs-highlights">${a.highlights.map(([icon, text]) => `<li><span aria-hidden="true">${icon}</span> ${text}</li>`).join("")}</ul>` : ""}`;
    const anchor = card.querySelector(".result-stars") || card.querySelector("h2");
    if (anchor) anchor.after(block);
    else card.appendChild(block);
    const stamp = block.querySelector(".rs-new");
    if (still()) {
      if (stamp) stamp.classList.add("show");
      return;
    }
    const value = block.querySelector(".rs-value");
    const begin = performance.now() + 600 + stars * 380;
    const dur = Math.min(1400, 500 + a.score / 20);
    let lastTick = 0;
    const count = (now) => {
      if (!value.isConnected) return;
      const k = Math.max(0, Math.min(1, (now - begin) / dur));
      value.textContent = formatScore(Math.round(a.score * (1 - Math.pow(1 - k, 3))));
      if (k > 0 && k < 1 && now - lastTick > 75) {
        lastTick = now;
        snd.tick();
      }
      if (k < 1) {
        requestAnimationFrame(count);
      } else if (stamp) {
        stamp.classList.add("show");
        snd.stamp();
        const c = fx().center(stamp);
        fx().burst(c.x, c.y, { count: 14, chars: ["⭐", "✨"], spread: 90 });
      }
    };
    requestAnimationFrame(count);
  }

  // Levels without their own scoring (the learning atlas trails) score each discovery.
  S.on("solved", (d) => {
    const r = run;
    if (!r || !r.auto) return;
    // Narrative missions keep their equations and world animation as the main feedback.
    if (r.stage?.classList.contains("voyage-stage") || r.stage?.classList.contains("frontier-stage")) {
      r.api.hit({ points: d.afterMistake ? 150 : 250, quiet: true });
      return;
    }
    // Pop over the top of the puzzle board, clear of the prompt text.
    const board = document.querySelector("#trailBoard, [data-arcade-anchor]") || r.stage;
    const b = board ? board.getBoundingClientRect() : { left: 0, top: window.innerHeight / 3, width: window.innerWidth };
    r.api.hit({ points: d.afterMistake ? 150 : 250, x: b.left + b.width / 2, y: b.top + 90, wordY: b.top + 20 });
  });
  S.on("miss", () => {
    if (run && run.auto) run.api.miss();
  });

  // Clear floating words and points, for example when a summary card opens over the play area.
  function clearPops() {
    document.querySelectorAll("#fx .arcade-word, #fx .arcade-points").forEach((el) => el.remove());
  }
  // Streak words for the story mini-games, which cheer without keeping a score.
  function cheer(x, y, text, tier = 2) {
    word(x, y, text, ["leaf", "leaf", "sky", "coral"][tier] || "gold", tier >= 2 ? "big" : "small");
    snd.word(tier);
  }

  window.MQArcade = { attach, detach, decorateResult, clearPops, cheer, format: formatScore };
})();
