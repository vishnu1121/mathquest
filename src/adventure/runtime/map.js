// The world map: chapters unlock in order, each finished chapter restores color and a landmark,
// the hero (with hat and pet) walks the path, a secret waits to be tapped, and the world maker sits on top.
(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.MQS;
  const AI = window.MQAI;

  const WIDE = [[24, 70], [49, 49], [79, 29]];
  const TALL = [[26, 82], [73, 60], [26, 38]];
  const DECO_WIDE = [[5, 22, "🌲"], [21, 88, "🌳"], [41, 17, "🌳"], [79, 14, "🌲"], [96, 86, "🌳"], [44, 44, "🌼"]];
  const DECO_TALL = [[8, 70, "🌲"], [90, 88, "🌳"], [92, 45, "🌲"], [8, 30, "🌳"], [55, 57, "🌼"]];
  const SECRET_WIDE = [78, 83];
  const SECRET_TALL = [84, 82];
  const DECO_SWAP = {
    volcano: { "🌲": "🪨", "🌳": "🌋", "🌼": "🔥", "🍄": "🦴" },
    space: { "🌲": "🪐", "🌳": "🌙", "🌼": "⭐", "🍄": "🛸" },
    ocean: { "🌲": "🪸", "🌳": "🐚", "🌼": "🐠", "🍄": "🦀" },
    candy: { "🌲": "🍭", "🌳": "🧁", "🌼": "🍬", "🍄": "🍩" },
  };
  const LANDMARKS = { frog: ["🌉", 9, -17], fireflies: ["🏮", -12, -16], guardian: ["⛩️", 9, -17] };
  const LOCKED = [];
  const SURPRISES = ["a pizza planet with jelly aliens", "a jungle of giant cupcakes", "an underwater unicorn school", "a robot dance party on the moon", "a snowy mountain of hot cocoa", "a dragon bakery in the clouds"];

  let secretTaps = 0;
  let wasTall = null;

  function smoothPath(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function render(restoredId) {
    const board = $("mapBoard");
    const { fx, isOpen, titleOf, iconOf } = window.MQ;
    const levels = window.MQ.levels.filter((level) => !level.pathway);
    const s = S.get();
    const t = AI.theme();
    const tall = board.clientWidth > 0 && board.clientWidth < 600;
    wasTall = tall;
    const pts = tall ? TALL : WIDE;
    const done = levels.filter((l) => s.chapters[l.id]).length;
    const swap = DECO_SWAP[t.palette] || {};
    board.dataset.restored = String(done);

    const donePts = pts.slice(0, Math.min(done + 1, levels.length));
    board.innerHTML = `
      <div class="map-world">
        <svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="trail" d="${smoothPath(pts)}" vector-effect="non-scaling-stroke"/>
          ${donePts.length > 1 ? `<path class="trail-done" d="${smoothPath(donePts)}" vector-effect="non-scaling-stroke"/>` : ""}
          <path class="trail-dots" d="${smoothPath(pts)}" vector-effect="non-scaling-stroke"/>
        </svg>
        ${(tall ? DECO_TALL : DECO_WIDE).map(([x, y, e]) => `<span class="map-deco" style="left:${x}%;top:${y}%;font-size:${tall ? 30 : 38}px">${swap[e] || e}</span>`).join("")}
      </div>
      <div class="map-mist" aria-hidden="true">
        ${Array.from({ length: 3 - done }, (_, i) => `<span style="left:${[62, 38, 80][i]}%;top:${[44, 20, 70][i]}%;animation-delay:${i * -3}s">☁️</span>`).join("")}
      </div>`;

    levels.forEach((level, i) => {
      const [lm, dx, dy] = LANDMARKS[level.id] || ["✨", 8, -16];
      const [x, y] = pts[i];
      const mark = document.createElement("span");
      mark.className = s.chapters[level.id] ? "landmark fixed" : "landmark";
      mark.style.left = `${x + (tall ? dx * 1.8 : dx)}%`;
      mark.style.top = `${y + (tall ? dy * 0.5 : dy)}%`;
      mark.textContent = lm;
      mark.setAttribute("aria-hidden", "true");
      board.appendChild(mark);
    });

    const nextIndex = levels.findIndex((l, i) => isOpen(i) && !s.chapters[l.id]);
    const heroAt = nextIndex === -1 ? levels.length - 1 : nextIndex;
    [...levels, ...LOCKED].forEach((node, i) => {
      const [x, y] = pts[i];
      const soon = i >= levels.length;
      const locked = !soon && !isOpen(i);
      const stars = s.stars[node.id] || 0;
      const name = soon ? node.name : titleOf(node);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "node";
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      if (soon || locked) btn.dataset.locked = "";
      if (locked) btn.setAttribute("aria-disabled", "true");
      if (s.chapters[node.id]) btn.dataset.complete = "";
      if (node.boss) btn.dataset.boss = "";
      if (i === heroAt && !soon && !locked && !s.chapters[node.id]) btn.dataset.next = "";
      btn.setAttribute("aria-label", soon ? `${name}, coming soon` : locked ? `Chapter ${i + 1}: ${name}, locked` : `Chapter ${i + 1}: ${name}${stars ? `, ${stars} of 3 stars` : ""}`);
      const starRow = !soon && stars ? [0, 1, 2].map((k) => `<span class="${k < stars ? "" : "dim"}">⭐</span>`).join("") : "";
      btn.innerHTML = `<span class="node-disc" aria-hidden="true">${iconOf(node)}<span class="node-state">${s.chapters[node.id] ? "✓" : locked ? "🔒" : "▶"}</span></span>
        <span class="node-label" aria-hidden="true">${soon ? name : `<small>Chapter ${i + 1}</small>${name}`}</span>
        <span class="node-stars" aria-hidden="true">${starRow}</span>`;
      btn.addEventListener("click", () => {
        if (soon || locked) {
          fx.sfx.wrong();
          fx.shake(btn.querySelector(".node-disc"), 6);
          const c = fx.center(btn);
          fx.floatText(c.x, c.y - 40, soon ? "Coming soon!" : `Finish Chapter ${i} first!`);
          return;
        }
        window.MQ.openLevel(node);
      });
      board.appendChild(btn);
    });

    const [sx, sy] = tall ? SECRET_TALL : SECRET_WIDE;
    const secret = document.createElement("button");
    secret.type = "button";
    secret.className = s.secret ? "map-secret found" : "map-secret";
    secret.style.left = `${sx}%`;
    secret.style.top = `${sy}%`;
    secret.textContent = s.secret ? "🧰" : swap["🍄"] || "🍄";
    secret.setAttribute("aria-label", s.secret ? "Opened treasure chest" : "A wiggly thing");
    secret.addEventListener("click", () => {
      if (S.get().secret) {
        fx.floatText(fx.center(secret).x, fx.center(secret).y - 30, "Already opened!");
        return;
      }
      secretTaps += 1;
      fx.sfx.pop();
      fx.shake(secret, 8);
      const c = fx.center(secret);
      if (secretTaps < 3) {
        fx.floatText(c.x, c.y - 30, secretTaps === 1 ? "?" : "?!");
        return;
      }
      secretTaps = 0;
      fx.burst(c.x, c.y, { count: 16, chars: ["🗝️", "✨"], spread: 100 });
      window.MQShop.openSecret();
    });
    board.appendChild(secret);

    const hero = document.createElement("span");
    hero.className = "hero-token";
    hero.innerHTML = `${S.hero()}${s.hat ? `<span class="ht-hat" data-slot="${window.MQShop.slotFor(s.hat)}">${s.hat}</span>` : ""}${s.pet ? `<span class="ht-pet">${s.pet}</span>` : ""}`;
    const fromIndex = restoredId ? Math.max(0, levels.findIndex((l) => l.id === restoredId)) : heroAt;
    hero.style.left = `${pts[fromIndex][0]}%`;
    hero.style.top = `${pts[fromIndex][1]}%`;
    board.appendChild(hero);

    if (restoredId) {
      const i = levels.findIndex((l) => l.id === restoredId);
      const mark = board.querySelectorAll(".node-disc")[i];
      requestAnimationFrame(() =>
        setTimeout(() => {
          if (mark) {
            mark.classList.add("restoring");
            const c = fx.center(mark);
            fx.burst(c.x, c.y, { count: 26, chars: ["✨", "🌈", t.glow], spread: 180 });
            fx.floatText(c.x, c.y - 50, "Color restored!", "gold");
            fx.sfx.win();
          }
          setTimeout(() => {
            hero.style.left = `${pts[heroAt][0]}%`;
            hero.style.top = `${pts[heroAt][1]}%`;
            fx.sfx.hop(4);
          }, 900);
        }, 350),
      );
    }
  }

  function showWorld() {
    const t = AI.theme();
    $("app").dataset.palette = t.palette;
    $("worldTitle").textContent = t.world;
    $("worldIntro").textContent = t.intro;
    if (!$("mapScreen").hidden) $("hudTitle").textContent = t.world;
    render();
  }

  function init() {
    AI.onTheme((t) => {
      S.update((s) => (s.theme = t));
      showWorld();
    });
    showWorld();
    window.addEventListener("resize", () => {
      const tall = $("mapBoard").clientWidth < 600;
      if (tall !== wasTall && !$("mapScreen").hidden) render();
    });
  }

  window.MQMap = { init, render };
})();
