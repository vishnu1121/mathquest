// Classes: which class the child is in, the class picker, switching class, and which chapters are open.
// Each class is its own island with eight chapters in order; saves swap per-class progress (classes/progress.ts).
import { CLASSES, CLASS_LIST, chapterHome } from "../classes/catalog";
import { assignFirstClass, isGrade, switchClass } from "../classes/progress";

(function () {
  const S = window.MQS, MQ = window.MQ, $ = (id) => document.getElementById(id);
  const esc = window.MQClassArt.esc;
  const grade = () => (isGrade(S.get().grade) ? S.get().grade : null);
  const current = () => (grade() ? CLASSES[grade()] : null);

  /** A chapter opens when it belongs to the current class and the chapter before it is done. */
  function canOpen(id) {
    const home = chapterHome(id);
    if (!home) return true;
    if (home.grade !== grade()) return false;
    // A finished chapter can always be replayed, even when an older save finished it out of order.
    if (S.get().unlockAll || home.chapter.slot === 1 || S.get().chapters[id]) return true;
    const prev = CLASSES[home.grade].chapters[home.chapter.slot - 2];
    return Boolean(prev && S.get().chapters[prev.id]);
  }
  const slotChapter = (slot) => current()?.chapters[slot - 1] || null;
  const slotDone = (slot) => Boolean(slotChapter(slot) && S.get().chapters[slotChapter(slot).id]);
  const nextChapter = () => { const info = current(); return info ? (info.chapters.find((c) => !S.get().chapters[c.id]) || info.chapters[7]).id : null; };

  /** The whole interface is themed by the class, so the grade lives on <html> for CSS to read. */
  function paintTheme() {
    const id = grade();
    if (id) document.documentElement.dataset.class = id;
    else delete document.documentElement.dataset.class;
  }
  function apply(next) {
    S.update((s) => {
      for (const key of Object.keys(s)) if (!(key in next)) delete s[key];
      Object.assign(s, next);
      s.chapters = s.chapters || {};
      s.stars = s.stars || {}; s.minis ||= {}; s.best ||= {};
      s.facts = { frog: [], fireflies: [], guardian: [], ...(s.facts || {}) };
      if (s.choice === undefined) s.choice = null;
    });
  }

  function openPicker({ first = false } = {}) {
    return new Promise((resolve) => {
      const before = document.activeElement, dialog = document.createElement("dialog");
      dialog.className = "class-picker";
      dialog.setAttribute("aria-labelledby", "classPickerTitle");
      dialog.innerHTML = `<div class="cp-head"><p class="voyage-kicker">${first ? "BEFORE WE SET SAIL" : "CHANGE CLASS"}</p><h2 id="classPickerTitle">Which class are you in?</h2><p>Every class has its own island, eight story chapters and practice made for that grade. A grown-up can change this later in <b>Adults</b>.</p></div><div class="cp-grid">${CLASS_LIST.map((c) => `<button type="button" data-grade="${c.id}" aria-pressed="${c.id === grade()}"><span class="cp-emoji" aria-hidden="true">${c.emoji}</span><b>${esc(c.label)}</b><span class="cp-island">${esc(c.island)}</span><small>${esc(c.tagline)}</small>${c.id === grade() ? '<i>✓ Your class now</i>' : ""}</button>`).join("")}</div>${first ? "" : '<div class="cp-actions"><button type="button" class="btn secondary" data-close>Keep my class</button></div>'}`;
      const done = (value) => { dialog.close(); dialog.remove(); if (before?.isConnected) before.focus({ preventScroll: true }); resolve(value); };
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); if (!first) done(null); });
      dialog.addEventListener("click", (e) => {
        const pick = e.target.closest("[data-grade]");
        if (pick) { MQ.fx.sfx.good(); done(pick.dataset.grade); return; }
        if (e.target.closest("[data-close]")) done(null);
      });
      document.body.append(dialog);
      dialog.showModal();
      (dialog.querySelector('[aria-pressed="true"]') || dialog.querySelector("[data-grade]")).focus();
    });
  }

  function switchTo(next, { quiet = false } = {}) {
    if (!isGrade(next) || next === grade()) return;
    apply(grade() ? switchClass(S.get(), next) : assignFirstClass(S.get(), next));
    paintTheme();
    S.emit("classChanged", { grade: next });
    MQ.refreshHud();
    MQ.showMap();
    if (!quiet) window.MQUX?.toast(CLASSES[next].emoji, `Welcome to ${CLASSES[next].island}, ${CLASSES[next].label}!`);
  }

  async function ensureGrade() {
    if (grade()) return;
    const picked = await openPicker({ first: true });
    switchTo(picked, { quiet: true });
  }

  // A new player picks a class before the story starts; the hero picker and prologue follow.
  const prologue = window.MQStory.prologue;
  window.MQStory.prologue = async () => { await ensureGrade(); return prologue(); };

  const previous = MQ.start;
  MQ.start = function () {
    const seen = Boolean(S.get().prologue);
    previous();
    paintTheme(); // a returning player's saved class themes the interface before anything is drawn
    // Story chapters from before classes now open in their own class, in slot order.
    for (const level of MQ.levels) if (chapterHome(level.id)?.chapter.kind === "classic") level.canOpen = () => canOpen(level.id);
    // The Lantern Keeper certificate celebrates the original three-chapter story, which classes no longer share.
    const certificate = window.MQUX.certificate;
    window.MQUX.certificate = (noteFn) => (grade() ? Promise.resolve() : certificate(noteFn));
    // A returning player from before classes chooses a class once the title screen closes.
    if (seen && !grade()) {
      const watch = new MutationObserver(() => { if (!document.querySelector(".title-screen")) { watch.disconnect(); ensureGrade(); } });
      if (document.querySelector(".title-screen")) watch.observe(document.body, { childList: true }); else ensureGrade();
    }
  };

  window.MQClasses = { grade, current, canOpen, slotChapter, slotDone, nextChapter, switchTo, openPicker, ensureGrade, CLASSES, CLASS_LIST };
})();
