// Mist Painter (after Chapter 1): rub the last of the Muddle Mist off the river valley with a finger.
// Surprises pop out as the color comes back. No math, no way to lose; about a minute of play.
(function () {
  const COLS = 24;
  const ROWS = 16;
  const GOAL = 0.7;

  window.MQMini.register({
    id: "mist",
    name: "Mist Painter",
    emoji: "🎨",
    desc: "Rub away the Muddle Mist and find hidden surprises.",
    chapter: "frog",
    start(stage, kit) {
      const t = kit.theme;
      const fx = kit.fx;
      const surprises = [
        { e: t.npcEmoji, x: 22, y: 70, size: 84, line: `${t.npc} waves hello!`, anim: "wave" },
        { e: t.hopper, x: 48, y: 80, size: 70, line: `${t.hopperName} does a happy hop!`, anim: "hop" },
        { e: "🌈", x: 68, y: 26, size: 120, line: "A rainbow!", anim: "grow" },
        { e: "🐟", x: 58, y: 60, size: 48, line: "Splash!", anim: "jump" },
        { e: "🦋", x: 30, y: 34, size: 46, line: "", anim: "flutter" },
        { e: "🌸", x: 84, y: 76, size: 52, line: "", anim: "grow" },
        { e: "🏮", x: 88, y: 42, size: 70, line: "The lantern glows!", anim: "glow" },
        { e: kit.hero, x: 10, y: 48, size: 64, line: "That's you!", anim: "hop" },
      ];

      stage.innerHTML = `
        <div class="mm-scene">
          <span class="mm-sun" aria-hidden="true"></span>
          <svg class="mm-land" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path class="mm-far" d="M0 52 C14 40 28 50 44 44 S72 34 86 42 S96 46 100 44 V100 H0 Z"/>
            <path class="mm-river" d="M-4 64 C20 56 36 72 56 63 S84 54 104 61" vector-effect="non-scaling-stroke"/>
            <path class="mm-mid" d="M0 70 C18 60 34 74 54 66 S82 60 100 68 V100 H0 Z"/>
            <path class="mm-near" d="M0 88 C22 80 46 94 70 86 S92 82 100 87 V100 H0 Z"/>
          </svg>
          ${surprises.map((s, i) => `<span class="mm-item" data-i="${i}" style="left:${s.x}%;top:${s.y}%;font-size:${s.size}px" aria-hidden="true">${s.e}</span>`).join("")}
        </div>
        <canvas class="mm-mist" aria-label="Mist covering the valley. Rub it away."></canvas>`;

      const canvas = stage.querySelector(".mm-mist");
      const ctx = canvas.getContext("2d");
      const items = [...stage.querySelectorAll(".mm-item")];
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const brush = Math.max(38, Math.min(72, w * 0.065));
      const cleared = new Uint8Array(COLS * ROWS);
      const revealed = new Set();
      let clearedCount = 0;
      let last = null;
      let painting = false;
      let finished = false;
      let lastSparkle = 0;
      let lastSwish = 0;

      // Soft, cloudy mist.
      ctx.scale(dpr, dpr);
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#cfd4db");
      base.addColorStop(1, "#a9b1bc");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 50 + Math.random() * 140;
        const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
        puff.addColorStop(0, "rgba(255,255,255,0.4)");
        puff.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = puff;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.45;
      ctx.font = `${Math.round(h * 0.14)}px serif`;
      for (let i = 0; i < 6; i++) ctx.fillText("☁️", (i * 0.19 + 0.02) * w, (0.25 + ((i * 0.37) % 0.6)) * h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";

      function markGrid(x, y, r) {
        const cw = w / COLS;
        const ch = h / ROWS;
        const c0 = Math.max(0, Math.floor((x - r) / cw));
        const c1 = Math.min(COLS - 1, Math.floor((x + r) / cw));
        const r0 = Math.max(0, Math.floor((y - r) / ch));
        const r1 = Math.min(ROWS - 1, Math.floor((y + r) / ch));
        for (let row = r0; row <= r1; row++) {
          for (let col = c0; col <= c1; col++) {
            const cx = (col + 0.5) * cw;
            const cy = (row + 0.5) * ch;
            const k = row * COLS + col;
            if (!cleared[k] && Math.hypot(cx - x, cy - y) <= r) {
              cleared[k] = 1;
              clearedCount += 1;
            }
          }
        }
      }

      function erase(x, y) {
        const soft = ctx.createRadialGradient(x, y, brush * 0.35, x, y, brush);
        soft.addColorStop(0, "rgba(0,0,0,1)");
        soft.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = soft;
        ctx.beginPath();
        ctx.arc(x, y, brush, 0, Math.PI * 2);
        ctx.fill();
        markGrid(x, y, brush * 0.8);
      }

      function reveal(i) {
        revealed.add(i);
        const s = surprises[i];
        const el = items[i];
        el.classList.add("revealed", `mm-${s.anim}`);
        fx.sfx.star(revealed.size % 4);
        const c = fx.center(el);
        fx.burst(c.x, c.y, { count: 12, chars: ["✨", s.e], spread: 90 });
        if (s.line) fx.floatText(c.x, c.y - s.size * 0.7, s.line, "gold");
      }

      let halfway = false;
      function check() {
        const cw = w / COLS;
        const ch = h / ROWS;
        surprises.forEach((s, i) => {
          if (revealed.has(i)) return;
          const col = Math.min(COLS - 1, Math.floor(((s.x / 100) * w) / cw));
          const row = Math.min(ROWS - 1, Math.floor(((s.y / 100) * h) / ch));
          if (cleared[row * COLS + col]) reveal(i);
        });
        const p = clearedCount / cleared.length;
        kit.progress(p / GOAL, `${Math.min(100, Math.round((p / GOAL) * 100))}% color`);
        if (!halfway && p >= GOAL / 2) {
          halfway = true;
          const c = fx.center(canvas);
          kit.cheer(c.x, c.y - 60, "Halfway there!", 2);
        }
        if (p >= GOAL && !finished) finish();
      }

      function finish() {
        finished = true;
        canvas.classList.add("melt");
        surprises.forEach((_, i) => !revealed.has(i) && reveal(i));
        fx.sfx.win();
        setTimeout(() => {
          if (!kit.alive()) return;
          kit.done({
            art: "🌈",
            title: "The valley is full of color!",
            text: `You wiped away the Muddle Mist. ${t.npc} and ${t.hopperName} are dancing by the river.`,
          });
        }, 1500);
      }

      function point(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }
      function paintTo(p, e) {
        const from = last || p;
        const dist = Math.hypot(p.x - from.x, p.y - from.y);
        const steps = Math.max(1, Math.ceil(dist / (brush * 0.35)));
        for (let k = 1; k <= steps; k++) erase(from.x + ((p.x - from.x) * k) / steps, from.y + ((p.y - from.y) * k) / steps);
        last = p;
        const now = performance.now();
        if (!kit.reduced && now - lastSparkle > 140) {
          lastSparkle = now;
          fx.burst(e.clientX, e.clientY, { count: 3, chars: ["✨"], colors: ["#ffe27a", "#fff"], spread: 30, size: 16, dur: 500 });
        }
        if (now - lastSwish > 180) {
          lastSwish = now;
          fx.sfx.stretch(8 + Math.floor(Math.random() * 6));
        }
        check();
      }

      const down = (e) => {
        if (finished) return;
        painting = true;
        last = null;
        canvas.setPointerCapture(e.pointerId);
        kit.hideHint();
        paintTo(point(e), e);
      };
      const move = (e) => painting && !finished && paintTo(point(e), e);
      const up = () => {
        painting = false;
        last = null;
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);

      kit.progress(0, "0% color");
      kit.hint("🖐️", "Rub the mist away with your finger to bring the colors back!");
      return () => {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
      };
    },
  });
})();
