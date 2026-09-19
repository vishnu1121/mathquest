import { BONUS_BY_SLOT } from "../classes/catalog";
import { restoreVoyage } from "../voyage";

// The explorable island and quest list for the current class: eight chapters in slot order, a camp and keepsakes.
(function () {
  const S = window.MQS, MQ = window.MQ, $ = (id) => document.getElementById(id);
  const points = [[190,490],[235,240],[525,175],[830,205],[955,475],[670,550],[350,275],[860,320]];
  const keepsakes = [
    { id: "feather", x: 355, y: 555, symbol: "🪶", title: "Hoot’s first feather", text: "“I couldn’t fly the first time I tried,” says Hoot. “I kept this feather to remember my first little lift.”", needs: null },
    { id: "bell", x: 1050, y: 346, symbol: "🔔", title: "The smallest festival bell", text: "Someone made a bell from a raindrop. It only rings when someone new feels welcome.", needs: 4 },
    { id: "shell", x: 730, y: 360, symbol: "🐚", title: "A shell full of stories", text: "Pip holds the shell to one ear. “It sounds like all our adventures. And… is that a robot snoring?”", needs: 5 },
  ];
  const C = () => window.MQClasses;
  const v = () => restoreVoyage(S.get().voyage);
  let region = "isles", view = "explore", hero = { x: 490, y: 475 }, map;
  const open = (id) => MQ.openLevel(MQ.levels.find((l) => l.id === id));
  const chapters = () => C()?.current()?.chapters || [];
  const indexOf = (id) => chapters().findIndex((c) => c.id === id);
  const art = (ch) => ch.kind === "classic" ? window.MQVoyageArt.building(ch.id) : `<span class="voyage-building vw-emoji-building" aria-hidden="true"><span>${ch.emoji}</span></span>`;
  const reduced = () => S.get().calm || matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** The label under the hero: the name the child typed on the way in, or YOU when they skipped it. */
  const heroLabel = () => window.MQClassArt.esc((S.get().name || "YOU").toUpperCase());

  function dialog(title, body, actions) {
    const before = document.activeElement, el = document.createElement("dialog");
    el.className = "voyage-dialog voyage-panel"; el.setAttribute("aria-labelledby", "voyagePanelTitle");
    el.innerHTML = `<button type="button" class="vp-close" aria-label="Close">×</button><h2 id="voyagePanelTitle">${title}</h2>${body}<div class="vp-actions"></div>`;
    const close = () => { el.close(); el.remove(); const target = before?.isConnected ? before : document.getElementById(before?.id) || $("voyageIsland"); target?.focus({ preventScroll: true }); };
    el.querySelector(".vp-close").onclick = close;
    el.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    for (const action of actions || []) { const b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = action.label; b.onclick = () => { close(); action.run(); }; el.querySelector(".vp-actions").append(b); }
    if (el.querySelector(".camp-garden")) {
      for (const [label, run] of [["Hoot’s shop", () => window.MQShop.open()], ["Badge book", () => window.MQBadges.openBook()]]) {
        const b = document.createElement("button"); b.type = "button"; b.className = "btn secondary"; b.textContent = label;
        b.onclick = () => { close(); run(); }; el.querySelector(".vp-actions").append(b);
      }
    }
    document.body.append(el); el.showModal(); return el;
  }
  function move(x, y, follow = false) {
    hero = { x: Math.max(70, Math.min(1120, x)), y: Math.max(105, Math.min(635, y)) };
    const token = $("voyageHero"); if (!token) return;
    token.style.left = `${hero.x / 12}%`; token.style.top = `${hero.y / 7.6}%`;
    if (follow) {
      const camera = $("voyageCamera"), scene = $("voyageIsland");
      camera?.scrollTo({ left: hero.x / 1200 * scene.offsetWidth - camera.clientWidth / 2, behavior: reduced() ? "instant" : "smooth" });
    }
  }
  function progressText(ch, done) {
    const run = ch.kind === "classic" ? v().runs[ch.id] : (S.get().classRuns || {})[ch.id];
    const of = ch.kind === "classic" ? 4 : 5;
    if (done) return "Your friends remember. Visit again for new questions.";
    return run && run.round > 0 ? `Saved: ${run.round} of ${of} ${ch.kind === "classic" ? "missions" : "questions"} complete.` : "Your friends are ready for an adventure.";
  }
  function enterPlace(id) {
    const i = indexOf(id);
    if (i < 0) return;
    const nextRegion = i >= 6 ? "coast" : "isles";
    if (region !== nextRegion) { region = nextRegion; render(); }
    const list = chapters(), ch = list[i], done = Boolean(S.get().chapters[id]), unlocked = C().canOpen(id);
    move(points[i][0], points[i][1] + 55, true);
    const bonus = window.MQMini.list().find((g) => g.id === BONUS_BY_SLOT[i]);
    const running = !done && ((ch.kind === "classic" ? v().runs[id] : (S.get().classRuns || {})[id])?.round || 0) > 0;
    const body = `<div class="vp-portrait">${art(ch)}</div><p class="voyage-kicker">CHAPTER ${i + 1} · ${ch.place}</p><p>${ch.quest}</p><p class="vp-skill">${ch.skills}</p><p>${unlocked ? progressText(ch, done) : `First, finish Chapter ${i}: ${list[i - 1].title}.`}</p>${bonus ? `<p class="vp-bonus">BONUS UNLOCK · ${bonus.name}</p>` : ""}`;
    dialog(ch.title, body, unlocked
      ? [{ label: done ? "Play this chapter again →" : running ? "Continue my chapter →" : "Start this chapter →", run: () => open(id) }]
      : [{ label: "Take me to my next quest →", run: () => enterPlace(C().nextChapter()) }]);
  }
  function collect(id) {
    const k = keepsakes.find((item) => item.id === id);
    move(k.x, k.y, true);
    if (k.needs && !C().slotDone(k.needs)) { dialog("A little mystery", `<div class="vp-treasure">${k.symbol}</div><p>Someone left a keepsake here. Its story will unfold after Chapter ${k.needs}: ${C().slotChapter(k.needs).title}.</p>`); return; }
    const found = v().keepsakes.includes(id);
    if (!found) S.update((s) => { const state = v(); state.keepsakes.push(id); s.voyage = state; });
    dialog(k.title, `<div class="vp-treasure">${k.symbol}</div><p>${k.text}</p><p class="vp-skill">${found ? "A story you can keep." : "Keepsake discovered! Find it again in your camp."}</p>`);
    render();
  }
  function camp() {
    move(510, 475, true);
    const state = v(); let paint = "flower";
    const icons = { flower: "🌻", mushroom: "🍄", lantern: "🏮", empty: "·" };
    const el = dialog("Your little corner of the world", `<p>Plant a garden for your friends. Choose something, then tap a patch. Your garden stays here between adventures, in every class.</p><div class="camp-palette">${[["flower", "🌻"], ["mushroom", "🍄"], ["lantern", "🏮"], ["empty", "↶"]].map(([pid, icon]) => `<button type="button" data-paint="${pid}" aria-label="${pid === "empty" ? "Clear a patch" : pid}" aria-pressed="${pid === paint}">${icon}</button>`).join("")}</div><div class="camp-garden">${state.camp.map((item, i) => `<button type="button" data-patch="${i}" aria-label="Garden patch ${i + 1}: ${item}">${icons[item]}</button>`).join("")}</div><div class="camp-pocket"><h3>Stories in your pocket · ${state.keepsakes.length}/3</h3>${keepsakes.map((k) => `<span>${state.keepsakes.includes(k.id) ? k.symbol : "◇"} ${state.keepsakes.includes(k.id) ? k.title : "Waiting to be found"}</span>`).join("")}</div>`, [{ label: "My learning journal →", run: () => window.MQUX.openJournal() }, { label: "For grown-ups →", run: () => window.MQAdults.open() }]);
    el.addEventListener("click", (e) => {
      const choice = e.target.closest("[data-paint]");
      if (choice) { paint = choice.dataset.paint; el.querySelectorAll("[data-paint]").forEach((b) => b.setAttribute("aria-pressed", String(b === choice))); }
      const patch = e.target.closest("[data-patch]");
      if (patch) { S.update((s) => { const st = v(); st.camp[Number(patch.dataset.patch)] = paint; s.voyage = st; }); patch.textContent = icons[paint]; patch.setAttribute("aria-label", `Garden patch ${Number(patch.dataset.patch) + 1}: ${paint}`); MQ.fx.sfx.pop(); render(); }
    });
  }
  function setView(next) {
    view = next; map.dataset.view = view;
    document.querySelectorAll("[data-world-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.worldView === view)));
    if (view === "explore") requestAnimationFrame(() => move(hero.x, hero.y, true));
    window.scrollTo(0, 0);
  }

  function render() {
    if (!map) return;
    const box = $("voyageWorld"), info = C()?.current();
    if (!info) {
      box.innerHTML = '<div class="vw-heading"><div><p class="voyage-kicker">THE LANTERN ISLES</p><h1>Choose your class to begin.</h1></div></div><div class="vw-choose"><p>Every class has its own island with eight story chapters.</p><button type="button" class="btn" data-choose-class>Choose my class →</button></div>';
      box.querySelector("[data-choose-class]").onclick = () => C().ensureGrade();
      $("voyageQuestList").innerHTML = "";
      return;
    }
    const oldFocus = document.activeElement?.id, done = S.get().chapters, list = info.chapters, ids = list.map((c) => c.id);
    const next = C().nextChapter(), idx = ids.indexOf(next), count = list.filter((c) => done[c.id]).length, state = v();
    box.dataset.region = region; box.dataset.class = info.id;
    const status = (c) => C().canOpen(c.id) ? done[c.id] ? ", restored" : ", ready" : ", locked";
    box.innerHTML = `<div class="vw-heading"><div><p class="voyage-kicker">${info.label.toUpperCase()} · ${info.island.toUpperCase()}</p><h1>${count === 8 ? "You belong here." : count >= 3 ? "Beyond the mist." : "An adventure is calling."}</h1></div><span class="vw-restored"><i>✦</i> ${count}/8 chapters</span><button type="button" class="vw-fullscreen" aria-label="Toggle full screen">⛶</button></div>
      <div class="vw-region-switch" aria-label="Island region"><button type="button" data-region="isles" aria-pressed="${region === "isles"}">☁ Chapters 1–6</button><button type="button" data-region="coast" aria-pressed="${region === "coast"}">🌻 Chapters 7–8</button></div>
      <div class="voyage-camera" id="voyageCamera"><div class="voyage-island" id="voyageIsland" tabindex="0" aria-label="Explore ${info.island}. Arrow keys move your hero; Enter visits a nearby place. You can also use the landmark buttons.">${window.MQVoyageArt.island({ cloudbridge: C().slotDone(6) })}<span class="vw-region valley">${info.island.toUpperCase()}</span><span class="vw-region skybound">THE FAR SHORE</span>
      ${list.map((c, i) => `<button type="button" id="voyage-place-${c.id}" class="vw-place ${done[c.id] ? "restored" : ""} ${c.id === next ? "next" : ""}" data-place="${c.id}" data-shore="${i >= 6 ? "coast" : "isles"}" style="left:${points[i][0] / 12}%;top:${points[i][1] / 7.6}%" aria-label="Chapter ${i + 1}: ${c.title}${status(c)}">${art(c)}<span class="vw-pin">${done[c.id] ? "✓" : C().canOpen(c.id) ? i + 1 : "⌑"}</span><span class="vw-place-label">${c.place}</span>${c.id === next ? '<span class="vw-here">YOUR NEXT QUEST</span>' : ""}</button>`).join("")}
      <button type="button" class="vw-camp" data-camp style="left:42.5%;top:57.9%" aria-label="Visit your camp">${window.MQVoyageArt.building("camp")}<span>Your camp</span></button><div class="vw-garden" aria-hidden="true">${state.camp.filter((c) => c !== "empty").slice(0, 5).map((c) => ({ flower: "🌻", mushroom: "🍄", lantern: "🏮" })[c]).join("")}</div>
      ${keepsakes.map((k) => `<button type="button" class="vw-secret ${state.keepsakes.includes(k.id) ? "found" : ""}" data-keepsake="${k.id}" style="left:${k.x / 12}%;top:${k.y / 7.6}%" aria-label="Explore ${k.symbol} keepsake">${k.symbol}<i>${state.keepsakes.includes(k.id) ? "✓" : "✧"}</i></button>`).join("")}
      <span id="voyageHero" class="vw-hero" aria-hidden="true"><span class="vw-body"><span class="vw-me">${S.hero()}</span>${S.get().hat ? `<span class="vw-wear" data-slot="${window.MQShop.slotFor(S.get().hat)}">${S.get().hat}</span>` : ""}${S.get().pet ? `<span class="vw-pet">${S.get().pet}</span>` : ""}</span><i>${heroLabel()}</i></span>${C().slotDone(4) && !["K", "1"].includes(info.id) ? `<span class="vw-nimbus" aria-hidden="true">${window.MQVoyageArt.nimbus}</span>` : ""}</div></div>
      <div class="vw-hint"><span>✥</span> Tap to wander · visit a landmark <span class="vw-key-hint">· arrows to move, Enter to visit</span></div>
      <div class="vw-quest"><div class="vw-quest-symbol">${art(list[idx])}</div><div><p class="voyage-kicker">${count === 8 ? "THE ADVENTURE GOES ON" : `CHAPTER ${idx + 1} · YOUR NEXT QUEST`}</p><h2>${list[idx].title}</h2><p>${count === 8 ? "Visit your friends. Replay a chapter. Make your camp your own." : list[idx].quest}</p></div><button type="button" class="btn" data-continue>${count === 8 ? "Revisit" : "Let’s go"} →</button></div>`;
    box.querySelectorAll("[data-region]").forEach((b) => (b.onclick = () => { region = b.dataset.region; render(); }));
    move(hero.x, hero.y);
    box.querySelectorAll("[data-place]").forEach((b) => (b.onclick = () => enterPlace(b.dataset.place)));
    box.querySelectorAll("[data-keepsake]").forEach((b) => (b.onclick = () => collect(b.dataset.keepsake)));
    box.querySelector("[data-camp]").onclick = camp;
    box.querySelector("[data-continue]").onclick = () => enterPlace(next);
    box.querySelector(".vw-fullscreen").onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { window.MQUX.toast("✦", "Your adventure is ready in this window."); } };
    const scene = $("voyageIsland");
    scene.addEventListener("click", (e) => { if (e.target.closest("button")) return; const rect = scene.getBoundingClientRect(); move((e.clientX - rect.left) / rect.width * 1200, (e.clientY - rect.top) / rect.height * 760); });
    scene.addEventListener("keydown", (e) => {
      if (e.target !== scene) return;
      const dirs = { ArrowLeft: [-25, 0], ArrowRight: [25, 0], ArrowUp: [0, -25], ArrowDown: [0, 25] };
      if (dirs[e.key]) { e.preventDefault(); move(hero.x + dirs[e.key][0], hero.y + dirs[e.key][1], true); }
      if (e.key === "Enter") {
        e.preventDefault();
        const nearest = points.map(([x, y], i) => ({ i, d: Math.hypot(x - hero.x, y - hero.y) })).filter(({ i }) => (region === "coast" ? i >= 6 : i < 6)).sort((a, b) => a.d - b.d)[0];
        if (nearest.d < 170) enterPlace(ids[nearest.i]); else if (Math.hypot(hero.x - 510, hero.y - 440) < 130) camp(); else window.MQUX.toast("🦉", "Walk toward a landmark, or tap its sign.");
      }
    });
    $("voyageQuestList").innerHTML = `<div class="vql-heading"><p class="voyage-kicker">${info.label.toUpperCase()} · YOUR STORY SO FAR</p><h1>${info.island}. Eight chapters. Your adventure.</h1><p>${info.tagline}</p></div><div class="vql-grid">${list.map((c, i) => `<button type="button" data-quest="${c.id}">${art(c)}<span class="voyage-kicker">${c.skills}</span><b>${i + 1}. ${c.title}</b><span>${done[c.id] ? "✓ Restored · play again" : C().canOpen(c.id) ? "Your next adventure →" : `After Chapter ${i}`}</span></button>`).join("")}</div><button type="button" class="btn secondary" data-journal>My learning journal →</button>`;
    $("voyageQuestList").querySelectorAll("[data-quest]").forEach((b) => (b.onclick = () => enterPlace(b.dataset.quest)));
    $("voyageQuestList").querySelector("[data-journal]").onclick = () => window.MQUX.openJournal();
    if (oldFocus && document.getElementById(oldFocus)) document.getElementById(oldFocus).focus({ preventScroll: true });
    requestAnimationFrame(() => { const camera = $("voyageCamera"); if (camera) camera.scrollLeft = hero.x / 1200 * scene.offsetWidth - camera.clientWidth / 2; });
  }

  S.on("classChanged", () => { region = C()?.slotDone(6) ? "coast" : "isles"; hero = { x: 490, y: 475 }; });
  const previous = MQ.start;
  MQ.start = function () {
    previous(); map = $("mapScreen"); map.classList.add("world-map"); map.dataset.view = view;
    region = C()?.slotDone(6) ? "coast" : "isles";
    const world = document.createElement("section"); world.id = "voyageWorld"; world.className = "voyage-world";
    const quests = document.createElement("section"); quests.id = "voyageQuestList";
    const nav = document.createElement("nav"); nav.className = "voyage-nav"; nav.setAttribute("aria-label", "Adventure navigation");
    // Apex is last and is hidden for the classes that do not have it (runtime/apex.js syncNav).
    nav.innerHTML = [["explore", "✥", "Explore"], ["quests", "⚑", "Quests"], ["arena", "✺", "Arena"], ["practice", "✎", "Practice"], ["arcade", "✦", "Arcade"], ["apex", "◆", "Apex"]].map(([id, icon, label]) => `<button type="button" data-world-view="${id}" aria-pressed="${id === view}"${id === "apex" ? " hidden" : ""}><span aria-hidden="true">${icon}</span>${label}</button>`).join("");
    nav.querySelectorAll("button").forEach((b) => (b.onclick = () => setView(b.dataset.worldView)));
    map.prepend(world, quests); map.append(nav); render();
    new MutationObserver(render).observe($("mapBoard"), { childList: true });
    $("storyBtn")?.setAttribute("aria-label", "Replay the original story");
  };
  window.MQWorld = { setView, enterPlace, render, camp };
})();
