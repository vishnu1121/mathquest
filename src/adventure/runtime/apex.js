// Apex Mode and the island's treasure hunt.
//
// Grades 3, 4 and 5 only, and only once the whole island is finished. Younger classes do not see a locked
// tab or a greyed-out card: the tab is not in their navigation at all, because a door you can see but never
// open is worse than no door.
//
// The rules about what Apex asks, how hard it is, which gem hides where and what a run has to be worth to
// turn one up all live in classes/apex.ts, which is pure and tested. This file is the island around them:
// the eight quests as levels, the panel, the vault, and the two moments that matter — a gem coming out of
// the ground, and the island giving up its last secret.
import {
  ALL_GEMS, APEX_ROUNDS, NOVA, apexQuestOpen, apexQuests, apexQuestsDone,
  apexUnlocked, chaptersLeft, gemsFound, isApexGrade, recordApexQuest, restoreApex, starsFor,
} from "../classes/apex";
import { CLASSES } from "../classes/catalog";

(function () {
  const S = window.MQS, MQ = window.MQ, $ = (id) => document.getElementById(id);
  const esc = window.MQClassArt.esc;
  const C = () => window.MQClasses;
  const grade = () => C()?.grade() || null;

  // `apex` is a per-class save field, and switchClass deletes a field the incoming class never wrote —
  // so this is routinely undefined and restoreApex has to start from nothing.
  const read = () => restoreApex(S.get().apex);
  const write = (next) => S.update((s) => { s.apex = next; });

  /** Whether this class has Apex at all. Not "can they play it yet" — whether it exists for them. */
  const offered = () => isApexGrade(grade());
  /**
   * The playtest switch, the same one `classes.js` and the voyage missions honour: the hidden
   * "unlock all chapters" button in the shell sets it. It opens the door for testing without touching
   * the real rule — `apexUnlocked` in classes/apex.ts stays strict, and is what the tests pin.
   * It never opens Apex for K, 1 or 2: `offered()` still has to be true.
   */
  const playtest = () => Boolean(S.get().unlockAll);
  const unlocked = () => offered() && (playtest() || apexUnlocked(grade(), S.get().chapters));
  const quests = () => (offered() ? apexQuests(grade()) : []);
  const still = () => ALL_GEMS.length - gemsFound(read());
  const calm = () => Boolean(S.get().calm) || matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- A dialog, borrowed from the island ----------
  // Native <dialog> rather than a body-appended div: Escape, the backdrop and the focus trap come from the
  // platform, and Hoot re-parents himself into dialog[open] instead of flying across the celebration.
  function dialog(className, body, actions) {
    return new Promise((resolve) => {
      const before = document.activeElement;
      const el = document.createElement("dialog");
      el.className = `voyage-dialog voyage-panel ${className}`;
      el.setAttribute("aria-labelledby", "apexDialogTitle");
      el.innerHTML = `${body}<div class="vp-actions"></div>`;
      const close = (value) => {
        el.close(); el.remove();
        if (before?.isConnected) before.focus({ preventScroll: true });
        resolve(value);
      };
      el.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
      for (const action of actions) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = action.secondary ? "btn secondary" : "btn";
        b.textContent = action.label;
        b.onclick = () => close(action.value ?? true);
        el.querySelector(".vp-actions").append(b);
      }
      document.body.append(el);
      el.showModal();
      el.querySelector(".vp-actions button")?.focus();
    });
  }

  /**
   * A card in the vault. An undiscovered gem is a silhouette with no name, no quest and no requirement —
   * a child should wonder what is left, not read a checklist.
   *
   * The Nova is the exception, and deliberately so: it is the goal of the whole mode, not one of its
   * secrets. Knowing it is down there is what makes finishing the eighth quest mean something.
   */
  const gemCard = (gem, found) => {
    if (found) return `<li class="apex-gem found" data-tier="${gem.tier}"><span class="ag-stone" aria-hidden="true">${gem.emoji}</span><b>${esc(gem.name)}</b><small>${esc(gem.fact)}</small><i class="ag-state">✓ Discovered</i></li>`;
    if (gem.tier === "ultimate") return `<li class="apex-gem apex-goal" data-tier="${gem.tier}"><span class="ag-stone ag-hidden" aria-hidden="true">◈</span><b>${esc(gem.name)}</b><small>${esc(gem.fact)} Finish every Apex quest.</small><i class="ag-state">Waiting at the end</i></li>`;
    return `<li class="apex-gem" data-tier="${gem.tier}"><span class="ag-stone ag-hidden" aria-hidden="true">◈</span><b>Undiscovered</b><small>Somewhere on this island.</small><i class="ag-state">Still hidden</i></li>`;
  };

  // ---------- The two moments ----------

  /**
   * A gem coming out of the ground: Hoot notices, then the stone appears. Two beats, because one beat is a
   * notification and three is a chore. Under calm mode the shimmer and the burst are simply not played —
   * the same words, the same gem, no motion.
   */
  async function reveal(api, gem, quest) {
    await dialog("apex-reveal",
      `<p class="voyage-kicker">APEX CHALLENGE PASSED</p><h2 id="apexDialogTitle">Something is glinting under ${esc(quest.place)}</h2><div class="ar-ground ${calm() ? "" : "shimmer"}" aria-hidden="true"><span>${quest.emoji}</span><i></i><i></i><i></i></div><p>Hoot circles low. “That was sharp thinking — and it shook something loose. Come and see.”</p>`,
      [{ label: "Dig it out →" }]);
    if (!api.alive()) return;
    const found = dialog("apex-reveal apex-found",
      `<p class="voyage-kicker">RARE TREASURE FOUND</p><h2 id="apexDialogTitle">${esc(gem.name)}</h2><div class="ar-stone ${calm() ? "" : "rise"}" role="img" aria-label="${esc(gem.name)}"><span>${gem.emoji}</span></div><p class="ar-fact">${esc(gem.fact)}</p><p class="ar-added">✦ Added to your treasure vault. ${still()} ${still() === 1 ? "treasure is" : "treasures are"} still hidden.</p>`,
      [{ label: "Keep it →" }]);
    api.sfx.win();
    if (!calm()) {
      const stone = document.querySelector(".apex-found .ar-stone");
      if (stone) setTimeout(() => api.burst(api.center(stone).x, api.center(stone).y, { count: 22, chars: [gem.emoji, "✨", "✦"], spread: 170 }), 220);
    }
    await found;
  }

  /** The last secret. Same machinery, one more beat, and the island itself reacts first. */
  async function revealNova(api, gem) {
    const info = CLASSES[grade()];
    await dialog("apex-reveal apex-final",
      `<p class="voyage-kicker">EVERY APEX QUEST COMPLETE</p><h2 id="apexDialogTitle">${esc(info.island)} is humming</h2><div class="ar-ground ${calm() ? "" : "shimmer"}" aria-hidden="true"><span>${info.emoji}</span><i></i><i></i><i></i></div><p>Every landmark lights at once. Pip grabs Hoot’s wing. “It’s the whole island — it’s pointing at something!”</p>`,
      [{ label: "Follow the light →" }]);
    if (!api.alive()) return;
    const opened = dialog("apex-reveal apex-found apex-nova",
      `<p class="voyage-kicker">THE HIDDEN TREASURE OF THE ISLAND</p><h2 id="apexDialogTitle">${esc(gem.name)}</h2><div class="ar-stone ${calm() ? "" : "rise"}" role="img" aria-label="${esc(gem.name)}"><span>${gem.emoji}</span></div><p class="ar-fact">${esc(gem.fact)}</p><p class="ar-added">You finished every Apex quest on ${esc(info.island)}. Nobody gets this one by luck.</p>`,
      [{ label: "Take the Nova Gem →" }]);
    api.sfx.win();
    if (!calm()) {
      setTimeout(() => api.burst(window.innerWidth / 2, window.innerHeight * 0.34, { count: 34, chars: ["🌟", "✨", "✦", gem.emoji], spread: 300 }), 200);
      setTimeout(() => api.burst(window.innerWidth / 2, window.innerHeight * 0.42, { count: 22, chars: ["🌟", "✨"], spread: 240 }), 900);
    }
    await opened;
  }

  /**
   * One finished Apex quest. The record is written first, so a child who closes the tab mid-celebration
   * still keeps what they earned; the reveals come after, and every await re-checks that the level is
   * still on screen before touching it.
   */
  async function finishQuest(api, quest, independent) {
    const g = grade();
    if (!isApexGrade(g)) return;
    const outcome = recordApexQuest(read(), g, quest.slot, independent);
    write(outcome.save);
    S.emit("apexQuestDone", { slot: quest.slot, independent, gem: outcome.found?.id || null });

    if (outcome.found) await reveal(api, outcome.found, quest);
    if (outcome.nova && api.alive()) await revealNova(api, outcome.nova);
    if (!api.alive()) return;

    const solo = `${independent} of ${APEX_ROUNDS} right on the first try without help.`;
    const note = outcome.nova
      ? `You hold the Nova Gem. Every Apex quest on this island is finished. ${solo}`
      : outcome.found
        ? `You turned up the ${outcome.found.name}. ${solo}`
        : outcome.missed
          ? `Something is still humming under ${quest.place}. ${solo} A sharper run might shake it loose.`
          : `${solo} The hardest thinking on this island, and you did it.`;
    api.finish({ stars: starsFor(independent), emoji: outcome.nova ? NOVA.emoji : outcome.found?.emoji || quest.emoji, title: `${quest.title}: Apex cleared!`, note });
  }

  // ---------- The vault ----------

  function openVault() {
    const state = read(), total = ALL_GEMS.length;
    const list = ALL_GEMS.map((gem) => gemCard(gem, gem.id === NOVA.id ? state.nova : state.gems.includes(gem.id))).join("");
    dialog("apex-vault",
      `<p class="voyage-kicker">APEX TREASURE VAULT</p><h2 id="apexDialogTitle">${gemsFound(state)} of ${total} treasures found</h2><p>Rare gems are hidden behind the Apex quests. Some take a really sharp run to shake loose, and one or two quests hide nothing at all — keep exploring.</p><ul class="apex-gems">${list}</ul>`,
      [{ label: "Back to the island", secondary: true }]);
  }

  // ---------- The panel ----------

  function renderPanel() {
    const panel = $("apexPanel");
    if (!panel) return;
    const g = grade();
    if (!offered()) { panel.innerHTML = ""; return; }
    const info = CLASSES[g];
    const focused = document.activeElement?.id;

    if (!unlocked()) {
      const left = chaptersLeft(g, S.get().chapters);
      panel.innerHTML = `<div class="apex-head"><p class="voyage-kicker">${info.label.toUpperCase()} · APEX MODE</p><h1>The island keeps one more secret.</h1><p class="apex-lede">Finish all eight chapters of ${esc(info.island)} and Apex Mode opens: the same eight quests, at the very hardest this class goes, with rare treasure hidden along the way.</p></div>
        <div class="apex-locked"><span class="apex-seal" aria-hidden="true">◈</span><div><h2>${left} ${left === 1 ? "chapter" : "chapters"} to go</h2><p>Apex is not another grade. It is ${esc(info.label)} thinking, turned all the way up: more steps, missing middles, and working backwards.</p><button type="button" class="btn" data-apex="next">Take me to my next quest →</button></div></div>`;
      panel.querySelector('[data-apex="next"]').onclick = () => { window.MQWorld.setView("explore"); window.MQWorld.enterPlace(C().nextChapter()); };
      return;
    }

    const state = read(), all = quests(), done = apexQuestsDone(state, g);
    const cards = all.map((quest) => {
      const record = state.quests[quest.id];
      const open = playtest() || apexQuestOpen(state, g, quest.slot);
      const status = record ? `✓ Cleared · ${record.stars} of 3 stars` : open ? "Ready — this is the hard one →" : `After Apex quest ${quest.slot - 1}`;
      return `<button type="button" id="apex-quest-${quest.slot}" data-apex-quest="${quest.slot}" class="${record ? "cleared" : ""} ${open && !record ? "next" : ""}" ${open ? "" : "disabled"} aria-label="Apex quest ${quest.slot}: ${esc(quest.title)}. ${status}">
        <span class="aq-emoji" aria-hidden="true">${quest.emoji}</span><span class="voyage-kicker">APEX ${quest.slot} · ${esc(quest.place)}</span><b>${esc(quest.title)}</b><span class="aq-skills">${esc(quest.skills)}</span><span class="aq-status">${open ? status : `🔒 ${status}`}</span></button>`;
    }).join("");

    panel.innerHTML = `<div class="apex-head"><p class="voyage-kicker">${info.label.toUpperCase()} · APEX MODE</p><h1>${done === all.length ? "You have taken this island apart." : "The hardest thinking on the island."}</h1><p class="apex-lede">The same eight quests, the same topics — turned all the way up. ${esc(info.label)} maths, at its very hardest. Rare gems are buried along the way.</p>
      <div class="apex-meters"><span class="apex-meter"><i aria-hidden="true">◆</i> ${done}/${all.length} Apex quests</span><button type="button" class="apex-meter apex-vault-open" data-apex="vault"><i aria-hidden="true">💎</i> ${gemsFound(state)}/${ALL_GEMS.length} treasures <small>Open the vault</small></button></div></div>
      <div class="apex-grid">${cards}</div>
      <p class="apex-foot">${state.nova ? "The Nova Gem is yours. There is nothing left buried here." : `${still()} ${still() === 1 ? "treasure is" : "treasures are"} still hidden on ${esc(info.island)}. They will not all come from the same quests.`}</p>`;

    panel.querySelector('[data-apex="vault"]').onclick = openVault;
    panel.querySelectorAll("[data-apex-quest]").forEach((b) => (b.onclick = () => openQuest(Number(b.dataset.apexQuest))));
    if (focused && document.getElementById(focused)) document.getElementById(focused).focus({ preventScroll: true });
  }

  function openQuest(slot) {
    const quest = quests().find((q) => q.slot === slot);
    if (!quest || !unlocked() || !(playtest() || apexQuestOpen(read(), grade(), slot))) return;
    MQ.openLevel(MQ.levels.find((l) => l.id === quest.id));
  }

  // ---------- Levels ----------

  function register() {
    for (const info of Object.values(CLASSES)) {
      if (!isApexGrade(info.id)) continue;
      for (const quest of apexQuests(info.id)) {
        MQ.register({
          id: quest.id,
          name: `Apex: ${quest.title}`,
          emoji: quest.emoji,
          grade: info.id,
          // pathway keeps this off the legacy three-stop map, which indexes a fixed points array and
          // would throw on a fourth entry.
          pathway: true,
          stageClass: "trail-stage class-stage apex-stage",
          resultKicker: `${info.label.toUpperCase()} · APEX ${quest.slot}`,
          resultLabel: "Back to Apex",
          canOpen: () => unlocked() && (playtest() || apexQuestOpen(read(), info.id, quest.slot)),
          mount: (stage, api) => window.MQClassGames.mount(stage, api, {
            id: quest.id, grade: info.id, title: quest.title, emoji: quest.emoji,
            kicker: `${info.label} · Apex ${quest.slot} · ${quest.place}`,
            apex: quest,
          }),
        });
      }
    }
  }

  // ---------- Navigation ----------

  /** The tab exists only for the classes that have Apex. It is removed, not disabled, for the rest. */
  function syncNav() {
    const tab = document.querySelector('[data-world-view="apex"]');
    const nav = document.querySelector(".voyage-nav");
    if (!tab || !nav) return;
    tab.hidden = !offered();
    nav.toggleAttribute("data-apex", offered());
    tab.querySelector(".apex-dot")?.remove();
    if (offered() && unlocked() && !read().nova) {
      const dot = document.createElement("i");
      dot.className = "apex-dot";
      dot.setAttribute("aria-hidden", "true");
      tab.append(dot);
    }
    // A Grade 1 child must never be left looking at a panel their class does not have.
    if (!offered() && document.getElementById("mapScreen")?.dataset.view === "apex") window.MQWorld.setView("explore");
  }

  register();
  const previous = MQ.start;
  MQ.start = function () {
    previous();
    const map = $("mapScreen");
    if (map && !$("apexPanel")) {
      const panel = document.createElement("section");
      panel.id = "apexPanel";
      panel.className = "apex-panel";
      // Before the nav, which is appended last and is position:fixed anyway.
      map.append(panel);
    }
    syncNav();
    renderPanel();
    S.on("classChanged", () => { syncNav(); renderPanel(); });
    S.on("levelDone", () => { syncNav(); renderPanel(); });
    S.on("apexQuestDone", renderPanel);
  };

  window.MQApex = { offered, unlocked, finishQuest, openVault, renderPanel, syncNav, openQuest, read };
})();
