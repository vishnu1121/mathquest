// Modern layer: one drawn icon set in the HUD, a unisex hero picker, the Playground of story
// mini-games on the map, and mini-games woven into chapter endings.
(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.MQS;
  const MQ = window.MQ;

  const ICONS = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M9 9.5 7 3h3.5L12 6.5 13.5 3H17l-2 6.5"/><path d="m12 11.8.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
    bag: '<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    soundOn: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
    soundOff: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="m17 10 4 4m0-4-4 4"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7.6 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z"/>',
  };
  const icon = (name) => `<svg class="mq-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  // Unisex heroes: people shown as "person" (not man or woman) emoji, plus animal friends.
  const HEROES = [
    ["🧙", "Mage"], ["🦸", "Superhero"], ["🧑‍🚀", "Astronaut"], ["🥷", "Ninja"], ["🧑‍🔬", "Scientist"],
    ["🧑‍🎨", "Artist"], ["🧑‍🌾", "Gardener"], ["🧑‍🍳", "Chef"], ["🐼", "Panda"], ["🐯", "Tiger"],
  ];

  function openHeroPicker(first = false) {
    return new Promise((resolve) => {
      let chosen = S.hero();
      const el = document.createElement("div");
      el.className = "hero-picker";
      el.innerHTML = `
        <div class="hp-card" role="dialog" aria-modal="true" aria-labelledby="hpTitle">
          <h2 id="hpTitle">${first ? "Who will relight the lantern?" : "Choose your hero"}</h2>
          <p>Pick anyone you like. You can change your hero anytime.</p>
          <ul class="hp-grid">
            ${HEROES.map(([emoji, name]) => `<li><button type="button" class="hp-option" data-hero="${emoji}" aria-pressed="${emoji === chosen}"><span aria-hidden="true">${emoji}</span>${name}</button></li>`).join("")}
          </ul>
          <div class="hp-actions"><button type="button" class="btn" data-act="done">${first ? "Let's go!" : "Done"}</button></div>
        </div>`;
      document.body.appendChild(el);
      el.querySelectorAll(".hp-option").forEach((btn) =>
        btn.addEventListener("click", () => {
          chosen = btn.dataset.hero;
          el.querySelectorAll(".hp-option").forEach((o) => o.setAttribute("aria-pressed", String(o === btn)));
          MQ.fx.sfx.pop();
          const c = MQ.fx.center(btn);
          MQ.fx.burst(c.x, c.y, { count: 10, chars: [chosen, "✨"], spread: 80 });
        }),
      );
      el.querySelector('[data-act="done"]').addEventListener("click", () => {
        S.update((s) => (s.hero = chosen));
        const pill = $("heroBtn");
        if (pill) pill.textContent = chosen;
        MQ.fx.sfx.good();
        el.remove();
        if (!$("mapScreen").hidden) window.MQMap.render();
        resolve();
      });
      el.querySelector('[aria-pressed="true"]').focus();
    });
  }

  function patchHud() {
    $("homeBtn").innerHTML = icon("back");
    $("shopBtn").innerHTML = icon("bag");
    const count = $("badgeCount");
    $("badgeBtn").innerHTML = icon("medal");
    $("badgeBtn").appendChild(count);
    const coinGlyph = $("coinPill").querySelector('span[aria-hidden="true"]');
    if (coinGlyph) coinGlyph.outerHTML = icon("coin");
    const calm = $("calmBtn");
    if (calm) calm.innerHTML = icon("leaf");
    const mute = $("muteBtn");
    const renderMute = () => (mute.innerHTML = icon(mute.getAttribute("aria-pressed") === "false" ? "soundOff" : "soundOn"));
    renderMute();
    mute.addEventListener("click", renderMute);
    S.on("soundChanged", renderMute);

    const heroBtn = document.createElement("button");
    heroBtn.type = "button";
    heroBtn.id = "heroBtn";
    heroBtn.className = "hud-pill hud-icon hero-pill";
    heroBtn.setAttribute("aria-label", "Choose your hero");
    heroBtn.textContent = S.hero();
    $("badgeBtn").before(heroBtn);
    heroBtn.addEventListener("click", () => {
      MQ.fx.sfx.tap();
      openHeroPicker(false);
    });
  }

  // ---------- Playground ----------
  function renderPlayground() {
    const cta = document.querySelector(".map-cta");
    if (!cta || !window.MQMini) return;
    let box = $("playground");
    if (!box) {
      box = document.createElement("section");
      box.id = "playground";
      box.className = "playground";
      box.setAttribute("aria-labelledby", "pgTitle");
      cta.closest(".journey-layout").after(box);
    }
    const s = S.get();
    box.innerHTML = `
      <div class="playground-head"><div><p class="eyebrow">A LITTLE EXTRA WONDER</p><h2 id="pgTitle">The playground</h2></div><p>More ways to play, as your story unfolds.</p></div>
      <ul class="play-grid">
        ${window.MQMini.list().map((g) => {
          // Bonus games unlock by chapter slot, so every class unlocks the same eight games.
          const open = window.MQClasses?.grade() ? window.MQClasses.slotDone(g.chapterNumber) : Boolean(s.chapters[g.chapter]);
          const played = Boolean(s.minis && s.minis[g.id]);
          return `<li><button type="button" class="play-card" data-game="${g.id}" ${open ? "" : 'data-locked aria-disabled="true"'}>
            <span class="pc-art" aria-hidden="true">${g.emoji}</span>
            <span class="pc-chip">${open ? (played ? "Play again" : "New!") : `After Chapter ${g.chapterNumber}`}</span>
            <span class="pc-name">${g.name}</span>
            <span class="pc-desc">${g.desc}</span>
            ${g.skills ? `<span class="pc-skills">${g.skills}</span>` : ""}
          </button></li>`;
        }).join("")}
      </ul>`;
    box.querySelectorAll(".play-card").forEach((btn) =>
      btn.addEventListener("click", () => {
        if (btn.hasAttribute("data-locked")) {
          MQ.fx.sfx.wrong();
          const c = MQ.fx.center(btn);
          MQ.fx.floatText(c.x, c.y - 40, "Finish the chapter first!");
          return;
        }
        MQ.fx.sfx.tap();
        window.MQMini.play(btn.dataset.game).then(() => renderPlayground());
      }),
    );
  }

  // ---------- Start and story hooks ----------
  const previousStart = MQ.start;
  MQ.start = function start() {
    previousStart();
    patchHud();
    renderPlayground();
    new MutationObserver(renderPlayground).observe($("mapBoard"), { childList: true });
  };

  const prologue = window.MQStory.prologue;
  window.MQStory.prologue = async () => {
    if (!S.get().hero) await openHeroPicker(true);
    return prologue();
  };

  // Chapter 1 and 2 endings flow into their story game; Chapter 3's plays before the certificate (story.js).
  const outro = window.MQStory.outro;
  window.MQStory.outro = async (id) => {
    await outro(id);
    if (id !== "guardian" && window.MQMini) await window.MQMini.playForChapter(id);
  };

  window.MQHero = { openHeroPicker, HEROES };
})();
