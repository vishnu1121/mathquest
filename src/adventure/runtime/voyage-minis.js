import { createRng } from "../../engine/rng";
import { restoreVoyage, bowlLanding, bowlPoints } from "../voyage";

(function () {
  const S = window.MQS;
  const freshRng = () => createRng((Math.random() * 0xffffffff) >>> 0);
  const saveBest = (id, score) => {
    let best;
    S.update((s) => { const v = restoreVoyage(s.voyage); best = Math.max(v.records[id] || 0, score); v.records[id] = best; s.voyage = v; });
    return best;
  };
  const verdict = (you, pip) => you > pip ? "You win! Pip wants a rematch." : you === pip ? "A tie! Two champions, one celebration." : "Pip wins this round. Another adventure awaits!";


  window.MQMini.register({
    id: "bowls", name: "Bumper Bowls", emoji: "🎯", chapter: "robotworks", chapterNumber: 5,
    desc: "Aim a shiny gear. Read the breeze. Challenge Pip to five throws.",
    start(stage, kit) {
      const rng = freshRng(), life = new AbortController();
      let round = 0, you = 0, pip = 0, busy = false, target, wind;
      stage.innerHTML = `<div class="vm-game bowls-game"><div class="vm-intro"><p class="voyage-kicker">FRIENDLY RIVAL · PIP (COMPUTER)</p><h1>Bumper Bowls</h1><p>Five throws. Roll your gear close to the star. Everyone gets a turn.</p></div><div class="bowls-arena"><div class="bowls-target">★</div><div class="bowls-aim-line"></div><span class="bowls-disc">⚙</span><span class="bowls-thrower">${kit.hero}</span></div><p class="bowls-score" aria-live="polite"></p><p class="bowls-wind"></p><div class="bowls-controls"><label>Aim <input type="range" min="-45" max="45" value="0" aria-label="Aim"/><output class="bowls-angle">0</output></label><label>Power <input type="range" min="1" max="10" value="5" aria-label="Power"/><output class="bowls-power">5</output></label></div><button type="button" class="btn bowls-roll">Roll my gear →</button><p class="vm-note">Center: 100 · inner ring: 60 · outer ring: 30 · every throw: 10</p></div>`;
      const q = (s) => stage.querySelector(s);
      const show = () => { q(".bowls-score").textContent = `You ${you}  ·  Pip ${pip}`; kit.progress(round / 5, `Throw ${Math.min(5, round + 1)} of 5`); };
      function begin() {
        target = { x: rng.int(28, 72), y: rng.int(16, 40) }; wind = rng.int(-(kit.profile?.wind ?? 2), kit.profile?.wind ?? 2);
        q(".bowls-target").style.left = `${target.x}%`; q(".bowls-target").style.top = `${target.y}%`;
        q(".bowls-disc").style.left = "50%"; q(".bowls-disc").style.top = "92%";
        q(".bowls-wind").textContent = wind === 0 ? "🍃 Still air. Your gear rolls straight." : `🌬️ Breeze pushes ${Math.abs(wind) * 3} marks ${wind < 0 ? "left ←" : "right →"}. Aim a little against it.`;
        q(".bowls-roll").disabled = false; q(".bowls-roll").textContent = "Roll my gear →"; show();
      }
      stage.addEventListener("input", () => { q(".bowls-angle").textContent = q('[aria-label="Aim"]').value; q(".bowls-power").textContent = q('[aria-label="Power"]').value; q(".bowls-aim-line").style.rotate = `${Number(q('[aria-label="Aim"]').value)}deg`; }, { signal: life.signal });
      stage.addEventListener("click", async (e) => {
        if (!e.target.closest(".bowls-roll") || busy) return;
        busy = true; q(".bowls-roll").disabled = true;
        const landing = bowlLanding(Number(q('[aria-label="Aim"]').value), Number(q('[aria-label="Power"]').value), wind);
        const points = bowlPoints(landing, target), rival = rng.pick([30, 30, 60, 60, 100]);
        q(".bowls-disc").style.left = `${landing.x}%`; q(".bowls-disc").style.top = `${landing.y}%`; kit.fx.sfx.hop();
        await new Promise((r) => setTimeout(r, kit.reduced ? 150 : 700)); if (!kit.alive()) return;
        you += points; pip += rival; round++; show();
        q(".bowls-score").textContent = `Your throw +${points} · Pip’s throw +${rival}  |  You ${you} · Pip ${pip}`;
        if (round === 5) { const best = saveBest("bowls", you); kit.done({ art: "🎯", title: verdict(you, pip), text: `You scored ${you}, Pip scored ${pip}. Your best is ${best}. The robots do a tiny victory dance for every throw.` }); return; }
        // An explicit next-turn action keeps feedback on screen as long as the player wants.
        q(".bowls-roll").textContent = "Next throw →"; q(".bowls-roll").disabled = false;
        q(".bowls-roll").onclick = (event) => { event.stopPropagation(); q(".bowls-roll").onclick = null; busy = false; begin(); };
        q(".bowls-roll").focus();
      }, { signal: life.signal });
      begin(); return () => life.abort();
    },
  });

  window.MQMini.register({
    id: "starmatch", name: "Constellation Club", emoji: "🌌", chapter: "cloudbridge", chapterNumber: 6,
    desc: "Remember the stars. Find matching pairs. Take turns with Pip.",
    start(stage, kit) {
      const rng = freshRng(), life = new AbortController(), symbols = ["☀", "☾", "★", "♥", "✿", "◆", "♬", "☂"].slice(0,kit.profile?.pairs || 6);
      const cards = rng.shuffle([...symbols, ...symbols]);
      let open = [], matched = [], memory = new Set(), you = 0, pip = 0, busy = false, preview = true;
      stage.innerHTML = `<div class="vm-game match-game"><div class="vm-intro"><p class="voyage-kicker">THE SKY FESTIVAL · PIP (COMPUTER)</p><h1>Constellation Club</h1><p>Take a good look. Then find a pair on your turn. Pip only remembers stars you’ve both seen.</p></div><div class="match-score" role="status"></div><div class="match-grid"></div><button type="button" class="btn match-ready">I’m ready. Hide the stars!</button><button type="button" class="btn match-next" hidden>Pip’s turn →</button></div>`;
      const q = (s) => stage.querySelector(s);
      function draw(message) {
        q(".match-score").textContent = message || `You ${you} pairs · Pip ${pip} pairs · ${preview ? "Study the stars for as long as you like." : "Your turn: turn over two stars."}`;
        q(".match-grid").innerHTML = cards.map((symbol, i) => `<button type="button" data-star="${i}" class="${matched.includes(i) ? "matched" : ""}" aria-label="Star ${i + 1}${preview || open.includes(i) || matched.includes(i) ? `: ${symbol}` : ", face down"}" ${preview || busy || matched.includes(i) || open.includes(i) ? "disabled" : ""}>${preview || open.includes(i) || matched.includes(i) ? symbol : "✧"}</button>`).join("");
        kit.progress(matched.length / cards.length, `${matched.length / 2} of ${symbols.length} pairs found`);
      }
      function finish() {
        if (matched.length < cards.length) return false;
        saveBest("starmatch", you);
        kit.done({ art: "🌌", title: verdict(you, pip), text: `You found ${you} pairs; Pip found ${pip}. Together you lit all ${symbols.length} constellations. Nimbus saves the brightest star for your next visit.` }); return true;
      }
      stage.addEventListener("click", (e) => {
        if (e.target.closest(".match-ready")) { preview = false; q(".match-ready").hidden = true; draw(); q("[data-star]:not(:disabled)").focus(); return; }
        if (e.target.closest(".match-next")) {
          if (q(".match-next").dataset.turn === "you") { open = []; busy = false; q(".match-next").hidden = true; q(".match-next").dataset.turn = "pip"; draw(); q("[data-star]:not(:disabled)")?.focus(); return; }
          open = [];
          const available = cards.map((_,i)=>i).filter((i)=>!matched.includes(i));
          const known = available.filter((i)=>memory.has(i));
          const a = known.find((i)=>known.some((j)=>j!==i && cards[i]===cards[j]));
          const first = a ?? rng.pick(available);
          const second = known.find((i)=>i!==first && cards[i]===cards[first]) ?? rng.pick(available.filter((i)=>i!==first));
          open = [first, second]; open.forEach((i)=>memory.add(i));
          const pair = cards[first] === cards[second];
          if (pair) { pip++; matched.push(...open); }
          draw(`Pip turned over ${cards[first]} and ${cards[second]}. ${pair ? "A pair for Pip!" : "No pair this time."} You ${you} · Pip ${pip}`);
          if (finish()) return;
          q(".match-next").textContent = "My turn →"; q(".match-next").dataset.turn = "you"; return;
        }
        const b = e.target.closest("[data-star]"); if (!b || busy || preview || b.disabled) return;
        const index = Number(b.dataset.star); open.push(index); memory.add(index); kit.fx.sfx.tap();
        if (open.length < 2) { draw(); q("[data-star]:not(:disabled)")?.focus(); return; }
        busy = true;
        const pair = cards[open[0]] === cards[open[1]];
        if (pair) { you++; matched.push(...open); kit.fx.sfx.ten(); }
        draw(pair ? `A pair for you! You ${you} · Pip ${pip}` : "Different stars. Remember where they are for your next turn.");
        if (finish()) return;
        q(".match-next").hidden = false; q(".match-next").textContent = "Pip’s turn →"; q(".match-next").dataset.turn = "pip"; q(".match-next").focus();
      }, { signal: life.signal });
      draw(); return () => life.abort();
    },
  });
})();
