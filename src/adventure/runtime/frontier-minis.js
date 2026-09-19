import { createRng } from "../../engine/rng";
import { courierBoard, courierMove, courierReady, courierSolution, DIRECTIONS, popBoard, popGroup, popMove } from "../frontier";

(function () {
  const S = window.MQS, seed = () => (Math.random() * 0xffffffff) >>> 0;
  const best = (id, value) => { let result; S.update((s) => { s.playRecords ||= {}; const old = s.playRecords[id]; result = Math.max(Number.isFinite(old) && old >= 0 ? old : 0, value); s.playRecords[id] = result; }); return result; };
  window.MQMini.register({
    id: "courier", name: "Cloud Courier", emoji: "📦", chapter: "skyrail", chapterNumber: 4,
    desc: "Push parcels through a pocket maze. Plan your route. Undo any move.",
    start(stage, kit) {
      const life = new AbortController(), runSeed = seed();
      let round = 0, board = courierBoard(runSeed, 0), history = [], moves = 0, total = 0, ready = false;
      stage.innerHTML = `<div class="fm-game courier-game"><header><p class="voyage-kicker">THE SKYRAIL’S SECRET DELIVERY CLUB</p><h1>Cloud Courier</h1><p>Push each parcel onto a glowing doorstep. Walk around boxes to push from another side.</p></header><div class="courier-grid" tabindex="0" role="group" aria-label="Parcel maze. Use arrow keys or the direction buttons."></div><p class="fm-status" role="status"></p><div class="courier-pad">${DIRECTIONS.map((dir) => `<button type="button" class="fg-button" data-dir="${dir}" aria-label="Move ${dir}">${({ up: "↑", down: "↓", left: "←", right: "→" })[dir]}</button>`).join("")}</div><div class="fm-actions"><button type="button" class="fg-button" data-courier="undo">↶ Undo</button><button type="button" class="fg-button" data-courier="reset">Restart room</button><button type="button" class="fg-button" data-courier="hint">A little nudge</button><button type="button" class="btn" data-courier="next" hidden>Next delivery →</button></div><p class="fm-note">Three rooms · unlimited undos · no timer. You can push, but you can’t pull. An edge-trapped box? Undo and try another way.</p></div>`;
      const q = (selector) => stage.querySelector(selector);
      const say = (text) => { q(".fm-status").textContent = text; };
      function draw() {
        const delivered = board.boxes.filter((n) => board.goals.includes(n)).length;
        kit.progress((round + delivered / 2) / 3, `Delivery room ${round + 1} / 3`);
        q(".courier-grid").innerHTML = Array.from({ length: 36 }, (_, i) => `<span class="courier-cell ${board.walls.includes(i) ? "wall" : ""} ${board.goals.includes(i) ? "goal" : ""} ${board.boxes.includes(i) ? "box" : ""} ${board.player === i ? "player" : ""}" data-tile="${i}" aria-label="Row ${Math.floor(i / 6) + 1}, column ${i % 6 + 1}: ${board.walls.includes(i) ? "wall" : board.player === i ? "you" : board.boxes.includes(i) ? board.goals.includes(i) ? "delivered parcel" : "parcel" : board.goals.includes(i) ? "doorstep" : "path"}">${board.player === i ? kit.hero : board.boxes.includes(i) ? board.goals.includes(i) ? "🎁" : "📦" : board.goals.includes(i) ? "✦" : board.walls.includes(i) ? "" : "·"}</span>`).join("");
        q('[data-courier="undo"]').disabled = !history.length || ready;
        q('[data-courier="next"]').hidden = !ready;
        q('[data-courier="hint"]').disabled = ready;
        q('[data-courier="reset"]').disabled = ready;
        q(".courier-pad").querySelectorAll("button").forEach((b) => b.disabled = ready);
      }
      function move(dir) {
        if (ready || !kit.alive()) return;
        const next = courierMove(board, dir);
        if (!next) { say("That path is blocked. Try walking around the parcel."); kit.fx.sfx.plop(); return; }
        history.push(board); board = next; moves++; kit.fx.sfx.tap();
        ready = courierReady(board); draw();
        say(ready ? `✓ Both parcels delivered in ${moves} moves. Nimbus does a tiny happy swirl!` : `${board.boxes.filter((n) => board.goals.includes(n)).length} of 2 delivered · ${moves} moves. Stand behind a parcel to push it.`);
        if (ready) { kit.fx.sfx.good(); q('[data-courier="next"]').textContent = round === 2 ? "Celebrate deliveries →" : "Next delivery →"; q('[data-courier="next"]').focus(); }
      }
      stage.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.dir) { move(b.dataset.dir); return; }
        const action = b.dataset.courier;
        if (action === "undo" && history.length && !ready) { board = history.pop(); moves--; say("Move undone. Your route can change."); }
        if (action === "reset" && !ready) { board = courierBoard(runSeed, round); history = []; moves = 0; say("A fresh start for this room."); }
        if (action === "hint" && !ready) { const path = courierSolution(board); say(path?.length ? `Try moving ${path[0]}. Leave room to stand behind each parcel.` : "This box is stuck. Undo a push or restart this room; you keep your other deliveries."); }
        if (action === "next" && ready) {
          total += moves; round++;
          if (round === 3) { const score = Math.max(10, 300 - total * 3), record = best("courier", score); kit.done({ art: "📦", title: "Special delivery: a little joy!", text: `Six parcels delivered in ${total} moves across three rooms. Route score ${score}; your best ${record}. The bell rings for you!` }); return; }
          board = courierBoard(runSeed, round); history = []; moves = 0; ready = false; say("A new depot. Walk around the boxes before pushing."); q(".courier-grid").focus();
        }
        draw();
      }, { signal: life.signal });
      stage.addEventListener("keydown", (e) => { const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key]; if (dir) { e.preventDefault(); move(dir); } }, { signal: life.signal });
      draw(); say("Push the parcels onto the two glowing doorsteps."); q(".courier-grid").focus();
      return () => life.abort();
    },
  });
  window.MQMini.register({
    id: "prismpop", name: "Prism Pop", emoji: "💎", chapter: "garden", chapterNumber: 7,
    desc: "Pop connected gems. Let them tumble. Build a giant cluster for a bigger sparkle.",
    start(stage, kit) {
      const life = new AbortController(), rng = createRng(seed()); let board = popBoard(rng), score = 0, pops = 0, selected = -1;
      const targetScore = kit.profile?.popGoal || 180;
      const symbols = ["◆", "♥", "✿", "★"], names = ["diamond", "heart", "flower", "star"];
      stage.innerHTML = `<div class="fm-game pop-game"><header><p class="voyage-kicker">NIMBUS’S GARDEN CELEBRATION</p><h1>Prism Pop</h1><p>Tap a gem to preview its group. Pop at least two touching gems. Bigger groups make bigger sparkles!</p></header><p class="pop-score" aria-live="polite"></p><div class="pop-grid" role="group" aria-label="Prism gems, six rows of six"></div><p class="fm-status" role="status">Plan a tumble: gems fall down to fill the gaps.</p><button type="button" class="btn pop-launch" disabled>Choose a group</button><p class="fm-note">Reach ${targetScore} sparkles. No move limit. All four shapes stay easy to tell apart.</p></div>`;
      const q = (selector) => stage.querySelector(selector);
      function draw() {
        const focus = document.activeElement?.id, group = selected >= 0 ? popGroup(board, selected) : [];
        q(".pop-score").textContent = `${score} / ${targetScore} sparkles · ${pops} pops`;
        kit.progress(score / targetScore, `${Math.min(score, targetScore)} / ${targetScore} sparkles`);
        q(".pop-grid").innerHTML = board.map((n, i) => `<button type="button" id="pop-${i}" data-gem="${i}" data-shape="${n}" aria-label="${names[n]}, row ${Math.floor(i / 6) + 1}, column ${i % 6 + 1}" aria-pressed="${group.includes(i)}">${symbols[n]}</button>`).join("");
        q(".pop-launch").disabled = group.length < 2; q(".pop-launch").textContent = group.length >= 2 ? `Pop ${group.length} gems · +${group.length * (group.length - 1)} ✦` : "Choose a touching group";
        if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
      }
      stage.addEventListener("click", (e) => {
        const gem = e.target.closest("[data-gem]");
        if (gem) { selected = Number(gem.dataset.gem); draw(); if (popGroup(board, selected).length < 2) q(".fm-status").textContent = "This gem needs a matching neighbor along an edge. Try another group."; return; }
        if (!e.target.closest(".pop-launch")) return;
        const result = popMove(board, selected, rng); if (!result) return;
        board = result.board; score += result.points; pops++; selected = -1; kit.fx.sfx.good(); draw();
        q(".fm-status").textContent = `${result.count} gems popped! +${result.points} sparkles.${result.reshuffled ? " A new rainbow arrived with fresh groups." : " Gems tumbled down. What can you connect now?"}`;
        if (score >= targetScore) { best("prismpop", score); kit.done({ art: "💎", title: "You made the garden glow!", text: `${score} sparkles in ${pops} pops. Nimbus turns your gems into a little rainbow over the new garden.` }); }
        else q("[data-gem]").focus({ preventScroll: true });
      }, { signal: life.signal });
      draw(); return () => life.abort();
    },
  });
  window.MQMini.register({
    id: "orchestra", name: "Glow Orchestra", emoji: "🎵", chapter: "water", chapterNumber: 8,
    desc: "Compose a tune with the tidepool crew. Mix four sounds into your own looping light show.",
    start(stage, kit) {
      const life = new AbortController(); const stored = S.get().orchestra;
      const beats = kit.profile?.songBeats || 8, rows = kit.profile?.instruments || 4;
      let notes = Array.isArray(stored) && stored.length === 32 && stored.every((v) => typeof v === "boolean") ? [...stored] : Array(32).fill(false), playing = false, beat = 0, timer;
      const instruments = ["🐢 Turtle taps", "🐚 Shell chimes", "🦀 Crab clicks", "☁ Cloud drops"];
      stage.innerHTML = `<div class="fm-game orchestra-game"><header><p class="voyage-kicker">THE TIDEPOOL CREW · YOUR MUSIC</p><h1>Glow Orchestra</h1><p>Turn on a few beats. Each row is a friend’s instrument. Press Play to hear the song you made!</p></header><div class="orchestra-lights" aria-hidden="true">🐢 🐚 🦀 ☁</div><div class="orchestra-scroll"><div class="orchestra-grid"></div></div><p class="fm-status" role="status"></p><div class="fm-actions"><button type="button" class="btn" data-music="play">▶ Play my tune</button><button type="button" class="fg-button" data-music="sound" aria-pressed="false">Sound off</button><button type="button" class="fg-button" data-music="clear">Clear</button><button type="button" class="btn" data-music="save">Save our song →</button></div><p class="fm-note">Your song stays on this device. No recording. Use the sound button to hear it, or follow the glowing beat.</p></div>`;
      const q = (selector) => stage.querySelector(selector);
      function draw() {
        const focus = document.activeElement?.id;
        q(".orchestra-grid").innerHTML = instruments.slice(0, rows).map((name, row) => `<div class="orchestra-row"><b>${name}</b><div>${Array.from({ length: beats }, (_, col) => `<button type="button" id="note-${row * 8 + col}" data-note="${row * 8 + col}" aria-label="${name}, beat ${col + 1}" aria-pressed="${notes[row * 8 + col]}" class="${playing && col === beat ? "current" : ""}">${notes[row * 8 + col] ? "●" : "·"}</button>`).join("")}</div></div>`).join("");
        const sound = window.MQ.sound.enabled(); q('[data-music="sound"]').textContent = sound ? "🔊 Sound on" : "🔇 Sound off"; q('[data-music="sound"]').setAttribute("aria-pressed", String(sound));
        const count = notes.filter(Boolean).length;
        kit.progress(Math.min(1, count / 8), `${count} notes in your song`); q('[data-music="save"]').disabled = !count;
        if (focus) document.getElementById(focus)?.focus({ preventScroll: true });
      }
      const stop = () => { playing = false; clearTimeout(timer); q('[data-music="play"]').textContent = "▶ Play my tune"; q(".orchestra-lights").removeAttribute("data-beat"); };
      function tick() {
        if (!playing || !kit.alive()) return;
        for (let row = 0; row < rows; row++) if (notes[row * 8 + beat]) [() => kit.fx.sfx.hop(0), () => kit.fx.sfx.ten(), () => kit.fx.sfx.tap(), () => kit.fx.sfx.pop()][row]();
        q(".orchestra-lights").dataset.beat = String(beat % 4); draw(); beat = (beat + 1) % beats; timer = setTimeout(tick, 480);
      }
      stage.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.note !== undefined) { const i = Number(b.dataset.note); notes[i] = !notes[i]; S.update((s) => { s.orchestra = [...notes]; }); draw(); return; }
        if (b.dataset.music === "play") { if (playing) { stop(); draw(); } else { playing = true; beat = 0; q('[data-music="play"]').textContent = "■ Pause tune"; q(".fm-status").textContent = "Your friends are following your beat."; tick(); } }
        if (b.dataset.music === "sound") { window.MQ.sound.set(!window.MQ.sound.enabled()); draw(); }
        if (b.dataset.music === "clear") { stop(); notes.fill(false); S.update((s) => { s.orchestra = [...notes]; }); draw(); }
        if (b.dataset.music === "save" && notes.some(Boolean)) { stop(); S.update((s) => { s.orchestra = [...notes]; }); kit.done({ art: "🎵", title: "A song only you could make.", text: "The tidepool crew learned your tune. Nimbus hums it all the way home. Come back to remix it whenever you like!" }); }
      }, { signal: life.signal });
      document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); draw(); } }, { signal: life.signal });
      draw(); return () => { clearTimeout(timer); life.abort(); };
    },
  });
})();
