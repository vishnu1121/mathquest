// The visible companion perches in a corner of the screen and opens its help beside itself, so the child can
// read a hint and the question at the same time. AI receives game-owned context, never screen capture.
import { acceptCoach } from "../../ai/adventure/coach";

(function () {
  const MQ = window.MQ, S = window.MQS, start = MQ.start;
  const cap = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  const CORNERS = ["br", "tr", "tl", "bl"];
  const CORNER_NAMES = { br: "bottom right", tr: "top right", tl: "top left", bl: "bottom left" };
  /** Three hints: notice it, try something, then see a small example. */
  const MAX_HINTS = 3;
  const NEXT_LABEL = ["Ask Hoot for a hint", "One more hint", "Show me how"];
  let bird, panel, perches, controller, version = 0, lastKey = "", hints = [], still = false, corner = "br";
  /** A hand-drawn owl: a soft cream face, a friendly gaze, folded wings at rest, wings that beat in flight.
      Feet end at y=61 in this viewBox, which is where a branch has to be for Hoot to stand on it. */
  const OWL = `<svg class="rh-bird" viewBox="0 0 72 70" aria-hidden="true">
    <path class="rb-tail" d="M36 48 27 66l9-6 9 6Z"/>
    <ellipse class="rb-body" cx="36" cy="40" rx="18" ry="20"/>
    <ellipse class="rb-belly" cx="36" cy="45" rx="12" ry="14"/>
    <path class="rb-wing rb-wing-left" d="M26 29C12 31 2 44 4 61 13 56 23 47 29 38Z"/>
    <path class="rb-wing rb-wing-right" d="M46 29c14 2 24 15 22 32-9-5-19-14-25-23Z"/>
    <path class="rb-tuft" d="M28 12Q20 6 24 2 31 4 32 12Z"/><path class="rb-tuft" d="M44 12Q52 6 48 2 41 4 40 12Z"/>
    <circle class="rb-head" cx="36" cy="24" r="16"/>
    <ellipse class="rb-face" cx="36" cy="25" rx="14" ry="12.5"/>
    <path class="rb-brow" d="M24 17.5q5.5-4 11-1.2"/><path class="rb-brow" d="M48 17.5q-5.5-4-11-1.2"/>
    <circle class="rb-eye" cx="29.5" cy="24" r="5.6"/><circle class="rb-eye" cx="42.5" cy="24" r="5.6"/>
    <circle class="rb-pupil" cx="30" cy="24.4" r="2.9"/><circle class="rb-pupil" cx="43" cy="24.4" r="2.9"/>
    <circle class="rb-glint" cx="31.2" cy="23" r="1.2"/><circle class="rb-glint" cx="44.2" cy="23" r="1.2"/>
    <ellipse class="rb-cheek" cx="24.5" cy="30.5" rx="3.4" ry="2.2"/><ellipse class="rb-cheek" cx="47.5" cy="30.5" rx="3.4" ry="2.2"/>
    <path class="rb-beak" d="M36 28.5c-2.4 0-3.3 2.2-1.6 3.6.9.8 2.3.8 3.2 0 1.7-1.4.8-3.6-1.6-3.6Z"/>
    <path class="rb-foot" d="M30 56v5M42 56v5"/><path class="rb-toes" d="M27 61h6M39 61h6"/>
  </svg>`;
  /** Wind, because this is the button that sends Hoot flying. */
  const GUST = `<svg class="rh-gust" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 13h13a3 3 0 1 1-3 3"/><path d="M4.5 18h5.5"/></svg>`;
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.hasAttribute("data-calm");
  const activeSurface = () => [...document.querySelectorAll('dialog[open]:not(.hoot-coach), .mini, .story, .shop')].at(-1) || (!document.getElementById("levelScreen").hidden ? document.getElementById("stage") : document.getElementById("mapScreen"));
  const isOpen = () => bird?.dataset.open === "true";

  function visibleText(root) {
    if (!root) return "";
    return [...root.querySelectorAll('h1,h2,h3,p,output,[role="img"],button[aria-pressed="true"]')]
      .filter((el) => !el.closest(".roaming-hoot,.hoot-coach,#companion,[hidden],.scenery") && el.getClientRects().length)
      .map((el) => el.getAttribute("aria-label") || el.textContent).join(" · ").slice(0, 2000);
  }
  function snapshot() {
    const surface = activeSurface(), mini = surface?.closest(".mini"), dialog = surface?.matches("dialog,.story,.shop");
    const scene = !mini && !dialog ? window.MQCompanion.snapshot() : null;
    const info = window.MQClasses.current();
    const controls = [...(surface?.querySelectorAll("button,input[type=range]") || [])].filter((b) => b.getClientRects().length && !b.closest(".roaming-hoot,.hoot-coach,#companion") && !b.disabled).slice(0, 20).map((b) => b.getAttribute("aria-label") || b.textContent.trim()).join("; ");
    return { key: scene?.key || `${info?.id}:${surface?.id || surface?.className}`, onHelp: scene?.onHelp, solved: scene?.solved || false,
      grade: info?.id || "K", activity: cap(scene?.activity || surface?.querySelector("h1,h2,.mini-title")?.textContent || "Explore the island", 100),
      goal: cap(scene?.goal || surface?.querySelector("h2,h1")?.textContent || "Explore this class island", 500),
      board: cap(scene?.board ? `${scene.board}. ${scene.sees || ""}` : `${visibleText(surface)}. Available controls: ${controls}`, 2400),
      response: cap(scene?.response || "", 700), moves: (scene?.moves || []).slice(-6).map((m) => cap(m, 180)),
      protect: (scene?.protect || []).filter(Boolean).slice(0, 16).map((p) => cap(p, 100)), ref: scene?.ref || null };
  }
  const fingerprint = (s) => JSON.stringify([s.key, s.grade, s.goal, s.board, s.response]);
  function cancel() { version++; controller?.abort(); controller = null; if (bird) bird.dataset.thinking = "false"; }

  // ---------- Perching ----------
  const WIDTH = 72, HEIGHT = 96, EDGE = 24, TOP = 208, PERCH = 96;
  /** A flight is slow enough to watch: take off, glide across, land. Matches the CSS transition. */
  const FLIGHT = 2400;
  // clientWidth/Height, not innerWidth: a scrollbar must not push Hoot off the edge of the screen.
  const room = () => [document.documentElement.clientWidth, document.documentElement.clientHeight];
  function spot(which) {
    const [w, h] = room();
    return [which[1] === "l" ? EDGE : w - EDGE - WIDTH, which[0] === "t" ? TOP : Math.max(TOP, h - 118 - HEIGHT)];
  }
  /** The branch is centred on the spot its corner would put Hoot in, at foot height, so Hoot stands on it. */
  function branchBox(which) {
    const [px, py] = spot(which), left = px - (PERCH - WIDTH) / 2, top = py + 55;
    return { left, top, right: left + PERCH, bottom: top + 34 };
  }
  function place() {
    const [x, y] = spot(corner);
    bird.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    // The perches never move. One that would lie across text or a control steps aside instead.
    for (const perch of perches?.children || []) {
      const at = perch.dataset.corner, box = branchBox(at);
      perch.style.transform = `translate(${Math.round(box.left)}px, ${Math.round(box.top)}px)`;
      perch.dataset.lit = String(at === corner);
      // A sliver of a rounded corner is not a collision; a branch lying across the words is. 420px² of a
      // 96×34 branch is about an eighth of it.
      perch.hidden = occupied(box, SCENERY, 420);
    }
    // Feet grip a branch; with no branch under it Hoot tucks them up, the way a bird does in the air.
    bird.dataset.perched = String(!perches?.querySelector(`[data-corner="${corner}"]`)?.hidden);
  }
  function settle(next, { fly = true } = {}) {
    const from = corner;
    corner = CORNERS.includes(next) ? next : "br";
    bird.dataset.corner = corner;
    bird.querySelector(".rh-fly").setAttribute("aria-label", `Hoot is resting at the ${CORNER_NAMES[corner]}. Fly Hoot to the next perch`);
    if (!fly || calm()) { bird.style.transition = "none"; place(); requestAnimationFrame(() => bird.style.removeProperty("transition")); }
    else {
      // A bird turns to face where it is going, and only then sets off.
      if (from[1] !== corner[1]) bird.dataset.heading = corner[1] === "l" ? "left" : "right";
      place();
      if (from !== corner) { bird.dataset.flying = "true"; clearTimeout(settle.timer); settle.timer = setTimeout(() => { bird.dataset.flying = "false"; bird.dataset.heading = "rest"; }, FLIGHT); }
    }
    S.update((s) => { s.hoot = { corner, still }; });
  }
  /** Text the child is reading and controls it needs: a branch never lies across any of these. */
  const SCENERY = "button,input,select,label,h1,h2,h3,p,output";
  function occupied(box, selector, min = 0) {
    return [...document.querySelectorAll(selector)]
      .filter((e) => !e.closest(".roaming-hoot,.hoot-coach,.rh-perches") && e.getClientRects().length)
      .some((e) => {
        const r = e.getBoundingClientRect();
        const w = Math.min(r.right, box.right) - Math.max(r.left, box.left);
        const h = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
        return w > 0 && h > 0 && w * h > min;
      });
  }
  /** A corner is busy when a control the child needs sits under the owl or under the branch it would stand on. */
  function blocked(which) {
    const [x, y] = spot(which), CONTROLS = "button,input,select";
    return occupied({ left: x, top: y, right: x + WIDTH, bottom: y + HEIGHT }, CONTROLS) || occupied(branchBox(which), CONTROLS);
  }
  /** Where the help card would sit if Hoot perched in this corner. */
  function cardAt(which) {
    const [x, y] = spot(which), size = panel.getBoundingClientRect();
    const left = which[1] === "l" ? x : x + WIDTH - size.width;
    const top = which[0] === "t" ? y + HEIGHT + 14 : y - 14 - size.height;
    return { left, top, right: left + size.width, bottom: top + size.height };
  }
  /** Hoot only ever hops to the other corner on the side it is already on, so it stays where the child left it. */
  const sibling = () => `${corner[0] === "t" ? "b" : "t"}${corner[1]}`;
  function flyToFreeCorner() {
    if (still || isOpen() || !blocked(corner)) return;
    if (!blocked(sibling())) settle(sibling());
  }
  /** What the child is reading right now: the start of the mission line. */
  function readingPoint() {
    const text = document.querySelector("#cgPrompt, .fg-goal, .vg-mission h2, .mini-title, .gb-game h2");
    const box = text?.getBoundingClientRect();
    return box && box.width ? { x: box.left + 8, y: box.top + box.height / 2 } : null;
  }
  const covers = (box, point) => Boolean(point) && point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
  const moveOn = () => settle(CORNERS[(CORNERS.indexOf(corner) + 1) % CORNERS.length]);

  // ---------- Help ----------
  function close() {
    cancel();
    bird.dataset.open = "false";
    panel.hidden = true;
    bird.querySelector(".rh-ask").setAttribute("aria-expanded", "false");
    if (bird.isConnected) bird.querySelector(".rh-ask").focus({ preventScroll: true });
  }
  async function ask() {
    if (!isOpen() || controller) return;
    const s = snapshot();
    if (s.key !== lastKey) { hints = []; lastKey = s.key; panel.querySelector(".hc-history").replaceChildren(); }
    const source = panel.querySelector(".hc-source"), next = panel.querySelector(".hc-next");
    panel.querySelector(".hc-context").textContent = `${window.MQClasses.current()?.label || "Your island"} · ${s.activity}`;
    if (s.solved) { source.textContent = "You completed this task. Try the next mission when you’re ready."; next.disabled = true; return; }
    if (window.MQAI.status() !== "on") { source.textContent = "AI is not connected. A grown-up can connect Hoot in Adults → AI connection & data. You can keep playing."; next.textContent = "Check AI connection"; next.disabled = false; return; }
    if (hints.length >= MAX_HINTS) { source.textContent = "That was the last of three hints. Try it on your board; a new mission starts fresh."; next.disabled = true; return; }
    s.onHelp?.();
    const request = { grade: s.grade, activity: s.activity, goal: s.goal, board: s.board, response: s.response, moves: s.moves, protect: s.protect, ref: s.ref, step: hints.length + 1, previous: [...hints] };
    const before = fingerprint(s), token = ++version;
    controller = new AbortController(); next.disabled = true; source.textContent = "Hoot is looking at your game…";
    bird.dataset.thinking = "true";
    let raw = await window.MQAI.coach(request, controller.signal);
    let reply = acceptCoach(raw, { task: "coach", ...request });
    // A reply that breaks a rule is dropped, not shown. One quiet second try keeps help from feeling broken.
    if (!reply && token === version && isOpen()) {
      raw = await window.MQAI.coach(request, controller.signal);
      reply = acceptCoach(raw, { task: "coach", ...request });
    }
    if (token !== version || !isOpen()) return;
    controller = null; bird.dataset.thinking = "false"; next.disabled = false;
    if (fingerprint(snapshot()) !== before) { source.textContent = "Your game changed. Let’s look at what’s there now."; next.textContent = "Look again"; return; }
    if (!reply) { source.textContent = "Hoot couldn’t get a safe hint this time. You can try again or keep playing."; next.textContent = "Try again"; return; }
    hints.push(reply.hint);
    const item = document.createElement("li"), label = document.createElement("b"), noticed = document.createElement("p"), question = document.createElement("p");
    // The last step works an example for Grade 2 and up, and shows the method itself for the youngest classes.
    label.textContent = hints.length < MAX_HINTS ? `STEP ${hints.length} OF ${MAX_HINTS}`
      : `STEP ${hints.length} · ${s.grade === "K" || s.grade === "1" ? "SHOW ME HOW" : "AN EXAMPLE"}`;
    noticed.textContent = reply.notice; question.textContent = reply.hint;
    item.append(label, noticed, question); panel.querySelector(".hc-history").append(item);
    source.textContent = `AI hint · based on your current game${hints.length >= MAX_HINTS ? " · that was the last of three hints" : ""}`;
    next.textContent = NEXT_LABEL[hints.length] || "All three given";
    next.disabled = hints.length >= MAX_HINTS;
    item.scrollIntoView({ block: "nearest", behavior: calm() ? "instant" : "smooth" });
  }
  function open() {
    if (!bird || isOpen()) return;
    bird.dataset.open = "true";
    panel.hidden = false;
    bird.querySelector(".rh-ask").setAttribute("aria-expanded", "true");
    // The point of the card is to read the hint and the question together: try the other corners if it lands
    // over the question. Positions are tried on the element itself, so nothing is saved until one is chosen.
    const point = readingPoint();
    if (!still && point) {
      const start = corner, mirror = (c) => `${c[0]}${c[1] === "r" ? "l" : "r"}`;
      const clear = [start, sibling(), mirror(start), mirror(sibling())].find((c) => !covers(cardAt(c), point));
      if (clear && clear !== start) settle(clear);
    }
    panel.querySelector(".hc-close").focus({ preventScroll: true });
    ask();
  }
  function host() {
    if (!bird || isOpen()) return;
    const surface = activeSurface(), parent = surface?.matches("dialog,.mini,.story,.shop") ? surface : document.body;
    if (bird.parentElement !== parent) parent.append(bird);
    bird.hidden = !window.MQClasses.grade() || Boolean(document.querySelector(".title-screen,.hero-picker,.class-picker[open]"));
    // The perches belong to the screen edges, so they stay out of the way while Hoot is inside a dialog.
    if (perches) perches.hidden = bird.hidden || parent !== document.body;
    if (controller) cancel();
    flyToFreeCorner();
    place();
  }

  MQ.start = function () {
    start();
    const saved = S.get().hoot || {};
    still = Boolean(saved.still);
    bird = document.createElement("aside");
    bird.className = "roaming-hoot";
    bird.setAttribute("aria-label", "Hoot is here");
    bird.dataset.open = "false"; bird.dataset.still = String(still);
    bird.innerHTML = `<div class="rh-flight">
        <button type="button" class="rh-ask" aria-label="Ask Hoot for a hint" aria-haspopup="dialog" aria-expanded="false">
          <span class="rh-owl" aria-hidden="true">${OWL}</span><span class="visually-hidden">Hoot</span></button>
        <button type="button" class="rh-fly" aria-label="Fly Hoot to the next perch">${GUST}</button>
      </div>`;
    // The perches are scenery: four of them, always in the same place, with the lantern lit where Hoot is.
    perches = document.createElement("div");
    perches.className = "rh-perches";
    perches.setAttribute("aria-hidden", "true");
    perches.innerHTML = CORNERS.map((c) => `<span class="rh-perch" data-corner="${c}"><i class="rh-branch"></i><i class="rh-leaf"></i><i class="rh-lantern"></i></span>`).join("");
    document.body.append(perches);

    panel = document.createElement("div");
    panel.className = "hoot-coach";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "hootCoachTitle");
    panel.hidden = true;
    panel.innerHTML = `<header><div><p class="eyebrow">A LITTLE HELP, AT YOUR PACE</p><h2 id="hootCoachTitle">Let’s think together.</h2></div><button type="button" class="hc-close" aria-label="Close Hoot’s help">✕</button></header><p class="hc-context"></p><ol class="hc-history" aria-live="polite"></ol><p class="hc-source" role="status"></p><div class="hc-actions"><button type="button" class="btn hc-next">One more hint</button><button type="button" class="btn secondary hc-play">Let me try →</button></div><div class="hc-settings"><label class="hc-pin"><input type="checkbox"${still ? " checked" : ""}> Keep Hoot still</label><button type="button" class="hc-corner">Move Hoot to another corner</button></div>`;
    bird.append(panel);
    document.body.append(bird);
    settle(saved.corner || "br", { fly: false });
    host();

    bird.querySelector(".rh-ask").addEventListener("click", () => (isOpen() ? close() : open()));
    bird.querySelector(".rh-fly").addEventListener("click", moveOn);
    bird.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) { e.preventDefault(); close(); return; }
      // Arrow keys move the perch, so a keyboard player can clear the view too.
      const target = { ArrowLeft: `${corner[0]}l`, ArrowRight: `${corner[0]}r`, ArrowUp: `t${corner[1]}`, ArrowDown: `b${corner[1]}` }[e.key];
      if (target && e.target.matches(".rh-ask,.rh-fly")) { e.preventDefault(); settle(target); }
    });
    panel.querySelector(".hc-close").addEventListener("click", close);
    panel.querySelector(".hc-play").addEventListener("click", close);
    panel.querySelector(".hc-next").addEventListener("click", async () => { if (window.MQAI.status() !== "on") await window.MQAI.refreshStatus(); ask(); });
    panel.querySelector(".hc-corner").addEventListener("click", moveOn);
    panel.querySelector(".hc-pin input").addEventListener("change", (e) => {
      still = e.target.checked; bird.dataset.still = String(still);
      S.update((s) => { s.hoot = { corner, still }; });
    });
    for (const id of ["hootBtn", "companionHelp"]) document.getElementById(id).addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); open(); }, true);

    let hostTimer = null;
    new MutationObserver(() => { if (hostTimer === null) hostTimer = setTimeout(() => { hostTimer = null; host(); }, 80); }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", () => { settle(corner, { fly: false }); flyToFreeCorner(); });
    S.on("classChanged", () => { close(); hints = []; lastKey = ""; host(); });
    window.MQHoot = { open, close, snapshot, moveOn, corner: () => corner };
  };
})();
