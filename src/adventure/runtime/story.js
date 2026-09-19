// The story: a storybook cutscene player, the prologue, chapter intros and outros, one choice that a
// friend remembers, the ending and a journey note for grown-ups. The story director (AI) can rewrite
// narration around what the child actually did; built-in text is always ready if it is slow or off.
(function () {
  const S = window.MQS;
  const AI = window.MQAI;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let fx = null;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ---------- Scenes: layered emoji with CSS motion (story.css) ----------
  const item = (emoji, x, y, size, cls = "", delay = 0) =>
    `<span class="sc-item ${cls}" style="left:${x}%;top:${y}%;font-size:${size}px;animation-delay:${delay}ms" aria-hidden="true">${emoji}</span>`;
  function hero() {
    const s = S.get();
    return `<span class="sc-hero" aria-hidden="true">${S.hero()}${s.hat ? `<span class="sc-hat" data-slot="${window.MQShop.slotFor(s.hat)}">${s.hat}</span>` : ""}${s.pet ? `<span class="sc-pet">${s.pet}</span>` : ""}</span>`;
  }
  function scene(kind, t) {
    const g = t.glow;
    const scenes = {
      bright: `${item("☀️", 82, 16, 64, "sc-spin")}${item("🌳", 10, 62, 90, "sc-sway")}${item("🌳", 88, 64, 80, "sc-sway", 400)}${item("🏮", 50, 46, 110, "sc-glow")}${item(g, 30, 30, 34, "sc-float")}${item(g, 68, 26, 30, "sc-float", 600)}${item(t.hopper, 36, 76, 54, "sc-bounce")}`,
      mist: `${item("🌳", 10, 62, 90, "sc-gray")}${item("🌳", 88, 64, 80, "sc-gray")}${item("🏮", 50, 46, 110, "sc-dim")}${item("☁️", 10, 30, 90, "sc-drift")}${item("☁️", 40, 58, 110, "sc-drift", 900)}${item("☁️", 70, 24, 80, "sc-drift", 1800)}${item("❓", 30, 40, 30, "sc-float")}${item("❓", 72, 50, 26, "sc-float", 500)}`,
      heroes: `${item("🦉", 22, 52, 84, "sc-flap")}<span class="sc-item sc-bounce" style="left:50%;top:56%;font-size:96px">${hero()}</span>${item("🧚", 78, 46, 70, "sc-float")}${item("✨", 64, 30, 30, "sc-twinkle")}${item("✨", 36, 26, 26, "sc-twinkle", 700)}`,
      river: `<span class="sc-water"></span>${["", "", "", "", ""].map((_, i) => item("🟢", 14 + i * 18, 64, 44, "sc-pad", i * 120)).join("")}${item(t.hopper, 14, 50, 58, "sc-hopline")}${item(g, 86, 36, 40, "sc-float")}`,
      riverFixed: `<span class="sc-water bright"></span>${["", "", "", "", ""].map((_, i) => item("🟢", 14 + i * 18, 64, 44, "sc-pad", i * 120)).join("")}${item(t.hopper, 50, 46, 70, "sc-bounce")}${item(g, 58, 32, 44, "sc-glow")}${item("🌈", 50, 16, 90, "sc-rise")}`,
      npc: `${item(t.npcEmoji, 34, 56, 100, "sc-wobble")}${item("💧", 42, 40, 26, "sc-drip")}${item(g, 68, 48, 60, "sc-glow")}${item("🌳", 90, 66, 70, "sc-sway")}`,
      gladeDark: `${item("🌙", 80, 16, 56, "sc-float")}${item("🏮", 50, 50, 110, "sc-dim")}${item(g, 24, 34, 34, "sc-twinkle")}${item(g, 72, 60, 30, "sc-twinkle", 500)}${item(g, 40, 70, 28, "sc-twinkle", 900)}${item("🌲", 8, 64, 80, "sc-gray")}${item("🌲", 92, 66, 76, "sc-gray")}`,
      gladeLit: `${item("🌙", 80, 16, 56, "sc-float")}${item("🏮", 50, 46, 120, "sc-glow")}${item(g, 30, 36, 34, "sc-orbit")}${item(g, 66, 36, 34, "sc-orbit", 700)}${item("🌸", 18, 80, 44, "sc-rise")}${item("🌼", 36, 84, 40, "sc-rise", 250)}${item("🌷", 64, 84, 40, "sc-rise", 500)}${item("🌸", 82, 80, 44, "sc-rise", 750)}`,
      muddled: `${item(t.guardian, 50, 52, 130, "sc-wobble")}${item("💫", 50, 22, 44, "sc-spin")}${item("☁️", 22, 40, 80, "sc-drift")}${item("☁️", 74, 60, 80, "sc-drift", 1200)}${item("🛡️", 30, 70, 40, "sc-float")}${item("🛡️", 70, 72, 40, "sc-float", 400)}`,
      wakes: `<span class="sc-rays"></span>${item(t.guardian, 50, 50, 130, "sc-bounce")}${item("😊", 62, 34, 40, "sc-rise")}${item("✨", 26, 30, 34, "sc-twinkle")}${item("✨", 76, 26, 30, "sc-twinkle", 500)}${item("☁️", 10, 30, 70, "sc-leave")}${item("☁️", 88, 64, 70, "sc-leave", 300)}`,
      finale: `<span class="sc-rays"></span>${item("🏮", 50, 34, 120, "sc-glow")}${item("🦉", 18, 72, 60, "sc-bounce")}<span class="sc-item sc-bounce" style="left:36%;top:74%;font-size:64px;animation-delay:150ms">${hero()}</span>${item(t.hopper, 54, 76, 56, "sc-bounce", 300)}${item("🧚", 70, 66, 50, "sc-float")}${item(t.npcEmoji, 86, 74, 56, "sc-bounce", 450)}${item("🎉", 20, 20, 44, "sc-twinkle")}${item("🎉", 80, 18, 44, "sc-twinkle", 400)}`,
      note: `${item("🦉", 26, 52, 90, "sc-flap")}${item("📜", 60, 50, 100, "sc-float")}${item("✨", 76, 26, 30, "sc-twinkle")}`,
    };
    return `<div class="sc sc-${kind}" data-palette="${t.palette}">${scenes[kind] || ""}</div>`;
  }

  // ---------- Narration with an optional AI rewrite ----------
  const numbersFrom = (lines) => [...new Set(lines.flatMap((l) => (l.match(/\d+/g) || []).map(Number)))];
  function narration(fallback, moment, chapter) {
    if (AI.status() !== "on") return { text: Promise.resolve({ text: fallback, byAI: false }) };
    const s = S.get();
    const did = chapter ? s.facts[chapter] || [] : [];
    const choice = s.choice === "gave" ? `gave their ${AI.theme().glowOne} to ${AI.theme().npc}` : s.choice === "kept" ? "kept the treasure for the Great Lantern" : "";
    const ai = AI.narrate({ moment, theme: AI.theme(), did, choice, numbers: numbersFrom(did) }).then((story) => (story ? { text: story, byAI: true } : null));
    const timeout = sleep(4500).then(() => null);
    return { text: Promise.race([ai, timeout]).then((r) => r || { text: fallback, byAI: false }) };
  }

  // ---------- Player ----------
  function play(panels, { title = "", finalLabel = "Continue" } = {}) {
    return new Promise((resolve) => {
      const t = AI.theme();
      const box = document.createElement("div");
      box.className = "story";
      box.innerHTML = `
        <div class="story-card" role="dialog" aria-modal="true" aria-label="${title || "Story"}">
          ${title ? `<p class="story-title">${title}</p>` : ""}
          <div class="story-stage" id="storyStage"></div>
          <div class="story-body">
            <p class="story-byai" id="storyByAI" hidden>✨ Story written for you</p>
            <p class="story-text" id="storyText" aria-live="polite"></p>
            <div class="story-choices" id="storyChoices" hidden></div>
          </div>
          <div class="story-foot">
            <span class="story-dots" aria-hidden="true">${panels.map(() => "<i></i>").join("")}</span>
            <button type="button" class="story-skip" id="storySkip">Skip story</button>
            <button type="button" class="btn" id="storyNext">Next</button>
          </div>
        </div>`;
      document.body.appendChild(box);
      const stage = box.querySelector("#storyStage");
      const textEl = box.querySelector("#storyText");
      const byAI = box.querySelector("#storyByAI");
      const choicesEl = box.querySelector("#storyChoices");
      const nextBtn = box.querySelector("#storyNext");
      const dots = [...box.querySelectorAll(".story-dots i")];
      let index = -1;
      let typing = null;
      let finishTyping = null;

      async function show(i) {
        index = i;
        const panel = panels[i];
        dots.forEach((d, k) => d.classList.toggle("on", k <= i));
        stage.innerHTML = scene(panel.scene, t);
        stage.firstElementChild.classList.add("enter");
        byAI.hidden = true;
        choicesEl.hidden = true;
        choicesEl.replaceChildren();
        nextBtn.hidden = false;
        nextBtn.disabled = true;
        nextBtn.textContent = i === panels.length - 1 ? finalLabel : "Next";
        textEl.textContent = "…";
        textEl.classList.add("waiting");
        if (fx) fx.sfx.tap();
        const resolved = typeof panel.text === "string" ? { text: panel.text, byAI: false } : await panel.text;
        if (index !== i) return;
        textEl.classList.remove("waiting");
        byAI.hidden = !resolved.byAI;
        await typeOut(resolved.text);
        if (index !== i) return;
        if (panel.choices) {
          nextBtn.hidden = true;
          showChoices(panel);
        } else {
          nextBtn.disabled = false;
          nextBtn.focus();
        }
      }

      function typeOut(text) {
        return new Promise((done) => {
          if (reduced) {
            textEl.textContent = text;
            done();
            return;
          }
          let k = 0;
          textEl.textContent = "";
          finishTyping = () => {
            clearInterval(typing);
            textEl.textContent = text;
            finishTyping = null;
            done();
          };
          typing = setInterval(() => {
            k += 2;
            textEl.textContent = text.slice(0, k);
            if (k >= text.length) finishTyping && finishTyping();
          }, 28);
        });
      }

      function showChoices(panel) {
        choicesEl.hidden = false;
        for (const option of panel.choices) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "btn secondary story-choice";
          b.innerHTML = `<span aria-hidden="true">${option.emoji}</span> ${option.label}`;
          b.addEventListener("click", async () => {
            choicesEl.querySelectorAll("button").forEach((x) => (x.disabled = true));
            if (fx) {
              fx.sfx.good();
              const c = fx.center(b);
              fx.burst(c.x, c.y, { count: 14, chars: [option.emoji, "✨"], spread: 110 });
            }
            panel.onChoose(option.id);
            choicesEl.hidden = true;
            byAI.hidden = true;
            await typeOut(option.reply);
            nextBtn.hidden = false;
            nextBtn.disabled = false;
            nextBtn.focus();
          });
          choicesEl.appendChild(b);
        }
        choicesEl.querySelector("button").focus();
      }

      function close() {
        if (typing) clearInterval(typing);
        box.classList.add("leaving");
        setTimeout(() => box.remove(), 300);
        resolve();
      }

      box.querySelector(".story-card").addEventListener("click", (e) => {
        if (finishTyping && !e.target.closest("button")) finishTyping();
      });
      nextBtn.addEventListener("click", () => (index < panels.length - 1 ? show(index + 1) : close()));
      box.querySelector("#storySkip").addEventListener("click", () => {
        const pending = panels.find((p) => p.choices && !p.chosen);
        if (pending) pending.onChoose(pending.choices[0].id);
        close();
      });
      show(0);
    });
  }

  // ---------- Chapters ----------
  const CHAPTERS = {
    frog: { n: 1, name: "The Scattered River" },
    fireflies: { n: 2, name: "The Dark Glade" },
    guardian: { n: 3, name: "The Muddled Guardian" },
  };
  const chapterTitle = (id) => `Chapter ${CHAPTERS[id].n}: ${CHAPTERS[id].name}`;

  function prologue() {
    const t = AI.theme();
    S.update((s) => (s.prologue = true));
    return play(
      [
        { scene: "bright", text: `Once upon a time, the Great Lantern filled ${t.world} with number magic. Everything sparkled with color.` },
        { scene: "mist", text: "Then the Muddle Mist rolled in. It scrambled every number, and all the colors faded away." },
        { scene: "heroes", text: `"Hoo-hoo! Only a number hero can relight the lantern," said Hoot the owl. Pip the sprite fluttered up: "Can I come? I want to learn too!"` },
      ],
      { title: "The Lantern of Numbers", finalLabel: "Begin the adventure" },
    );
  }

  function intro(id) {
    const t = AI.theme();
    const gave = S.get().choice === "gave";
    if (id === "frog") {
      return play([{ scene: "river", text: `The Mist knocked the ${t.glowName} into the river! Help ${t.hopperName} hop the number path to catch them.` }], { title: chapterTitle(id), finalLabel: "Start Chapter 1" });
    }
    if (id === "fireflies") {
      const fallback = gave
        ? `${t.npc} waves from the shore: "Thank you for helping me!" But the glade is still dark. Connect ${t.glowName} that make 10 to light the lantern.`
        : `Your ${t.glowOne} glows inside the lantern, but it needs much more light. Connect ${t.glowName} that make 10 to fill it!`;
      const moment = "Chapter 2 begins. The glade is dark, and the child must connect numbers that make 10 to light the lantern. Gently remind the child of something they did well in Chapter 1, then tell them what to do.";
      return play([{ scene: "gladeDark", ...narration(fallback, moment, "frog") }], { title: chapterTitle(id), finalLabel: "Start Chapter 2" });
    }
    const fallback = gave
      ? `${t.npc} runs up: "You helped me, so I'll help you! Take this lucky charm." The ${t.guardianName} is muddled by the Mist. Break its shields with number spells to wake it up!`
      : `${t.npc} cheers from far away: "Go, hero!" The ${t.guardianName} is muddled by the Mist. Break its shields with number spells to wake it up!`;
    const moment = `Chapter 3 begins. The ${t.guardianName} is muddled and guards the path with number shields. The child must combine number cards to break them. Mention something the child did in Chapter 2.`;
    return play([{ scene: "muddled", ...narration(fallback, moment, "fireflies") }], { title: chapterTitle(id), finalLabel: "Start the duel" });
  }

  function outro(id) {
    const t = AI.theme();
    if (id === "frog") {
      const choicePanel = {
        scene: "npc",
        text: `${t.npc} sniffles: "The Mist took my ${t.glowOne} too! Now my home is dark." What will you do?`,
        choices: [
          { id: "gave", emoji: "💝", label: `Give ${t.npc} your ${t.glowOne}`, reply: `"Thank you, thank you! I'll never forget this," says ${t.npc}.` },
          { id: "kept", emoji: "🏮", label: "Keep it for the Great Lantern", reply: `"That's okay! The lantern needs it most," says ${t.npc}. "Good luck, hero!"` },
        ],
        onChoose(choice) {
          this.chosen = true;
          S.update((s) => (s.choice = choice));
        },
      };
      const moment = `Chapter 1 ends. The child helped ${t.hopperName} hop along the number path and caught a glowing ${t.glowOne}. The river's colors come back.`;
      return play([{ scene: "riverFixed", ...narration(`${t.hopperName} caught the ${t.glowOne}! The river path shines with color again.`, moment, "frog") }, choicePanel], { title: "Chapter 1 complete!", finalLabel: "Back to the map" });
    }
    if (id === "fireflies") {
      const moment = "Chapter 2 ends. The child made tens and the lantern blazes; flowers bloom across the glade.";
      return play([{ scene: "gladeLit", ...narration(`The lantern blazes! Flowers bloom, and the glade sparkles with ${t.glowName}.`, moment, "fireflies") }], { title: "Chapter 2 complete!", finalLabel: "Back to the map" });
    }
    const moment = `The final chapter ends. The Mist melts away and the ${t.guardianName} wakes up, thankful and friendly. Celebrate what the child did.`;
    return play(
      [
        { scene: "wakes", ...narration(`The Mist melts away. The ${t.guardianName} yawns and smiles: "Thank you, hero. My head feels clear again!"`, moment, "guardian") },
        { scene: "finale", text: `The Great Lantern shines over ${t.world}. Every number is back where it belongs, thanks to you, Hoot and Pip!` },
      ],
      { title: "The End… for now!", finalLabel: "Celebrate!" },
    ).then(async () => {
      S.emit("storyDone");
      if (window.MQMini) await window.MQMini.playForChapter("guardian");
      // End on the child's accomplishment; the grown-ups note waits behind its own button (and only then asks AI).
      return window.MQUX ? window.MQUX.certificate(journeyText) : null;
    });
  }

  // ---------- Journey note for grown-ups ----------
  function journeyText() {
    const st = S.get().stats;
    const lines = [
      `used jumps of 10 on a number line ${st.bigHops} times`,
      `guessed a landing number before counting ${st.predictedRight} times`,
      `made 10 with three numbers ${st.triples} times`,
      `taught Pip why a mistake was wrong ${st.taught} times`,
      `asked Hoot for a hint ${st.hootAsks} times`,
      `got it right after a mistake ${st.solvedAfterMistake} times`,
      `made ${st.misses} mistakes along the way`,
    ];
    if (st.strategies.length) lines.push(`explained these strategies: ${st.strategies.join(", ").replace(/_/g, " ")}`);
    const strength = st.bigHops > 0 ? "added with jumps of 10, a key mental-math skill" : st.triples > 0 ? "found more than one way to make 10" : "kept going through every challenge";
    const practice = st.predictedRight === 0 ? "picturing where a sum lands before counting it out" : "carrying a ten when the ones add up past 10";
    const fallback = `For grown-ups: your child finished all three chapters and ${strength}. They're still practicing ${practice}. Try this at home: ask them to show 8 + 5 by making a ten first (8 + 2 + 3).`;
    if (AI.status() !== "on") return fallback;
    const ai = AI.journeyNote({ lines, numbers: numbersFrom(lines) }).then((note) => (note ? { text: `For grown-ups: ${note}`, byAI: true } : null));
    return Promise.race([ai, sleep(6000).then(() => null)]).then((r) => r || { text: fallback, byAI: false });
  }

  window.MQStory = {
    CHAPTERS,
    chapterTitle,
    prologue,
    intro,
    outro,
    play,
    bind: (effects) => (fx = effects),
  };
})();
