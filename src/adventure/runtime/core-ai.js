// AI layer for the adventure (browser side). It calls the app's /api/adventure-ai route, which holds the
// Claude API key, runs the prompts and checks every reply with code. A missing key, an error, a refusal or
// a slow reply all fall back to built-in content, so the game never waits on AI.
(function () {
  const PRESETS = {
    forest: { world: "Addition Forest", hopper: "🐸", hopperName: "Frog", glow: "✨", glowOne: "firefly", glowName: "fireflies", guardian: "🌳", guardianName: "Forest Guardian", palette: "forest", intro: "Hop the river, light the lantern, and wake the Forest Guardian!" },
    dinos: { world: "Dino Valley", hopper: "🦖", hopperName: "Dino", glow: "💎", glowOne: "gem", glowName: "gems", guardian: "🌋", guardianName: "Volcano Guardian", palette: "volcano", intro: "Stomp across the lava stones, collect glowing gems, and cool down the Volcano Guardian!" },
    space: { world: "Star Station", hopper: "🤖", hopperName: "Robo", glow: "⭐", glowOne: "star", glowName: "stars", guardian: "👾", guardianName: "Space Guardian", palette: "space", intro: "Jump between moon rocks, catch shooting stars, and outsmart the Space Guardian!" },
    ocean: { world: "Coral Reef", hopper: "🐢", hopperName: "Turtle", glow: "🫧", glowOne: "bubble", glowName: "bubbles", guardian: "🏰", guardianName: "Reef Guardian", palette: "ocean", intro: "Paddle across the reef, pop magic bubbles, and win the Reef Guardian's challenge!" },
    candy: { world: "Candy Land", hopper: "🐰", hopperName: "Bunny", glow: "🍬", glowOne: "candy", glowName: "candies", guardian: "🏰", guardianName: "Candy Guardian", palette: "candy", intro: "Bounce over gumdrops, match sweet candies, and wake the Candy Guardian!" },
  };
  const NPCS = {
    forest: { npc: "Ollie the Otter", npcEmoji: "🦦" },
    volcano: { npc: "Rex Junior", npcEmoji: "🦕" },
    space: { npc: "Zip the Alien", npcEmoji: "👽" },
    ocean: { npc: "Shelly the Crab", npcEmoji: "🦀" },
    candy: { npc: "Gummy the Bear", npcEmoji: "🧸" },
  };
  for (const preset of Object.values(PRESETS)) Object.assign(preset, NPCS[preset.palette]);
  const CHIPS = [["forest", "🌳", "Forest"], ["dinos", "🦖", "Dinosaurs"], ["space", "🚀", "Space"], ["ocean", "🐢", "Ocean"], ["candy", "🍭", "Candy"]];
  const ENDPOINT = "/api/adventure-ai";

  // ---------- Availability ----------
  let status = "checking";
  // The step-by-step explainer answers on a separate provider account, so it is tracked separately: it can
  // be on while the rest of the AI is off, or off while the rest is on. The game hides its button rather
  // than offering a control that cannot answer.
  let explainStatus = "checking";
  // Fresh question generation answers on its own PAIR of accounts (primary then secondary), so it too is
  // tracked apart: it can be on while everything else is off, and a spent generation key must never be
  // able to switch off hints, coaching or Story Lab.
  let generateStatus = "checking";
  const statusListeners = new Set();
  const explainListeners = new Set();
  const generateListeners = new Set();
  const setStatus = (s) => {
    status = s;
    statusListeners.forEach((fn) => fn(s));
  };
  const setExplainStatus = (s) => {
    explainStatus = s;
    explainListeners.forEach((fn) => fn(s));
  };
  const setGenerateStatus = (s) => {
    generateStatus = s;
    generateListeners.forEach((fn) => fn(s));
  };
  const readStatus = (d) => {
    setStatus(d && d.enabled ? "on" : "off");
    setExplainStatus(d && d.explain ? "on" : "off");
    setGenerateStatus(d && d.generate ? "on" : "off");
  };
  fetch(ENDPOINT, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { enabled: false, explain: false, generate: false }))
    .then(readStatus)
    .catch(() => readStatus(null));

  const channelStatus = (task) => (task === "explain" ? explainStatus : task === "generate" ? generateStatus : status);
  const switchOff = (task) => (task === "explain" ? setExplainStatus : task === "generate" ? setGenerateStatus : setStatus)("off");

  async function ask(body, signal, { timeout = 10000 } = {}) {
    if (channelStatus(body.task) !== "on") return null;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
    const cancel = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const json = await res.json().catch(() => null);
      if (json && json.ok) return json.data;
      // Only switch off the channel that actually answered, or one dead key would silence the others.
      if (json && json.reason === "unavailable") switchOff(body.task);
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer); signal?.removeEventListener("abort", cancel);
    }
  }

  const cap = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  const list = (items, maxItems, maxChars) => (items || []).slice(-maxItems).map((s) => cap(s, maxChars)).filter(Boolean);
  const wholeNumbers = (items) => (items || []).filter((n) => Number.isInteger(n) && n >= 0 && n <= 9999).slice(0, 24);
  const themeFields = (t) => ({
    world: cap(t.world, 40),
    hopperName: cap(t.hopperName, 24),
    glowName: cap(t.glowName, 24),
    guardianName: cap(t.guardianName, 40),
    npc: cap(t.npc, 40),
  });

  // ---------- Tasks (same names the game scripts already use) ----------
  const makeWorld = (idea, base = PRESETS.forest) =>
    cap(idea, 60)
      ? ask({ task: "world", idea: cap(idea, 60), base: { hopper: base.hopper, glow: base.glow, guardian: base.guardian, palette: base.palette } })
      : Promise.resolve(null);

  const hint = ({ game, goal, moves, allowed }) =>
    ask({ task: "hint", game: cap(game, 320), goal: cap(goal, 320), moves: list(moves, 8, 140), allowed: wholeNumbers(allowed) });

  const riddle = ({ a, b, theme }, signal) => ask({ task: "riddle", a, b, theme: themeFields(theme) }, signal);

  const teach = ({ mistakeId, said }) => (cap(said, 200) ? ask({ task: "teach", mistakeId, said: cap(said, 200) }) : Promise.resolve(null));

  function strategy({ problem, said }) {
    const m = /(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/.exec(problem || "");
    if (!m || !cap(said, 200)) return Promise.resolve(null);
    return ask({ task: "strategy", a: Number(m[1]), b: Number(m[2]), answer: Number(m[3]), said: cap(said, 200) });
  }

  const narrate = ({ moment, theme, did, choice }) =>
    ask({ task: "narrate", moment: cap(moment, 400), theme: themeFields(theme), did: list(did, 8, 160), choice: cap(choice, 160) });

  function journeyNote({ lines }) {
    const facts = list(lines, 12, 160);
    return facts.length ? ask({ task: "journey", lines: facts }) : Promise.resolve(null);
  }

  // ---------- Theme state ----------
  let theme = { id: "forest", ...PRESETS.forest };
  const themeListeners = new Set();

  window.MQAI = {
    PRESETS,
    CHIPS,
    NPCS,
    status: () => status,
    refreshStatus: () => fetch(ENDPOINT, { cache: "no-store" }).then(res => res.ok ? res.json() : { enabled:false, explain:false, generate:false }).then(readStatus).catch(() => readStatus(null)),
    explainStatus: () => explainStatus,
    onExplainStatus: (fn) => { explainListeners.add(fn); fn(explainStatus); return () => explainListeners.delete(fn); },
    generateStatus: () => generateStatus,
    onGenerateStatus: (fn) => { generateListeners.add(fn); fn(generateStatus); return () => generateListeners.delete(fn); },
    /**
     * One fresh question to replace a built-in one. `spec` is built by classes-side code from the question
     * the game was ABOUT to show, so nothing a child typed is in it. The reply is `{ task, fingerprint }`
     * or null, and null is ordinary: the caller is already holding the built-in question.
     *
     * The timeout is long because this is never on the critical path — it runs while the child is still
     * answering the previous question, and giving up early would only mean more built-in questions.
     */
    generate: (spec, signal) => ask(spec, signal, { timeout: 20000 }),
    /**
     * "You wanna know how?" — a step-by-step walk-through of a question the child has ALREADY answered
     * and the game has ALREADY scored. `answer` is the answer the code computed, not something the model
     * works out; the server drops any reply whose closing line does not restate it.
     */
    explain: (q, signal) => ask({
      task: "explain",
      grade: q.grade,
      skill: cap(q.skill, 80),
      question: cap(q.question, 300),
      answer: cap(q.answer, 80),
      given: cap(q.given, 80),
      firstTry: Boolean(q.firstTry),
      board: cap(q.board, 600),
    }, signal),
    onStatus: (fn) => {
      statusListeners.add(fn);
      fn(status);
      return () => statusListeners.delete(fn);
    },
    theme: () => theme,
    setTheme: (next) => {
      theme = { ...NPCS[next.palette], ...next };
      themeListeners.forEach((fn) => fn(theme));
    },
    onTheme: (fn) => themeListeners.add(fn),
    makeWorld,
    hint,
    riddle,
    teach,
    strategy,
    narrate,
    journeyNote,
    coach: (snapshot, signal) => ask({ task: "coach", ...snapshot }, signal),
    // Muddle Monster Arena: classify a wrong answer, and ask Hoot's one-sentence question about the child's current work.
    diagnose: (problem, answer, signal) => ask({ task: "diagnose", problem, answer: cap(answer, 9) }, signal),
    companion: ({ moment, problem, wrongAnswers, code, tier, bossStep }, signal) =>
      ask({ task: "companion", moment, problem, wrongAnswers: (wrongAnswers || []).slice(-3).map((a) => cap(a, 9)), code: code || null, tier, bossStep: bossStep || null }, signal),
  };
})();
