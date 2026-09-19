// Guardian's Dance Party (after Chapter 3): the newly awake Guardian plays a drum beat and you copy it.
// Each drum has its own animal, shape and sound (never color alone). A slip just replays the beat.
// Three rounds of growing length, then a free-dance finale. No math, no way to lose.
(function () {
  // Each class gets an appropriate memory span.

  window.MQMini.register({
    id: "dance",
    name: "Guardian's Dance Party",
    emoji: "🥁",
    desc: "Copy the Guardian's drum beat and start a dance party.",
    chapter: "guardian",
    start(stage, kit) {
      const ROUNDS = kit.profile?.beats || [3,4,5];
      const fx = kit.fx;
      const t = kit.theme;
      const pads = [
        { emoji: t.hopper, shape: "●", name: `${t.hopperName} drum`, cls: "p0" },
        { emoji: "🦉", shape: "■", name: "Hoot drum", cls: "p1" },
        { emoji: "🧚", shape: "▲", name: "Pip drum", cls: "p2" },
        { emoji: t.npcEmoji, shape: "★", name: `${t.npc} drum`, cls: "p3" },
      ];
      stage.innerHTML = `
        <div class="md-floor" aria-hidden="true"></div>
        <div class="md-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="md-top">
          <span class="md-guardian" aria-hidden="true">${t.guardian}</span>
          <p class="md-say" aria-live="polite"></p>
        </div>
        <div class="md-crowd" aria-hidden="true"></div>
        <div class="md-pads" role="group" aria-label="Drums">
          ${pads.map((p, i) => `<button type="button" class="md-pad ${p.cls}" data-i="${i}" aria-label="${p.name}"><span class="md-emoji" aria-hidden="true">${p.emoji}</span><span class="md-shape" aria-hidden="true">${p.shape}</span><kbd aria-hidden="true">${i + 1}</kbd></button>`).join("")}
        </div>`;
      const say = stage.querySelector(".md-say");
      const guardian = stage.querySelector(".md-guardian");
      const crowd = stage.querySelector(".md-crowd");
      const padEls = [...stage.querySelectorAll(".md-pad")];

      let round = 0;
      let pattern = [];
      let input = [];
      let listening = false;
      let freeDance = false;
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(() => kit.alive() && fn(), ms));

      function hit(i, byGuardian) {
        const pad = padEls[i];
        pad.classList.remove("hit");
        void pad.offsetWidth;
        pad.classList.add("hit");
        fx.sfx.star(i);
        if (byGuardian) {
          guardian.classList.remove(`move${i}`);
          void guardian.offsetWidth;
          guardian.className = `md-guardian move${i}`;
        } else {
          const c = fx.center(pad);
          fx.burst(c.x, c.y, { count: 6, chars: [pads[i].shape, "✨"], spread: 60, size: 20 });
        }
      }

      function playPattern() {
        listening = false;
        input = [];
        padEls.forEach((p) => (p.disabled = true));
        say.textContent = `Watch and listen! Beat ${round + 1} of ${ROUNDS.length}`;
        const gap = kit.reduced ? 750 : 620;
        pattern.forEach((i, k) => later(() => hit(i, true), 700 + k * gap));
        later(() => {
          listening = true;
          padEls.forEach((p) => (p.disabled = false));
          say.textContent = "Your turn! Play the same beat.";
          padEls[0].focus();
        }, 700 + pattern.length * gap + 200);
      }

      function joinCrowd() {
        const dancers = [kit.hero, t.hopper, t.npcEmoji, "🧚"];
        const who = dancers[Math.min(round, dancers.length - 1)];
        const el = document.createElement("span");
        el.textContent = who;
        el.style.animationDelay = `${crowd.children.length * -0.2}s`;
        crowd.appendChild(el);
      }

      function nextRound() {
        if (round >= ROUNDS.length) return finale();
        pattern = Array.from({ length: ROUNDS[round] }, () => Math.floor(Math.random() * pads.length));
        playPattern();
      }

      let slipped = false;
      function tap(i) {
        if (freeDance) {
          hit(i, false);
          guardian.className = `md-guardian move${i}`;
          const d = crowd.children[Math.floor(Math.random() * crowd.children.length)];
          if (d) {
            d.classList.remove("spin");
            void d.offsetWidth;
            d.classList.add("spin");
          }
          return;
        }
        if (!listening) return;
        hit(i, false);
        const k = input.length;
        input.push(i);
        if (pattern[k] !== i) {
          listening = false;
          slipped = true;
          fx.sfx.wrong();
          say.textContent = "Oops! Let's hear that beat again.";
          later(playPattern, 900);
          return;
        }
        if (input.length === pattern.length) {
          listening = false;
          round += 1;
          kit.progress(round / ROUNDS.length, `${round} of ${ROUNDS.length} beats`);
          fx.sfx.good();
          say.textContent = ["Great beat!", "You've got rhythm!", "Amazing!"][Math.min(round - 1, 2)];
          const c = fx.center(guardian);
          fx.burst(c.x, c.y, { count: 18, chars: ["🎵", "🎶", "✨"], spread: 160 });
          // A beat copied without a slip is a perfect beat.
          kit.cheer(c.x, c.y + 30, slipped ? "Got the beat!" : "Perfect beat!", slipped ? 1 : Math.min(3, round + 1));
          slipped = false;
          joinCrowd();
          later(nextRound, 1300);
        }
      }

      function finale() {
        freeDance = true;
        padEls.forEach((p) => (p.disabled = false));
        stage.classList.add("party");
        say.textContent = "Free dance! Tap any drum and everyone dances!";
        fx.sfx.win();
        const c = fx.center(guardian);
        kit.cheer(c.x, c.y + 30, "Dance party!", 3);
        later(() => {
          stage.classList.remove("party");
          kit.done({
            art: "🥁",
            title: "Best party ever!",
            text: `The ${t.guardianName} is wide awake and dancing with everyone. You kept the beat!`,
          });
        }, 7000);
      }

      padEls.forEach((p, i) => p.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        tap(i);
      }));
      padEls.forEach((p, i) => p.addEventListener("click", (e) => e.detail === 0 && tap(i)));
      const onKey = (e) => {
        const i = ["1", "2", "3", "4"].indexOf(e.key);
        if (i !== -1) tap(i);
      };
      window.addEventListener("keydown", onKey);

      kit.progress(0, `0 of ${ROUNDS.length} beats`);
      kit.hint("🥁", "Watch the drums light up, then tap the same ones in order.");
      later(() => {
        kit.hideHint();
        nextRound();
      }, 2200);
      return () => {
        timers.forEach(clearTimeout);
        window.removeEventListener("keydown", onKey);
      };
    },
  });
})();
