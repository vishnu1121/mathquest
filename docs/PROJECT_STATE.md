# MathQuest: project state and handoff

Last updated: **2026-09-18**. Written for AI coding agents (Codex, Claude Code) and humans picking up the work. Read this before changing code.

---

## START HERE — session handoff, 2026-09-18

**Where the code is.** Branch `fix/guardian-scene-layout`, 44 uncommitted/untracked paths. **Nothing has been committed or pushed**, on purpose: the owner has not asked for it. Do not commit, push or deploy without being told. `.env*`, `debug.log` and `test-results/` must never go into a commit.

**Two agents have been working in this tree at once.** Claude Code wrote most of what is listed below; a concurrent agent added `src/adventure/styles/natural-world.css` and `public/art/*.svg`, which now own the sea's colour, the HUD/nav palette, and a `learning-grove.svg` backdrop on class boards. **Preserve both.** If a change of yours seems to be "not applying", check specificity against `natural-world.css` before assuming a build problem — that is exactly what caused the long-running island-box bug.

**The trustworthy gate** (all green as of this entry):

```
npm run check                 # typecheck, lint, 48 files / 414 tests, licence audit
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:classes     # 247 class questions
npm.cmd run smoke:grade-play   # six classes, arenas, bonus games, phone
npm.cmd run smoke:models       # operand models, factor rows, Practice maths cards
npm.cmd run smoke:adventure    # no JS errors
npm.cmd run smoke:explain      # "You wanna know how?" on all four question surfaces
npm.cmd run smoke:apex         # Apex Mode, the gems, AI questions, 7-tab phone layout
```

**Known-failing, and why — do not treat as regressions.** Seven older suites assert UI this work replaced; the table further down names each one. The ones most likely to be run by accident:

| Suite | Fails at | Cause |
|---|---|---|
| `smoke:arcade`, `smoke:learning`, `smoke:complete` | `.fly` count 0 | Kindergarten's moving Fireflies became stationary Firefly Homes |
| `smoke:voyage` | `adventure-voyage.mjs:137`, `state.minis` undefined | bonus records moved to per-class storage |

**Open decisions the owner has not made.** Do not decide these unilaterally:

1. **The seven stale suites** — update them to the current UI, or retire them explicitly. This is the last real loose end; a judge or future agent reading a red suite cannot tell drift from breakage.
2. **`learning-grove.svg` on class boards.** The owner asked for plain question backgrounds and Claude Code's own scenic backdrop was removed, but the concurrent agent's grove backdrop is still active, so those screens are not actually plain. Flagged to the owner, awaiting their call.

**Owner preferences learned this session, worth honouring:**

- Wants it to feel like a **game, not a website**. Rejected flat, decorative and "AI-slop" treatments twice by name.
- Rejected scenic backgrounds behind questions; prefers plain. Do not re-add without being asked.
- Removed the sea creatures from the island map. `seaLife()` still exists in `voyage-art.js`, exported but uncalled. Do not reinstate without being asked.
- Verify visually before claiming a UI fix. Several reports ("the coordinates still show the same", "the box is still there") were a stale page or a state not reproduced — measure at the owner's actual viewport rather than assuming.

**Environment.** Dev server on port 3001 (**3000 belongs to another project**). Live AI is configured in `.env.local` (git-ignored) against Groq free tier, `openai/gpt-oss-120b`; browser suites always mock or disable AI and make no paid calls. A `21st` MCP server was registered this session (`~/.claude.json`, project scope) — note the project **cannot use Tailwind** (lightningcss is MPL-2.0, banned by Rule 7.6) and has no component library, so generated components would need rewriting and must clear `npm run audit:licenses`.

---

## Latest change: AI-written questions and Apex Mode (Claude Code, 2026-09-18)

Owner direction, in their words: *"AI to dynamically generate questions during gameplay so students do not repeatedly see the same questions when replaying quests"*, with a **Primary AI → Secondary AI → stored questions** fallback where *"gameplay must NEVER stop because an AI provider fails"*; and **Apex Mode**, *"available ONLY for Grades 3, 4 and 5"*, unlocked after every normal quest of that grade, reusing the same quests at maximum current-grade difficulty, with a hidden **rare-gem treasure hunt** ending in **the Nova Gem**.

### 1. Fresh questions — the model shows its work, and the server runs it

Every other AI task in this game hands the model an answer the code already computed. Generation is the first one that runs the other way, so it is the first place a model could put a wrong answer in front of a child. The rule that makes it safe: **the model is not believed about the answer.** It must return its working as a small flat program —

```json
{ "prompt": "…", "answer": "50", "work": [ {"op":"*","a":"7","b":"8"}, {"op":"-","a":"r0","b":"6"} ], "hint": "…", "explain": "…", "options": [] }
```

— and `src/ai/adventure/generate.ts` executes it in **exact rational arithmetic** (`{n, d}`, never floats: `0.1 + 0.2` is not `0.3`, and a fraction compared in floats is a coin toss at the fourth decimal place). The question is dropped unless the last step equals the answer the model declared. `acceptGenerated` applies its checks in order; the ones that matter beyond the shape:

- **the gate** — the work's result must equal the declared answer, compared as exact rationals;
- every literal the work used must be a number the **prompt actually shows** (a number the model invented makes the question unsolvable as written even when the arithmetic checks out) — quantities named in words ("half", "a dozen", "twice") count as shown;
- the prompt must not **print its own answer**, unless that number is also an input it still has to do something with;
- no step may go **below zero** at any point — no grade from K to 5 works with negative numbers;
- `skill`, `format` and `unit` are the ones the **game** asked for, never the model's: the learner model is keyed on `skill`;
- the visual is forced to one emoji from a fixed list, option order is shuffled by a seeded Rng, and the finished object must pass the same `validateTask` every built-in question passes — plus, in the browser, `checkTask(task, correctResponse(task))`, so "See a worked example" can never hand a child a losing answer.

**The built-in question is both the brief and the fallback.** `specFromTask` takes the question the code was about to draw and sends it as the specification — grade, skill, answer format, number ceiling — so the generated question is provably on-topic and on-grade. Nothing of it is shown to the child; it is simply what gets drawn if anything below says no.

**Nothing is ever awaited by the screen.** `runtime/question-source.js` prefetches: while a child works on question 2, question 3 is being written. **Question 1 is always the built-in one** — there is no cutscene to hide a fetch behind, and a spinner before a child's first question is the wrong trade. Its numbers are fresh anyway, because the chapter seed is new on every visit. *Anyone judging this feature by opening a chapter and reading the FIRST question will conclude it does not work.*

**What it can reach, measured** (`generate.test.ts` pins these as floors). A question whose answer lives in a **picture** — ten frame, clock, coins, array, fraction bar, base-ten blocks, a world puzzle — is never sent, because it cannot be restated in words without becoming a different and worse question. What is left is the written work:

| | K | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|---|
| chapters & practice | 5% | 23% | 20% | 20% | 43% | 57% |
| Apex quests | — | — | — | 53% | 45% | 68% |

Kindergarten is nearly all touching and counting, and that is the right answer for five-year-olds. **Not wired:** Story Lab (its `dress()` rewrites prompt text after the fact, so a question checked before that rewrite is not the one drawn), the Arena (picks its own question by rating), voyage missions and learning trails (puzzle mechanics, not question banks).

**The chain.** Two new provider channels, `gen` then `gen2` (`GEN_AI_*` / `GEN2_AI_*`, documented in `.env.example`). `generateChain.ts` tries them in order; a dead key, a rate limit, a timeout, a malformed reply and a reply whose arithmetic did not check out are all the same failure — try the next, then use the bank. The throw is **swallowed rather than rethrown**, because the route turns a 401 into "AI is off for this session", and a spent free-tier generation key must never be able to silence hints, coaching and Story Lab. `CHAIN_BUDGET_MS` (9s) stops the second account being spent on an answer nobody is still waiting for. Own rate-limit bucket (`${client}|gen`). **No fallback to the default or explain keys** — generation is one call per question answered, the highest-volume task in the game.

### 2. Apex Mode — Grades 3–5, after the island is finished

`src/adventure/classes/apex.ts` (pure, seeded, tested) + `runtime/apex.js` + `styles/apex.css`.

- **K, 1 and 2 never see it.** Not locked, not greyed out: the tab is not in their navigation and no Apex level is registered for them. A direct `openLevel` is a silent no-op because `level.grade` does not match the class.
- **Unlocks** when every chapter of that class is done. Before that the panel says how many are left and offers a way to the next one.
- **Eight quests** — the class's own eight chapters, in order, ids `apex-<chapterId>`, deliberately **outside the catalog** so nothing that counts eight chapters ever sees them. All eight slots including the *classic* chapters: Grade 3 has three of those, and skipping them would have shipped a five-quest Apex and broken the Nova gate.
- **Difficulty is enforced in code, not asked for in prose:** `minSteps: 2` on every generated Apex question, and the built-in fallback draws each chapter's hardest generators, with rounds 4 and 5 bringing in a different chapter from the same class so a quest ends by combining topics. **Apex is fully playable with AI off.**
- **Stretch questions** (one grade up) are chosen **by position, by code** — `isStretchRound` — never requested from the model: 4 of 40 rounds at Grades 3–4 (10%), 3 of 40 at Grade 5 (7.5%, because one grade up from Grade 5 is middle school), and never two in a row. A stretch round is **labelled to the child** ("↗ LOOK AHEAD", plus a line saying it cannot count against them) and is **excluded from `recordClassWork`**: it carries the skill id of the current-grade question it replaced, so recording it would file next year's work under this year's skill and quietly drag down a grown-up's report.

### 3. The treasure

Seven gems named for rare-earth elements, plus the Nova. **Rarity is earned, never diced** — a child who three-stars every quest and holds three gems because dice went against them learns that effort does not pay, and the economy becomes untestable.

| Quest | Gem | Named after | Needs |
|---|---|---|---|
| 1 | Luna Gem | Lanthanum | finish it |
| 2 | Cerium Sun Gem | Cerium | 3 of 5 first-try |
| 3 | Prism Gem | Praseodymium | finish it |
| 4 | *(nothing at all)* | | |
| 5 | Terra Spark Gem | Terbium | 3 of 5 first-try |
| 6 | Yttrium Crystal | Yttrium | finish it |
| 7 | Europium Glow Gem | Europium | 4 of 5 first-try |
| 8 | Neo Star Gem | Neodymium | 4 of 5 first-try |
| all eight cleared | **The Nova Gem** | — | finish every Apex quest |

A gem that is not earned stays buried, and the result card says *"something is still humming under Anvil Row"* — never what it needs. The vault shows found gems with a one-line element fact, anonymous silhouettes for the rest, and a remaining count; the Nova is the one unfound gem that **is** named, because it is the goal, not a secret. Rarity is written on each card ("· rare", "· very rare", "· the rarest"), never carried by colour alone. Finishing every quest opens a two-beat island reveal and the Nova. `apex` is a **per-class** `CLASS_FIELD`, so Grade 5 does not inherit Grade 3's treasure.

The panel keeps the game's own daylight palette — a first pass made it a dark screen and that was wrong: the brief asked for the existing visual style, and a dark mode is a different design language. Only the vault and the two reveal moments go deep and jewelled, and those are modal: a cave you step into and come back out of.

### Verification

`npm run check` — **47 files / 404 tests**, lint clean, no forbidden licences. Six browser suites pass **by their success lines** (not by exit code, which a `for` loop over suites swallows): `smoke:classes`, `smoke:grade-play`, `smoke:models-story`, `smoke:adventure`, `smoke:explain`, and the new **`smoke:apex`** — which proves K/1/2 have no Apex at all, that it stays shut until the island is done, that a generated question reaches the board, that a rejected or structurally broken one never does, that play is identical with AI off, the whole eight-quest journey to the Nova Gem, per-class treasure, and **seven navigation tabs measured at 360/400/768px** (smallest tab 48×56px at 360px, no overflow). The seventh tab replaces two hard-coded `/6` divisions in `arena.css` with flex, behind a `[data-apex]` attribute so six-tab classes are untouched.

**Live provider calls HAVE now been made for generation** — see the next section. Both supplied accounts work and the feature is on in `.env.local`.


### Live verification, 2026-09-18 — both accounts, real calls

Two Groq accounts were supplied by the owner and wired as `GEN_AI_*` (primary) and `GEN2_AI_*` (secondary) in `.env.local`. **Both authenticate** (385ms / 281ms, 1000 requests/day each). Run `node scripts/live-question-check.mjs` to repeat this; it is deliberately outside `npm run check` and outside every smoke suite, because it spends real quota.

**Questions are genuinely fresh on replay.** Playing `g5-cargo` twice, back to back: **0 of 5 questions identical**, 10 of 10 distinct across both plays. Same for Apex. A sample from `apex-g5-cargo`:

> *"Captain Maya's cargo ship can carry 7 containers. She has already loaded 2 containers, each holding 73 crates. After loading, the ship contains a total of 566 crates. How many crates are in each of the remaining containers?"*
>
> *"A container holds 1 cup of sugar. Jamie needs 5/6 cup in his bowl and has already poured 1/3 cup. After he adds the amount he still needs, how much sugar will remain in the container?"*

Those are three-step, work-backwards questions against a built-in round of `Multiply: 584 × 142` — which is the Apex brief working as specified.

**A real bug was found and fixed by this run: the reply budget.** `openaiCompatible.ts` hard-coded `max_tokens: 1024`. On a reasoning model the thinking counts against that ceiling too, and a question-writing request — long brief, a worked program to produce, Apex's extra rules on top — reasons past it, so the JSON arrives truncated and Groq rejects it with **HTTP 400 before this code ever sees the reply**. Measured: **five Apex requests in six failed that way**, which is why the first live Apex run produced zero generated questions and looked like a broken feature. `settings()` now carries a per-channel `maxTokens`, and the two writer channels get 3000. After the fix, the same probe accepted **five of six**, with zero 400s.

**On accept rates, and how to measure them.** An unthrottled burst measures the rate limiter, not the writer: a 30-request burst returned 18 × HTTP 429 and read as a 10% accept rate. Paced properly, of the replies that actually arrive **roughly three in four survive the guard**. Real play is nowhere near the limit — one request per question answered, with a child thinking for half a minute in between, is about two requests a minute.

**Still expected to fall back, by design:** questions whose answer is not reachable by arithmetic over the numbers printed in the prompt — rounding, "the value of the 2 in 981,264", "write 7/10 as a decimal", quotient-with-remainder (`format: "remainder"` is not a generated format at all). Those quietly draw from the bank, which is the correct outcome; tightening `specFromTask` to skip those skills outright would save quota and raise the hit rate, and is the obvious next tuning step.

**The keys in `.env.local` are git-ignored but were pasted in a chat transcript. They should be rotated before this is shown publicly.**

### The way in, and a name (2026-09-18)

Owner: *"remove this starting page and just put the logo and a box which says type your name and then reveal the next page in a flow. the names goes in place of \"you\" under our character."*

The splash page sold the game to somebody who had already opened it. It is replaced by the lantern mark and one question — **"What should we call you?"** — a text box, and the same *Start / Continue the adventure* button, which then flows into the class picker exactly as before.

**The name never leaves the device.** It is written to `mq.playtest.v3` alongside everything else, and it is not part of any request this game makes: every AI request in `runtime/core-ai.js` is built field by field from game state, never from the save, so there is nothing to audit away. It is cleaned on the way in — letters, marks, spaces, hyphens and apostrophes only, collapsed and capped at 14 characters — and **skipping is a real option** that costs nothing: the hero is labelled YOU, as before.

This is worth flagging against the project's own rule that learner state stays on the device and the game asks for no real child data. A first name is child data. It stays local, it is optional, it is capped, and it never reaches a provider — but it is a change of policy rather than a detail, and the owner asked for it explicitly.

`.title-screen` is kept as the outer class on purpose: `accessibility.js` inerts it, `roaming-hoot.js` hides the owl behind it, and `classes.js` waits for it to leave before offering the class picker. The button keeps its old label so every browser suite that walks the entry flow still finds it.

The name is drawn where the hero stands on the island (`voyage-world.js`, in place of `YOU`), upper-cased and escaped.

**The name is asked once (2026-09-18).** The first version showed the name box on *every* load, so a
returning child met a form before their island every single time — the owner reported it as "a page is
landing before the home page", and it was. `ux.js` now records `greeted` when the question is answered,
by typing a name **or** by skipping, and a greeted save goes straight to the map. Two consequences worth
knowing: a grown-up can correct or clear the name from the Adults panel, which is the only way back to
it; and **every browser suite's entry click is now optional** (`.click({timeout:4000}).catch(() => {})`),
because a suite that reloads part-way through will not be asked a second time. That bit down
`smoke:grade-play` before it was caught.

### ?demo=1

`?demo=1` sets the same `unlockAll` flag the hidden "Playtest: unlock all chapters" button sets, so every chapter — and with it Apex — opens for a recording or a walkthrough. It changes nothing about how progress is *earned*; clear it with `MQS.update(s => s.unlockAll = false)`.

### Story Lab removed, and the Practice view given a reference instead (2026-09-18)

Owner: *"I want to remove the entire story lab, it does not make sense to our game as our game already has story, also its consuming unnecessary tokens"*, and *"remove this change world in the practice thing"*.

**Gone:** the Story Lab tab and panel, its cutscenes, its adventure book, and the AI `mission` task behind it — `runtime/story-studio.js`, `runtime/story-scenes.js`, `runtime/dream-lab.js` (already-unloaded legacy), `classes/storyLab.ts` and its test, `styles/story-lab.css`, plus `MISSION_SYSTEM`/`missionMessage`/`missionOutput`/`acceptMission` and the route case. The world maker went with it: `#questMaker`, its renderer in `map.js`, the "Change your world" drawer in `ux.js`, and the now-unearnable **World Builder** badge (the HUD denominator moves 22 → 21; `refreshHud` computes it, so only Shell's placeholder needed changing).

**Kept on purpose.** The theme system (`MQAI.theme()`, the five palettes) stays — the scenery, the map decoration and the riddle prompts all read it; only the UI that *changed* the theme is gone. `storyShelf`, `storyLevel` and `dreamProgress` stay in `CLASS_FIELDS`: nothing writes them now, and leaving them means an existing save's class switching behaves exactly as before. The `world` AI task is still wired but is no longer reachable from any screen — it costs nothing, and removing it is a tidy-up rather than a fix.

**One real break, found by the suites and not by reading.** `class-games.js`'s "next question" handler still called `openRound()`, the wrapper that used to play a Story Lab cutscene before each act. Removing the cutscene removed the function, and every chapter silently stopped advancing past question 1. `smoke:classes` caught it on the first run. The lesson is the ordinary one: a removal is not finished when the feature is gone, only when the suites that walk the surrounding code still pass.

**Suites.** `smoke:models-story` was two suites in one file; its Story Lab half went and its operand-model half became **`smoke:models`** (place-value columns against the real operands, factor rows, phone layouts, and now the maths cards). The Story Lab blocks also came out of `smoke:grade-play` and `smoke:frontier` — note `smoke:frontier` still fails earlier, at the orchestra bonus, for a pre-existing reason unrelated to this work.

### Maths cards in the Practice view

Owner: *"add some flash cards or some math rules appropriate for the grade for the student to refer... No AI is needed, just static. Make sure if the references are valid and relevant."*

`classes/reference.ts` holds 6–8 cards per class: one idea, one rule in a sentence, one worked example. `runtime/reference-cards.js` draws them into the Practice view, exactly where the world maker used to be. The rule is on the front and the example is one tap away, because a child who already knows the rule should not have to read the example and a child who does not should not have to hunt for it. There is a "show every example" toggle, and that choice survives a class switch.

**Valid and relevant are both checked, not claimed.** `reference.test.ts`:

- **re-solves every equation in every worked example** in exact arithmetic — it finds each `A = B` where both sides are numbers or same-operator chains (fractions included) and asserts they balance. A typo in a card fails the build.
- refuses a set that only *describes* maths: more than 60% of cards, and at least 3 per grade, must contain an equation the test actually checked.
- checks **relevance against the class's own chapters**: each card carries a domain (`4.NF`, `3.MD`…) that must appear in the standards text those chapters already cite, so a Grade 3 card cannot quietly carry Grade 5 content, and each class must span at least three domains.
- holds the copy to card length, and keeps it free of markup.

No provider is involved at any point.

### Eight accounts, four jobs, 2026-09-18

The owner supplied four more Groq keys. Every AI job now has a first-choice account and an **understudy**,
paired in `src/ai/adventure/chain.ts`:

| Job | Accounts | Carries |
|---|---|---|
| general | `AI_*` / `AI2_*` | coaching, Story Lab missions, narration, riddles, Teach Pip, diagnosis, Hoot's companion line |
| hints | `HINT_AI_*` / `HINT2_AI_*` | Hoot's hints — the helper a stuck child reaches for most |
| explainer | `EXPLAIN_AI_*` / `EXPLAIN2_AI_*` | "You wanna know how?" |
| questions | `GEN_AI_*` / `GEN2_AI_*` | fresh questions, one per question answered |

All eight authenticate; roughly 8,000 free-tier requests a day in total. A free-tier key does not fail
politely — it runs out mid-lesson — so the understudy is what keeps a feature alive until somebody notices.

`askChain` is the one place that logic lives. It asks each account in turn and takes the first reply the
**task's own validator** accepts, so a reply that parses but fails the guard is treated exactly like a
provider that did not answer — which matters, because "the model wrote something unusable" is far more
common than "the key is dead", and a second sample often fixes it. Errors are held rather than swallowed:
if every account throws, the last error is rethrown so the route can still tell a dead key from a busy one.
Generation alone passes `quiet`, because the browser is already holding the built-in question and a
generation outage is not something a child should ever be told about.

Two details worth keeping:

- **Hints fall back to the general accounts when no hint account is configured.** The isolation is worth
  having — a class leaning on Hoot should not spend what Story Lab needs — but it must never be the reason
  hints stop working on an install set up before `HINT_AI_*` existed. `hintChain()` decides per request.
- **The explainer's chain is `[explain, explain2, explain]`.** The third attempt is not padding: the
  closing-line guard is strict, about one reply in ten closes on a paraphrase and is correctly dropped, and
  sampling again fixes most of those. Naming the primary twice keeps that second chance on an install with
  only one explainer account.

Each lane also keeps its own rate-limit bucket (`local|hint`, `local|explain`, `local|gen`). Verified live:
a hint came back through the dedicated account as *"What if you add 24 crates 36 times?"* — a nudge toward
repeated addition with the answer withheld, which is what `acceptHint` is there to enforce.

One test had to be corrected rather than accommodated: `explain.route.test.ts` mocked availability as
`channel !== "explain"` as shorthand for "only the main key is set", and a new `explain2` channel made that
shorthand silently wrong. It now names the account it means.

**Two fixes to shared AI code came out of this work.** `anthropic.ts` cached ONE client for the whole process, so a second Anthropic-backed channel silently billed and authenticated against whichever key called first — the cache is now keyed by key. And `provider.ts` offered `ANTHROPIC_API_KEY` as a stand-in for a missing `AI_API_KEY` *whatever the provider was*, which would send an Anthropic key as a bearer token to Groq or OpenRouter; the shorthand is now Anthropic-only.

**Known and accepted:** the answer-equality gate cannot catch an *ambiguous* prompt — a question with two defensible readings that happen to share the model's answer passes every check. The worst case is a confusing question, never a wrongly-marked child, because scoring is still `checkTask` against the task actually shown, and "See a worked example" and "You wanna know how?" are both still there.

---

## Latest change: grade theme tokens (Claude Code, 2026-09-18) — FOUNDATION ONLY, NOT A FINISHED REDESIGN

Owner direction: a full UI/UX overhaul with a six-grade colour system, a maturity curve from Kindergarten to Grade 5, a radius progression, controlled gradients, and "looks like a game, not a website".

**What is done.** `src/adventure/styles/theme.css` holds one token set per class — primary/hover/pressed/fill, secondary, accent (+edge/hover), reward, background, surface, surfaceAlt, text, textSecondary, border, success, warning, error, disabled, shadow, cardRadius, buttonRadius, and a button edge depth. `classes.js` writes the grade onto `<html data-class>` on start and on every switch, so choosing a class re-themes the whole interface. The legacy variable names every stylesheet already used (`--ink`, `--sky`, `--sun`, `--line`, `--surface`, `--mint`) now resolve to those tokens, which is why no screen had to be rewritten. **World colours are deliberately not remapped** (`--sky-top`, `--hill-*`, `--canopy`, `--trunk`, `--river`), keeping the game-world palette separate from the UI palette as the brief requires. Radii step 26→14px and button edge depth 5→3px across K→5.

**One accessibility correction to the supplied palette.** White on Kindergarten's `#4C8DFF` measures 3.2:1 — fine for large bold text, short of AA for anything smaller. Anything carrying white text uses `--ui-primary-fill`, a deeper shade of the same hue, which the brief's own "subtle shifts inside the same color family" rule allows. Grades 2–5 clear 4.2:1 on the base primary. Body text measures 12.3–14.1:1 against its background at every grade.

**What is NOT done, and should not be described as done:** the per-screen art-direction pass. the gradient audit against the 10–20% budget has not been carried out; no screen has been reworked for the K–1 / 2–3 / 4–5 maturity bands beyond colour and radius; and the `impeccable` and `ui-ux-pro-max` skills the owner named are not installed in this environment, so those review passes did not happen. `game-ui-design`, `interfaces-that-feel`, `motion-system` and `peak-end-rule` are installed locally and are the closer match for the remaining work.

**Question boards: tried a scenic backdrop, reverted to cream at the owner's request.** Two attempts were made to give class boards a sense of place — first scattered emoji on a colour wash (rightly rejected: objects floating with no ground read as stickers), then a built landscape with sky, a light source, three receding ridges and life anchored to each ridge. The owner preferred the original plain cream and asked for a rollback, so `styles/stage-scene.css` is deleted, the `.cs-scene` injection is out of `class-games.js` and the import is off `AdventureRoot.tsx`. **Do not re-add this without being asked.** The flat background is a deliberate owner decision, not an oversight: `.class-stage > .scenery { display:none }` in `classes.css:3` is what keeps class boards plain, and it stays.

**The box on the map: found and fixed.** The owner reported a slate rectangle exactly the island's size, and it only ever appeared on the **Chapters 7–8 tab**, which is why earlier screenshots on Chapters 1–6 looked clean. Cause: `frontier.css:54` carried `#voyageWorld[data-region="coast"] .voyage-island { background:#416779 }`. That fill was written when the island SVG painted its own opaque water, so it always sat hidden behind the art. Moving the water onto the full-width `.voyage-world` made the island element transparent and exposed it as a box. Its specificity (1 id + 1 attribute + 1 class) also beat the `.voyage-island { background:transparent }` rule in the concurrently-added `natural-world.css`, so that fix could not win. The rule is removed; the coast keeps its distinct look from the `hue-rotate(12deg)` on the island art directly below it. Verified at 2002×916 on both tabs, with `.voyage-island` computing to `rgba(0,0,0,0)`.

**Both horizontal edges of the sea are blended.** The water used to stop dead against the chapter strip above and the nav below. `.voyage-world::before` and `::after` now carry the adjacent chrome colour a little way into the water — 70px at the top from `#ddf3ee` (`.vw-region-switch`) and 84px at the bottom from `#edf8f3` (`.voyage-nav`) — so both joins read as a horizon rather than a cut. Both fades are `pointer-events:none` at `z-index:2`, under the heading (3) and the quest bar (5), so nothing interactive is washed out. **Both of those 1px rules are now gone too** (2026-09-18, owner request: "there is still a line that appears at the top, try to remove the line. can you also do the same for the below panel"): `#voyageWorld > .vw-region-switch { border-bottom: 0 }` and `#app .voyage-nav { border-top: 0 }` in `chrome-blend.css` override `natural-world.css`'s `#92c8c8` and `#add4ce`. The top join then measured a clean 0 on its own. The bottom needed one more piece: the upward fade lives on `.voyage-world::after` at z-index 2, but `.vw-quest` sits at z-index 6 and throws a 28px shadow straight across the join, so the world's last row landed ~20 short of the nav's `#edf8f3` under the card and ~8 short away from it. Nothing at z-index 2 can fix that, so the fix hangs off `.voyage-nav` itself — fixed at z-index 9, the only layer above both the water and the card's shadow — as a 16px `::before` skirt that starts below the card's bottom edge, so the card is never washed out. Measured at four x positions on both joins: step ≤ 5, worst single-row spike ≤ 2, i.e. a ramp with no rule in it.

**The top bar is blended into the app (2026-09-18).** The owner asked for the navy-blue bar to go: "blend this part to the main UI of the app... the logo should look like hovering, the buttons on the navy blue bar should be blended too and have a contrast so that they are noticed they are the buttons." `styles/chrome-blend.css` is a new final layer, imported after `natural-world.css` in `AdventureRoot.tsx`. Three decisions in it:

- **The bar's last gradient stop is the exact colour of whatever screen is under it** — `#ddf3ee` (the region tabs) when `#mapScreen` is showing, `#edf5e9` (the class stage) when `#levelScreen` is. Measured, not judged: a rendered pixel column across the join shows a step of 0. The three deliberately dark stages (`.arena-stage`, `.frontier-stage`, `.voyage-stage`) instead get a soft cast shadow, because blending into them is neither possible nor wanted.
- **The plinth carries the meaning.** A pressable pill wears `0 3px 0 #718e83` and sinks into it on press, like every other game button; a readout (`#hudTitle`, `#coinPill`) stays flat. Plinth means press me, flat means read me — so the bar can be pale and its controls still read as controls. `#718e83` clears 3:1 against the bar, so the boundary is a real edge.
- **Every selector is anchored on `#app`.** The dark bar was painted by `.app:has(.world-map) > .hud` in `natural-world.css` (0,3,0) and `voyage.css` (0,4,0) for the pills and brand; a class-only selector loses to both. This is the same specificity trap as the island box — the first attempt here hit it too.

The logo hovers: `.brand-mark` floats 4px on a 3.8s cycle while its cast shadow, a separate `::after` ellipse on the bar, shrinks and fades as the mark climbs away. Both animations stop under `prefers-reduced-motion` and `html[data-calm]`; the static elevation stays. Verified with `test-results/hud-verify.mjs` (kept): no dark fill remains, all six bar buttons carry the plinth at 48px, both readouts do not, the cast-shadow rule selects all three dark stages, and the logo animation computes to `none` in calm and reduced-motion.

**The bar became sky, and the world's name came off it (2026-09-18).** Once blended, the bar read as a wide flat pale band; the owner said it felt empty and asked for a suggestion. Two changes:

- **`#hudTitle` is hidden on the map** (`#app:has(#mapScreen:not([hidden])) > .hud .hud-title`). It was repeating the world name — "Candy Land" — that is already the headline directly below it at full size. In a level the same slot carries the chapter name, which is the only breadcrumb back, so it stays there.
- **Two hand-drawn cloud tiles drift across the bar** at different rates (110s and 190s), plus one warm off-frame light in the top-left. One rate alone reads as sliding texture; two read as distance. They live in a `.hud-sky` div added to `Shell.tsx`, clipped to the bar and at `z-index:-1` behind everything in it. `transform` on elements inside an overflow box, **not** an animated `background-position`, so the drift is composited and the bar never repaints — this game targets school tablets. The clipping sits on that layer alone so focus rings on the bar's buttons are never cropped, and the clouds are kept well clear of the bar's bottom edge, because a cloud cut off along that edge would redraw the exact line this file exists to remove. Both stop under `prefers-reduced-motion` and `html[data-calm]` and simply stand still.

**Sky above, sand below (2026-09-18).** The owner's follow-up: the clouds were white on a near-white bar, so they "mixed with white"; and the bottom should lose its white blend and get its own treatment.

- **The bar is a real sky.** `#c6e7ef` at the top easing to the same shelf colour at the bottom, so the seamless join is untouched and the strip below now reads as horizon haze. White clouds finally have something to be white against; there are more of them, on an irregular rhythm (900px and 1260px tiles, so the repeat does not line up at any common width).
- **The plinth was re-measured, not re-guessed.** A deeper bar cost the button edge its contrast, so `--hud-key-edge` moved `#718e83` → `#5f877a`. The verifier no longer matches a hard-coded hex: it reads `--hud-key-edge`, samples the pixel actually painted behind the buttons and computes the ratio. Currently **3.29:1** against `rgb(211,238,238)`.
- **The bottom is the shallows, not a beach.** A sand shore was built first and the owner redirected: make it water. `#voyageWorld::after` now fades open sea into pale shallows `#b8e7e4`, and `.voyage-nav` is that same water, so the screen is one body of water from the horizon haze under the sky bar down to the nav. Three gradient stops again, not two — a straight fade flattens the middle into one dead value; the half-strength stop at 46% is the depth falling away.
- **The nav's controls are water, and that settles what they are.** The top bar sits *above* the world, so its controls are objects on a shelf: raised, solid plinth, pressed downward. The nav sits *in* the water, so its controls are the inverse — nothing raised, a resting label floats on the surface, hover lifts a patch of light onto it, and the selected tab is a pool **sunk** into the surface with a bright rim where light catches the edge. Two materials, two affordances, neither borrowed from the other. `aria-pressed` still carries the state, and the shape changes as well as the colour.
- **`--hud-key-edge` moved `#5f877a` → `#3f7f8c`** so the top bar's button edges are water teal too; a sage-green edge under a button on a blue bar was the last thing still borrowed from the cream design. Measured 3.67:1.
- **Surface swell replaced the foam.** `.voyage-nav::after` drifts long shallow swells across the whole nav at z-index -1 — above the fill, below every label — in the same stroke language as the island's own `.vi-wave`, rather than a parallel system. `::before` still carries the join and still never moves.
- **A vertical seam is still a seam.** The first swell tile used wavelengths that did not divide its 840px width, so every crest arrived at the tile edge out of phase and the repeat showed as a kink. Every wavelength now divides 840 into a whole number of full periods (4, 3, 5 and 2), and `chrome-verify.mjs` scans a row straight across the nav for single-column spikes so it cannot come back.

**"You wanna know how?" — the step-by-step explainer (2026-09-18, new feature).** The owner asked for an AI walk-through a child can open after answering, "so that if a student makes a guess and he's correct, if he wants to understand it, he can". Answers to the four scoping questions: main learning path only, hide the button when the key is absent, 2-4 steps scaled by grade, second key from a separate Groq account.

- **It opens only after the question is marked, paid and saved.** That ordering is the feature's main safety property, not an implementation detail: nothing the model says can change whether the child was right, what they earned, or what the learner model recorded. Asking costs nothing, which is the whole point for a child who guessed.
- **Its own provider account.** `EXPLAIN_AI_PROVIDER / _API_KEY / _MODEL / _BASE_URL / _ENABLED`, a `Channel` type in `ai/server/provider.ts`, and deliberately **no fallback to the default key** — a fallback would quietly reintroduce the shared-quota problem the second account exists to remove. It also gets its own rate-limit bucket (`<client>|explain`), for the same reason. `GET /api/adventure-ai` now reports `{ enabled, explain }` separately, and the runtime tracks the two availabilities apart, so one dead key cannot silence the other.
- **The one checkable failure is checked.** A natural-language explanation cannot be fully verified by code, but the failure that would actually mislead a child is an explanation that walks them to a *different* answer than the game just marked correct. `acceptExplain` requires the closing line to restate the answer the code computed (normalised for case and spacing), or the whole reply is dropped.
- **Offered only where that guard can hold.** `number`, `choice`, `line`, `scene` (except coordinate mode) and `build` (sum/product goals) have a single answer string. `sort`, `order`, `world` and `each`-type builds do not, so the button is not shown for them rather than shipping with the guard silently vacuous. That is roughly two-thirds of the generators plus scene and most builds — **not** every question, and it should not be described as such.
- **Grade-scaled:** K-1 two steps, 2-3 three, 4-5 four; 12/16/20 words per step. Read-aloud offered to K-2 only, reusing the existing `speechSynthesis` wrapper.
**The explainer was in one runtime, not four (2026-09-18, owner-reported).** The owner opened a voyage bridge mission and the button was not there: *"i do not see the you explaination button for every quest at every level."* My earlier scoping answer said the main learning path "all runs through one code path (class-games.js)" — true of class chapters, practice and Story Lab, and wrong about the game as a whole. Four runtimes ask a child a question and mark it.

- **The control now lives once, in `runtime/explain-ui.js` (`window.MQExplain`).** `create({actions, panel, signal, buttonClass})` builds the button and panel and owns the request, the caching, the read-aloud and the failure state; a level supplies the facts at the moment it marks a question correct. `class-games.js` was refactored onto it, so there is one implementation rather than four copies to drift apart.
- **Wired:** `class-games.js` (class chapters, practice, Story Lab acts), `voyage-games.js` (the rail / robot / bridge missions — the owner's screenshot), `pathway.js` (learning trails) and `arena.js`. Each supplies its own answer: the train's destination, the fraction the gap measures, the battery total, `puzzle.target`, `correctText(problem)`.
- **Not wired, and deliberately:** arcade minigames and the action levels (frog, fireflies, guardian) have no discrete question with a single answer; `frontier-games.js` (garden/jars) is an arrangement like sorting. Same rule as before — no single answer means the closing-line guard cannot hold, so the offer is withheld rather than made with the guard doing nothing.
- **Two scope bugs found while wiring, both mine:** the voyage control was created before that screen's markup existed (`q()` returned null and the mission would not mount), and the voyage offer referenced `skill`, which is scoped inside `record()` — a ReferenceError that fired after the feedback line, so the mission looked solved and the button silently never appeared. Both caught by the browser suite, neither by typecheck.
- **`smoke:explain` now covers all four.** Class and voyage end to end (a real bridge is built by reading the gap in twelfths off the board and searching plank combinations); trails and the Arena assert the control is present and starts hidden, which is precisely the failure the owner hit. Their solved-state path is the shared module's, exercised by the other two. The trail and Arena play-throughs are NOT end to end — a trail needs per-concept manipulation to reach a correct answer, and the standalone Arena only opens when no class is chosen.

- **Files:** new `src/adventure/runtime/explain-ui.js`, `src/ai/adventure/explain.ts` (+ `explain.test.ts`, `explain.route.test.ts`), `scripts/adventure-explain.mjs` (`npm run smoke:explain`); changed `ai/server/provider.ts`, `ai/adventure/schemas.ts`, `app/api/adventure-ai/route.ts`, `runtime/index.js`, `runtime/core-ai.js`, `runtime/class-games.js`, `runtime/voyage-games.js`, `runtime/pathway.js`, `runtime/arena.js`, `styles/classes.css`, `.env.example`, `package.json`.
- **No live provider call has been made against the second key.** The browser suite intercepts the route and answers locally; the key had not been supplied at the time of writing.

**The logo is a lantern now (2026-09-18).** The owner asked for the mark to change. A 13-agent design panel proposed three marks (counting cubes, a trail cairn, a lantern) and its adversarial reviewers shipped **none** of them clean: the cubes read as a SIM chip with a dead top-left quadrant and kept the app-icon rounded square the brief said to avoid; the cairn collapsed into a hamburger-menu glyph at small size; the lantern was called "the better idea and the better mark" but had two real defects — its halo was invisible on cream, and it swayed as if hanging while still casting a ground shadow, which is a physical contradiction. The lantern was taken and both defects fixed.

- **It is the world's own name, finally drawn.** The title screen calls the world THE LANTERN ISLES (`runtime/ux.js:161`), Kindergarten's pitch is "Hop the river, light the lantern, and wake the Forest Guardian" (`runtime/core-ai.js:6`), Story Lab's first arc is Lantern Night at the Clearing (`classes/storyLab.ts:51`), and lantern flight is the arcade game the owner singled out. The old gold four-point star said nothing about any of that and is the most generic mark in circulation.
- **No tile.** The silhouette carries the mark, which is what kills the app-icon read and lets it actually float.
- **Painted via `::before`, not swapped in the markup — this matters.** The logo is written TWICE, `Shell.tsx:11` and `runtime/ux.js:161`. Editing the glyph in one would have left the other showing a stale star. `font-size: 0` retires the `✦` text node in both without touching either file.
- **Two grounds, one mark.** The bar is pale sky, so the lantern is the brand's deep green with a lit gold window. The title screen is night (`#223b54`, voyage.css:4) where a dark body would vanish, so there the body lightens and the window blazes — which is simply what a lantern does after dark. Same shape, same gold, same proportions.
- **What sits under it is light, not shadow.** The old treatment put a dark ellipse under a lamp, which is backwards; a light source does not cast darkness beneath itself. The pool is warm now and spreads and dims as the lantern climbs — the exact inverse of the shadow it replaces, and still the thing that sells the hover. Same keyframe names and elements, so both stillness lists cover it unchanged.

**Measured, and it corrected the panel.** A width sweep shows the mark renders at 34x39 at every width where it renders at all, and `.mq-brand` is `display:none` at 600px and below — so `storybook.css:254`'s 26x29 rule never applies in practice. The reviewer had rejected the cairn partly on phone-tile legibility at a size that does not occur. The choice stands on other grounds, but the objection was against a phantom.

**One trap worth remembering:** switching `.hud` from the `background` shorthand to `background-image` silently left `natural-world.css`'s `background:#194c58` in place as the background-*colour*. The gradient hid it, so it looked fine — but any layer later given transparency would have let the dark slab back through. `background-color: transparent` is now explicit. The verifier caught it, not the eye.

**Note for whoever is next:** `styles/natural-world.css` and `public/art/*.svg` arrived from another agent during this session and now own the sea's colour (`#55cdd5` plus a ripple tile and radial gradient). That work is preserved, not overwritten.

**The sea creatures were removed at the owner's request.** `seaLife()` still exists in `voyage-art.js` and is still exported, but nothing calls it. Do not reinstate it without being asked.

**The island is alive.** `voyage-art.js` gained two things and `voyage.css` the motion for both. The open water now carries **four bands of swell** drifting at different speeds and directions; each band is drawn at twice the canvas width and travels exactly half of it, so the loop is seamless. `seaLife()` adds six friendly creatures — dolphin, turtle, whale, fish, crab, pufferfish — patrolling the water *frame* around the land: four cruise the top and bottom channels, two work the left and right edges, and none ever swims over the island or a landmark. They are an HTML layer rather than SVG because the island art is stretched with `preserveAspectRatio="none"`, which would squash them; each one bobs and is mirrored when heading right, since every one of those emoji faces left. Reduced motion and calm mode keep the sea life on screen and still, rather than removing it.

**The water is aqua, not navy.** The flat `#28455f` sea became a radial gradient (`#1b93a8` → `#107b93` → `#0a5c72`): brighter where the land sits, deeper towards the edges, the way real water round an island reads. The shallow shelf that rings the coast went from slate `#42657a` to reef turquoise `#3cb9c4` with a pale `#8fe3e8` edge, the swell bands and surface pattern moved to aqua highlights, and the map frame behind it all (`.voyage-world`, the map-screen background, the HUD pills and the bottom nav) shifted from navy to deep teal so the whole screen reads as one body of water.

**The wide-screen "borders" are gone — the sea is now a single surface.** On screens ≥1450px the island is capped rather than stretched, so open water surrounds it. The water used to be painted *inside* the island SVG, which meant it could only ever match its surroundings by coincidence — and a media query at `voyage.css:249` reset `.voyage-world` to the old navy, so the centre was aqua and the flanks navy with a hard vertical step down each side. Matching the two colours by hand is the wrong fix, because the SVG's radial gradient is a different value at every point on its edge. **The water moved out of the SVG onto `.voyage-world`**, the full-width element: one radial gradient plus a repeating surface texture, with the island art transparent on top of it. A seam is now structurally impossible. The canvas also widened 1200 → 1400px, with the quest bar and hint re-centred.

Measured, not eyeballed: a throwaway script screenshots a scanline of open water, has Chromium decode its own PNG through a canvas, and reports the biggest colour jump between neighbouring columns in the open-water bands and at the island element's two boundaries. Before: a hard step. After: **4/765**, imperceptible. Below 1450px the island fills the viewport, so no side bands exist and no seam is possible there.

One bug worth remembering: `transform: translateX(%)` resolves against the *element's own* width, so the first version moved each 30px creature by 33px instead of across the map. The cruise keyframes use viewport units.

Verified: `npm run check` (42 files / 325 tests), `smoke:classes`, `smoke:adventure`, and a scripted contrast/radius check across all six grades with no JS errors. `smoke:voyage` fails at `adventure-voyage.mjs:137` on `state.minis` — the pre-existing per-class bonus-record stale failure listed below, confirmed identical before and after this change.

## Earlier: a real plotting problem, and two proper games for Grades 3–5 (Claude Code, 2026-09-18)

Owner report: "I don't see a purpose of this problem, just finding coordinates… add some complexity to the games of grade 3,4,5, the arcade games are mid. Remove the music thing and the drawing one in 3,4,5. Include some complex games like Lantern Flight."

- **Coordinate Courier got the same treatment** (bonus slot 4, Grade 5), because it had the identical defect: every dock printed its own pair. Blank docks, rulers on the two axes, the boat marked where it is — and after the first parcel the address is given as a move from the boat ("3 across and 2 up"), so the round gets harder as it goes.
- **`.gb-game` now paints its own light card.** All four grade-variant minis (Firefly Float, River Post / Coordinate Courier, Pip's Rainbow Roll, Pip's Shape Parade) inherited the mini overlay's theme palette, so on a dark theme their title, note and status were dark text on a dark ground.
- **The coordinate board had no thinking in it.** Every square printed its own `(x, y)`, so "Guide the delivery to (3, 0)" was finding a matching label. The grid is now graph paper: **blank squares, numbered rulers** down the left and along the bottom, and the **depot marked** on the plane. The question gives a journey instead of an answer — "The depot is at (1, 0). The drop point is 1 across and 3 up from the depot" — so the child computes the point and then plots it. At Story Lab levels 3+ the move can go **down** as well as up. `SceneTask.origin` carries the depot; `target` is unchanged, so every existing check and solver still works.
- **Number Chute, a new game in two modes,** replaces Mist Painter (the drawing one) and Glow Orchestra (the music one) for **Grades 3–5 only** — K–2 keep both, because wiping and rhythm suit them. It is built like Lantern Flight: a pure, seeded, unit-tested rules module (`src/adventure/chute.ts`, 8 tests) plus a thin view (`runtime/mini-chute.js`) with a `requestAnimationFrame` loop.
  - **Factor Falls** (slot 1): crystals fall down four chutes; catch the ones that fit the rule and let the rest drop. The rule changes every wave — multiples of *n*, factors of *m*, primes at Grade 4, "greater than 2.7" decimals at Grade 5 — and each of the four waves falls faster with less gap.
  - **Exact Order** (slot 8): catch falling values to fill an order to the **exact** total. Going over spills the load and costs a life, so the child has to look at what is left before sliding the basket. Grade 3 works in ones, Grade 4 in fives, Grade 5 in halves.
  - Shared: four lanes, three lives, a combo that doubles every five clean catches (capped at ×4), medals against a perfect run, a Pip rival score and a saved best per mode (`best.chuteSort`, `best.chuteExact`). Move with the lane buttons, the arrow keys, or by touching a chute.
  - Every target in Exact Order is a whole number of the smallest value on offer, and that value falls every fourth crystal, so a child who is one step short is never stuck — asserted in the tests.
- **Every bonus card claimed the same skills.** `MQGradeBonus.resolve` appended the *learner's grade* label to all eight blurbs, so on a Grade 5 screen every game ended "Coordinate routes · memory and strategy". There is now one honest line per game (`BONUS_SKILLS` in `classes/bonus.ts`), shown as its own `.pc-skills` line on the card.

Also fixed: the Number Chute card paints its own light ground rather than inheriting the mini overlay's theme palette, which was rendering dark text on a dark shell.

Verification: `npm run check` (42 files / 325 tests, including a new `chute.test.ts`), `smoke:classes` (247 class questions including the reworked plotting round), `smoke:grade-play` (now asserting that Grades 3–5 get the two chute games, that K–2 keep the originals, that all eight skill lines differ, and that a wave really runs) and `smoke:models-story`. Both modes were played end to end in the browser at Grades 3, 4 and 5 — gold medals recorded, no JS errors. Screenshots in `test-results/chute`. `smoke:arcade` still fails on `.fly` count 0, which is the pre-existing stale-suite failure recorded below, unrelated to this change.

## Earlier: Story Lab is a story you play (Claude Code, 2026-09-17)

Owner direction: "there are some match we should do to reach a destination… but that's nothing like a story at all. I want a real story which relates… the minimum thing to expect is a visual story telling… there should be some visual representation, or animations. I need a significant difference while playing the normal quests and the story labs. Each level should increase the difficulty… the more difficulty the more prize they get."

Before this change, a Story Lab adventure used the **same screen as a normal chapter**: four unrelated tasks with a single line of label text at the top. Grade 4's moon-base "story" asked "Which number is a factor of 45?" over a board captioned "Pack the forest seeds into equal rows".

- **A real arc, authored per island.** `classes/storyLab.ts` now builds a five-act adventure (four for Kindergarten and Grade 1, which skip the setback): a named friend who wants something, an opening, one act per complication, a turning point where the child **chooses**, and one of two endings written for that choice. Forest (K–1) is Moss getting the clearing ready for Lantern Night; the workshop (2–3) is Bip trying to join the rescue crew; the moon (4–5) is Nova circling with a full ship and a dark beacon. Every act carries both a `beat` (why this job exists) and an `after` (what solving it caused), so each act is the reason for the next.
- **Visual storytelling between the acts.** `runtime/story-scenes.js` is a new layered scene renderer plus a cutscene player: typed narration, page dots, a skip, and choice buttons. The scene is data (`{setting, scene, sky, pieces, cast}`), so the same renderer draws both the cutscene and the small set above the board. Sky and weather move with the story — day → cloud → storm → dusk → night → lit — except on the moon, which keeps a star field at every hour.
- **The maths visibly builds the place.** A `.sl-set` strip sits above the board with one empty slot per act. Solving an act lands its piece with a flourish (`MQStoryScene.land`), the cast grows, and the last act lights the whole scene. That, plus the narrated beat and the friend's portrait in place of the chapter mascot, is the difference between a quest and a story.
- **Difficulty and prize both climb.** Acts run easiest → hardest within an adventure. A per-class `storyLevel` (new `CLASS_FIELDS` entry, 1–5) rises with every adventure finished and raises the parameter tier the generators are called with, so the same story returns with wider numbers. Coins scale too: `actCoins(index, level) = 2 + index + ⌊level/2⌋` per act plus `4 + 2×level` for finishing, shown up front on the Story Lab screen as "LEVEL n OF 5 · PRIZE 🪙 n".
- **The writer's part is smaller and honest.** The AI may rewrite the title, the opening and one beat per act (the mission schema now takes four **or five** beats, matching the itinerary). The plan, the maths, the choice and both endings stay in code, because the ending depends on what the child chose. A saved book only stores its words when they were AI-written; a built-in book is rebuilt from its seed and the saved choice, and replays at the level it was written at.

Fixed along the way: creating a story in the first moment after a page load silently fell back to the built-in writer, because the AI status check had not landed — `.dl-create` now waits for it once; boards in a story rename their counters to the story's own supplies (`Task.supply`), so a moon base no longer packs "forest seeds"; "Put 1 berries in the basket" now agrees in number; and class boards no longer print a double "✓ ✓".

Verification: `npm run check` (41 files / 317 tests, including a rewritten `storyLab.test.ts` covering the arc, the choice, the scene shape, the reward curve and the level tiers), `smoke:models-story` (all twelve class/quest adventures played act by act, asserting the set gains exactly one piece per act, plus the level rise and an AI-written replay), `smoke:grade-play`, `smoke:classes` and `smoke:adventure` all pass. Screenshots in `test-results/models-story`. No live provider call was made for this change.

## Earlier: Hoot is a drawn bird on stationary perches (Claude Code, 2026-09-17)

Owner report: the wings flapped side to side instead of beating; a white badge sat behind the bird; it stopped looking like a bird once it landed; the perch travelled with it; the arrow button should go and the star button should be the one that makes it fly, with a flying symbol; and the perches must not overlap the rest of the UI.

- **The bird is drawn, not badged.** `roaming-hoot.js` holds a hand-written SVG owl (`OWL`): body, belly, head, ear tufts, eyes, beak, tail, feet and two wing paths. The cream button behind it is gone — `.rh-ask` is now a transparent 72px button whose only content is the bird, so it reads as a bird perched and in the air alike. Colours are CSS (`.rb-*` classes), so calm mode and themes can reach them.
- **Wings beat up and down.** Each wing hinges at its shoulder (`transform-box: fill-box`, origin at the shoulder corner) and both swing together between +56° and −18° twice a second while flying; at rest they fold down against the body and stay visible. The old `.rh-wing` divs, `.rh-spark`, `.rh-name` and `.rh-move` markup are gone.
- **The perches are scenery.** Four `.rh-perch` elements live in a fixed `.rh-perches` layer on `document.body`, one per corner, `pointer-events: none`. They never move. Each branch reaches in from its own screen edge and stops under where Hoot's feet would be; the lantern under the corner Hoot is in lights up (`data-lit`), the other three stay dim.
- **They never lie across the game.** `occupied(box, selector)` tests a perch against the game's own content (controls, headings, paragraphs, the play world). A perch that would overlap is hidden, recomputed on layout changes and resize — so on a tablet they sit in the gutters and on a phone, where there is no gutter, they simply do not appear. `blocked()` now uses the same helper.
- **One control, and it is about flying.** The ↻ arrow button is gone. `.rh-fly` sends Hoot to the next perch; its label names the corner it is resting at. "Move Hoot to another corner" in the card and the arrow keys still work.

**Second pass, same day, after the owner saw it:** the owl looked scary, it stood beside its log rather than on it, and the feather button was both irrelevant and too big.

- **A friendly owl.** A cream facial disc, softer brows arching outward, smaller pupils with a white catchlight, rosy cheeks, a small rounded beak, rounded ear tufts and warmer browns. The stare is gone.
- **It stands on the branch.** The branch is now centred on the corner's spot instead of reaching in from the edge, and sits at foot height (the feet end at y=61 in the owl's viewBox; the branch top is drawn there). `blocked()` also checks the branch, so Hoot prefers a corner where it can actually perch. Where no branch fits, Hoot tucks its feet up (`data-perched=false`), the way a bird does in the air, rather than standing on nothing.
- **A small gust, pinned to its shoulder.** The 🪶 feather in a 48px circle is replaced by a 34px badge holding a drawn wind glyph, sitting on the owl's outer shoulder like the old spark. The badge is small; `::after` keeps the tap target at 48px.
**Worn glasses, properly on the face (same day).** Owner report: the shades still sat in the wrong place — on the chef hero they landed on the neckerchief.

- The face slot was anchored by the item's **top edge** (`top: 34%` + `translateX`), so a 30px pair of shades hung from the eye line down to the collar. Every surface now anchors by the item's **middle** (`transform: translate(-50%, -50%)`) at **38% of the hero's em box**, which is the eye line for every hero emoji, at **0.45em**.
- Fixed in all five places that draw the hero, which had drifted apart (23%, 32%, 34%, 36%): the shop preview (`meta.css`), the island token (`voyage.css`), and the result card, storybook card and map token (`story.css`).
- Checked against a pixel ruler and then against 🧑‍🍳, 🧑‍🚀, 🧑‍🎨, 🐼 and 🐯: the shades sit on the eyes of each. The panda's eye patches sit lowest, and 38% still covers them.

- **The overlap test has a tolerance.** Hiding a branch on any intersection meant an 18px sliver of a rounded panel corner removed it. A branch now hides only when the overlap exceeds 420px² — about an eighth of it — so all four perches show on a tablet and none do on a phone.

Verified at 1280×900 and 390×844: perched, mid-flight with wings spread, landed, and with the help card open. `npm run check` (41 files / 312 tests), `smoke:grade-play` (now asserting `.rh-move` is gone, that the perch transforms are unchanged across a flight, and that exactly one lantern is lit — the one Hoot landed on), `smoke:classes`, `smoke:models-story` and `smoke:adventure` all pass.

## Earlier: quest panel fix, Theme removed (Claude Code, 2026-09-17)

Owner report: opening a quest on the map drew the landmark art over the text behind it, and the Theme feature was not earning its place.

- **Quest panel.** A generated chapter's landmark is a `.vw-emoji-building`, and `.voyage-building { width: 100% }` stretched it to the dialog width, so its circle covered the chapter text. `styles/classes.css` now pins that landmark to the 145px portrait strip. `smoke:classes` guards it: the badge must stay inside the strip and above the kicker (screenshot `tablet-02b-quest-panel.png`).
- **Theme removed.** Gone: the HUD Theme button and dialog, Story Lab's "Choose your world" chooser, the per-class `studentTheme` save field, the per-theme palettes and `runtime/student-themes.js`. Each class keeps **one fixed setting** matched to its island (K and Grade 1 woodland, Grades 2–3 workshop, Grades 4–5 moon base), so Story Lab keeps its characters, supplies and boards. `storyPlan(grade, quest, seed)` no longer takes a theme and saved storybooks no longer store one; older books still load, because the extra field is ignored.
- The AI mission request still sends a setting id from the unchanged `MISSION_THEMES` contract, so no server route, schema or prompt changed.

Verification: `npm run check` (40 files / 304 tests, typecheck, lint, licenses), `smoke:classes` (247 tasks plus the new panel guard), `smoke:models-story` (12 journeys, now asserting no chooser exists anywhere) and `smoke:grade-play` all pass. The older suites listed below stay red for the reasons given there.

### Hoot really flies, and the hero wears what it bought (same day)

Owner report: clicking "move Hoot" made it *spawn* in the new corner rather than fly; the island character did not wear a bought hat or pet; worn glasses floated above the head; the character was small.

- **The flight is real now.** The perch was animated with `inset`, which cannot interpolate from `auto`, so every move was a jump. Position is now a `transform: translate(...)` computed from the corner and transitioned over **2.4 s** — slow enough to watch. Coordinates come from `documentElement.clientWidth/Height`, so a scrollbar no longer clips Hoot at the edge.
- **It flies like a bird.** A `.rh-flight` wrapper takes off, leans into the direction of travel, glides and levels out to land; the wings beat about twice a second; the owl turns to face where it is going (`data-heading`, mirroring the owl only, never its name); and the button chrome, name and perch fade out in the air, so what crosses the screen is a bird with spread wings rather than a badge. Measured over one move: 646 → 618 → 408 → 234 → 208 px. Calm mode and reduced motion keep it still, as before.
- **Worn things appear on the island.** `voyage-world.js` drew only the hero emoji, ignoring `hat` and `pet`. The hero token now renders both, and the character is larger (54px).
- **Worn things sit where they belong.** Every "hat" used to be placed above the head, which is wrong for sunglasses. `MQShop.slotFor(emoji)` returns `face` for glasses and `head` for hats and crowns, and the island token, shop preview, result card, storybook card and map token all place the item accordingly. The face position was then tuned against the rendered emoji (23% down the glyph), because the first attempt sat over the mouth.
- The pet stands beside the character with a gentle hop (stilled by reduced motion and calm mode).

Verified with a save wearing 🕶️ and 🐲: the shades sit across the face, the dragon stands beside the hero, and the flight samples show smooth easing. `npm run check` (41 files / 312 tests), `smoke:grade-play` and `smoke:classes` pass.

**A note for whoever automates this app:** `MQ.openLevel`, `MQShop.open` and `MQMini.play` return promises that settle only when the child finishes or closes that thing. Awaiting one inside `page.evaluate` hangs the script. Call them as `page.evaluate(() => { void window.MQ.openLevel(...); })`.

### Hoot: a corner perch, a card beside it, and three progressive hints (same day)

Owner direction: the help should expand from Hoot rather than take the screen, so a child can read the hint and the question together; Hoot's constant drifting was annoying, so give it wings, corners to rest in and let the player move it; keep "Keep Hoot still"; and give at most three hints that build, with an example in the last.

- **The card opens beside Hoot.** `.hoot-coach` is no longer a modal dialog; it is a panel inside the owl that opens toward the middle of the screen (about a third of the viewport at most). On opening, if the card would land on the start of the mission line, Hoot hops to a corner where it does not. Escape and the close button still work, and focus moves into the card.
- **Perching, not drifting.** Hoot rests in one of four corners on a little branch with a leaf and a lantern, with folded wings that flap only while it flies. The timed wandering is gone: it moves when the child moves it (the button beside the owl — since superseded by the 🪶 fly button — "Move Hoot to another corner" in the card, or arrow keys while focused), and otherwise only hops to the other corner on its own side when a control appears underneath it. The corner and the "Keep Hoot still" choice are saved in `mq.playtest.v3` (`hoot`). The owl graphic bobs, never the button, so the tap target never moves under a child's finger.
- **Three hints, then stop.** `step` is capped at 3 and `previous` at 2. Step one points at what matters, step two suggests one action, step three shows how: **Grade 2 and up get a worked example** using numbers that appear nowhere in their question or its answer; **Kindergarten and Grade 1 get the method demonstrated on the objects**, still with no numbers at all, because their problems are too small for a different example to exist. The card labels the last step "AN EXAMPLE" or "SHOW ME HOW" accordingly, and the button then reads "All three given".
- **Why the rules moved into the request.** Live runs showed a general system prompt is easy for a model to drop: replies were rejected for writing "seven" or for not ending in a question mark. `coachMessage` now appends the rule for that exact step, and a rejected reply is quietly retried once before the child sees a failure. Acceptance went from zero to consistent across Kindergarten and Grade 4 live runs.
- Fixed alongside: the Kindergarten patch mission read "1 bunnies are here" — it now agrees in number ("1 bunny is here. 1 comes to play.").

Verified live against Groq: three grounded hints in a Kindergarten mission, each going further than the last, the card beside the owl with the mission still readable, and the corner move working. `npm run check` (41 files / 312 tests, including new coach tests for the example rules), `smoke:grade-play` (now asserting the card never covers the mission text, three hints, the labelled last step, the corner move and the still setting), `smoke:classes` and `smoke:models-story` all pass.

### First live AI: Groq free tier (same day)

**A live model has now answered the game's real prompts.** Configured in `.env.local` (git-ignored, never committed): `AI_PROVIDER=groq`, `AI_MODEL=openai/gpt-oss-120b`, `AI_API_KEY=…`. The owner's key was shared in chat, so **rotate it in the Groq console before any public demo**.

**Model choice, measured through our own route, prompts and guards** (acceptance means the reply passed every validator and would reach a child):

| Model | Coach hints accepted | Chapter hint | Median latency | Notes |
| --- | --- | --- | --- | --- |
| `openai/gpt-oss-120b` | 10/12 | 4/4 | ~1.2 s | Best phrasing; chosen |
| `openai/gpt-oss-20b` | 6/6 | 2/2 | ~1.1 s | Close behind; hints sometimes ask two things at once |
| `qwen/qwen3.8-27b` | 3/6 | 1/2 | ~0.4 s | Fastest, weakest adherence; also called Pip "he" |

The other models on the account are audio, Arabic-specific, guard classifiers or Groq's agentic "compound" systems, none suited to short structured replies. Switching model is one line in `.env.local`; `gpt-oss-20b` is the fallback if free-tier limits bite.

**One prompt fix came out of this.** The first live run rejected *every* Kindergarten coach hint. The raw reply showed why: the model wrote "All **seven** bunnies…", and the guard forbids digits and number words; a second model's hint didn't end in a question mark, which the guard also requires but the prompt never stated. `COACH_SYSTEM` now says both rules explicitly ("no digit or number word anywhere, including the notice"; "the hint is exactly one sentence… ending with a single question mark"). Kindergarten acceptance went **0/4 → 4/4**, and the guards were not weakened.

**End-to-end in the browser** (Grade 4, The Algorithm Express, live Groq): Hoot's first ask returned "Focus on the rightmost column of numbers." / "What sum do the digits in the ones column make?", and a second ask built on it rather than repeating. Labelled "AI hint · based on your current game". No page errors.

**Testing gotcha:** the server's own rate limiter (`RATE_LIMIT`: 20 tokens, refilling 1 per 3 s per client) returns `busy` in ~50 ms. A rapid probe exhausts it and looks like a provider failure. Pace live probes at 3.4 s or restart the server for a fresh bucket.

After this, `npm run check` (41 files / 311 tests) and `smoke:grade-play` still pass.

### Any provider's key (same day)

The owner wants to supply a key from any provider, not only Anthropic. The AI layer is now provider-agnostic, and the default behaviour is unchanged.

- `src/ai/server/provider.ts` chooses an adapter and exposes the same three functions the rest of the app already used (`aiConfigured`, `writeJson`, `writeText`), plus `classifyProviderError` and `providerInfo`.
- `src/ai/server/anthropic.ts` keeps the SDK path with prompt caching, server-side fallback and low effort. `src/ai/server/openaiCompatible.ts` speaks the OpenAI chat-completions shape over plain `fetch`, asking for a strict JSON schema (`z.toJSONSchema`, zod 4) and falling back to plain-JSON mode for models that cannot take one. **No new dependency**, so the license audit and disclosures are untouched.
- Configuration: `AI_PROVIDER` (`anthropic` default, or openai, groq, openrouter, together, gemini, ollama, custom), `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` (custom only), `AI_ENABLED=false` to switch off. `ANTHROPIC_API_KEY` alone still selects Anthropic, so existing setups keep working.
- Both routes lost their direct SDK import; they now ask `classifyProviderError` whether a failure is a rejected key (503), a rate limit or timeout (429) or something else (502). `GET /api/adventure-ai` reports `{ enabled, provider, model }` and never key material.
- Nothing downstream changed: prompts, guards, validators, the runtime and the game's fallbacks are provider-unaware, and every reply is still re-checked by the same zod schema before display.
- **Verified:** `npm run check` (41 files / 311 tests) including new provider tests covering selection rules, request shape, the strict-schema fallback, schema rejection and error classification. End to end, a throwaway OpenAI-compatible endpoint on localhost was configured through `AI_PROVIDER=custom`: `GET /api/adventure-ai` returned `{"enabled":true,"provider":"custom","model":"fake-model-1"}`, a real `mission` request reached it with `Bearer` auth and `response_format: json_schema`, and the reply passed the existing validators and came back `ok:true`. **No paid provider call was made and no real key was used.**

## Verification pass, no code changes (Claude Code, 2026-09-17)

Re-ran the tree as found, to record what is green today. Nothing was changed.

**Passing:** `npm run check` (typecheck, lint, unit tests, license audit), `smoke:classes` (247 tasks), `smoke:grade-play` (six classes, Arenas, mocked coach hints, bonus isolation, phone), `smoke:models-story` (12 class/quest journeys, models, replay), and `smoke:adventure`.

**Failing, and why.** Seven older suites assert UI that this work replaced. They are stale tests, not gameplay breakage, except the last:

| Suite | Failure | Cause |
| --- | --- | --- |
| `smoke:arcade`, `smoke:learning`, `smoke:complete` | `.fly` count 0 / `wrong is not iterable` | Kindergarten's moving Fireflies became stationary Firefly Homes |
| `smoke:arena` | Lands on "Tinker's Power Trials" | The class Arena replaced the universal Arena |
| `smoke:companion` | Finds "Stop Hoot and help me think" | The roaming owl replaced the docked companion bar |
| `smoke:frontier` | `.dl-source` reads "YOUR AI-WRITTEN ADVENTURE", not "AI-CREATED" | `story-studio.js` replaced `dream-lab.js` |
| `smoke:voyage` | `state.minis[id]` is undefined | Bonus records moved into the per-class fields |
| `smoke:flight` | Stalls waiting for leg 2 | See below |

**`smoke:flight` needs a real look.** On an idle machine (19% CPU) headless Chromium draws a blank page and the map at 60 fps but Lantern Flight at **16 fps**, and the flight advances game time by at most 50 ms per frame, so its legs run long and the suite's 70-second waits expire. A probe confirmed the game is progressing, not hung: score and lantern lights climb while `data-leg` stays `meadow` for 45 s. Removing the roaming owl from the page does not change the frame rate, and `mini-flight.js` is unchanged, so the likely suspects are the added global stylesheet layers or overlay compositing. Decide whether to make the suite tolerant of frame rate or to profile the scene's paint cost.

**Recommendation for whoever continues:** either update the seven stale suites to the new UI or retire them explicitly, so a future agent is not left guessing which failures matter. Until then, the class, grade-play, models-story and adventure suites plus `npm run check` are the trustworthy gate.

## Read first: meaningful models, class themes and connected Story Lab (2026-09-16)

The latest owner feedback rejected bare equations and unrelated destination artwork, and requested a more useful Story Lab plus themes suited to each class. Read [VISUAL_STORYLAB_REVIEW.md](VISUAL_STORYLAB_REVIEW.md) for the current implementation and verification.

Arithmetic now uses operand-based visual workbenches; Factor Forest arranges seeds into equal rows; generic choice cards no longer display arbitrary houses. A **Theme** button offers three choices per class and preserves them separately. Story Lab now previews and plays a connected, seeded four-stop mission for that class, with a saved adventure book and replay. Its existing AI writer receives the actual ordered mission plan; unavailable AI uses explicitly labeled built-in stories. `story-studio.js` replaces the loaded `dream-lab.js`; `studentTheme` and `storyShelf` are new per-class save fields.

Verification passed **40 files / 303 tests**, the production build, `smoke:classes` (247 tasks), `smoke:grade-play`, and `smoke:models-story` (12 class/purpose journeys, model correctness, replay, themes, phone layouts and mocked AI itinerary/cancellation). The final phone check confirms all five addition columns fit at 390px. No live provider request was made. Preserve the substantial uncommitted work.

## Previous update: playable class quests and roaming AI Hoot (2026-09-16)

The owner rejected a class split that turned visual games into mostly arithmetic cards. **Preserve playable worlds and vary concepts and difficulty by grade.** The current implementation adds move-based bunny/cargo, gate-routing, robot-sharing and fraction-bridge games; interactive sorting/train/river boards; grade-specific Arenas, Story Lab sources and bonus controls; and a roaming Hoot with successive AI-generated hints grounded in live game state.

Read [GRADE_GAMEPLAY_REVIEW.md](GRADE_GAMEPLAY_REVIEW.md) for current architecture, curriculum corrections, save changes, tests and limits. There are 48 chapters: 41 generated chapter registrations and seven retained original visual chapters. Kindergarten Fireflies is now stationary Firefly Homes. All 42 class practice/expedition routes use class-owned generators. Bonus records are now per class. Automatic answer reveal after three misses was removed.

Hoot's new `coach` endpoint is implemented; local AI was **disabled** during verification, so hint integration was tested with mocked replies, not a paid live model. Existing provider configuration is unchanged. Teach Pip remains a separate, older activity.

Final verification: the class browser suite passed **247 tasks**; `npm run check` passed **38 files / 295 tests**, typecheck, lint and license audit; the production build passed. `smoke:grade-play` passed real gameplay, all six Arenas and Story Lab classes, mocked sequential AI hints, bonus isolation and phone layouts. Preserve uncommitted work.

## Historical baseline: six classes, Kindergarten to Grade 5 (Claude Code, 2026-09-15)

The owner asked to divide the game into classes using a detailed K–5 syllabus (CC, OA, NBT, NF, MD, G), with the same structure and number of games in every class, adding games where a class was short. They also asked to leave the AI features as they are.

The owner chose:

- Eight chapters per class, with shared bonus games.
- One island per class, with the same world and characters.
- A class picked at start, with separate progress, changeable from Adults.
- All six classes built at once, math correctness first and art polish last.

[CURRICULUM_MAP.md](CURRICULUM_MAP.md) maps every chapter to the syllabus.

### What the player gets

- **Class picker:**
  - A new player picks a class before the hero picker and prologue.
  - An older save picks one after the title screen. Its finished chapters move to the class each chapter now belongs to (`assignFirstClass`).
- **Every class has the same structure:**
  - An island with eight chapters in slot order. A chapter opens only in its own class; a finished chapter can always be replayed.
  - The same eight bonus games, unlocked by slot. The playground also unlocks by slot.
  - Six practice trails and a Mystery expedition. Some trails are existing concept trails held near the class's band; the rest are new question trails.
- **Existing chapters stay in their original slot** (so their bonus game is unchanged):

  | Class | Chapters |
  | --- | --- |
  | Kindergarten | Dark Glade (2) |
  | Grade 1 | Scattered River (1) |
  | Grade 2 | Guardian (3), Skyrail (4) |
  | Grade 3 | Workshop (5), Garden (7), Tidepool (8) |
  | Grade 4 | Sky Bridge (6) |

- **40 new chapters**, each with a short story intro and ending (Hoot, Pip, Nimbus and Tinker):
  - Five questions per chapter, with increasing difficulty.
  - Answers are chosen, typed on a keypad, tapped on a number line, sorted, ordered or built with dials. Live pictures include blocks, coins, clocks, arrays, fraction models, ten-frames, the coordinate grid, a protractor and unit cubes.
  - "Show me how" fills in the answer with an explanation. Three misses show it automatically.
  - Answers are checked in code. Evidence is recorded per skill, keeping independent and supported attempts apart.
  - Each chapter has a checkpoint to resume from.
- **Progress:**
  - Per class: chapters, stars, learning records, trail records, voyage checkpoints and story choices, Story Lab progress, and class work.
  - Shared: coins, badges, cosmetics, the camp, keepsakes and bonus records.
- **Adults:**
  - Shows the class and a **Change class** button.
  - The report lists the class's syllabus skills and its chapter count (out of 8). It also includes trails and games where this class recorded evidence.
- **Story:**
  - The Lantern Keeper certificate is skipped once a class is chosen, because it celebrated the original three-chapter story.
  - Nimbus appears from Grade 2. Grade 3 meets Nimbus as a friend who travels with the group.

### Code

- **New pure TypeScript in `src/adventure/classes/`:**
  - `tasks.ts`: task and response types, `normalizeAnswer`, `checkTask`, `correctResponse` and `validateTask`.
  - `kit.ts`: shared helpers.
  - `familiesNumber.ts`, `familiesFractions.ts` and `familiesMeasure.ts`: about 120 generators.
  - `catalog.ts`: classes, chapters, stories, practice, `SKILL_NAMES`, `chapterTask` and `practiceTask`.
  - `progress.ts`: `switchClass`, `assignFirstClass`, `recordClassWork` and `restoreRun`.
  - `classes.test.ts`: tests.
- **New runtime:**
  - `class-visuals.js` (`MQClassArt`).
  - `class-games.js`: registers 40 chapter levels and 42 practice levels.
  - `classes.js` (`MQClasses`).
  - `styles/classes.css`.
- **Changed:**
  - `voyage-world.js`: rewritten per class.
  - `pathway.js`: class atlas; `mountTrail` takes a band.
  - `voyage-story.js`: `kicker` option.
  - `modern.js`: playground unlocks by slot.
  - `adult-dashboard.js` and `progressReport.ts`: class-aware.
  - `runtime/index.js`, `AdventureRoot.tsx` and `package.json` (`smoke:classes`).
- **Save:** `mq.playtest.v3` gains:
  - `grade`.
  - `classes` (stored per-class fields).
  - `classWork` (skills with attempts and the last 8 `{correct, independent}`).
  - `classRuns` (chapter checkpoints).
- **Chapter rounds are deterministic for a seed**, so a checkpoint replays the same question.

### Verification (2026-09-15, port 3001)

- **`npm run check` passes:** 36 test files / 285 tests, typecheck, lint and license audit.
  - The class tests generate every round of all 40 new chapters for 40 seeds (8,000 questions). Each must pass `validateTask`, accept its correct response and reject a wrong one.
  - They also cover answer formats, `switchClass` and legacy migration, bounded evidence, and the class-aware report.
- **Content review:** a sample of questions was reviewed as a teacher would. Fixes:
  - Grammar and plurals.
  - Half-hour clock choices.
  - Graph questions worded per graph, never "0 more".
  - Grade 3 fraction denominators limited to 2, 3, 4, 6 and 8.
  - Line plots whose longest and shortest data vary, and equal-share answers that divide evenly.
  - A specific reason for each shape-family true/false answer.
  - Story continuity for Nimbus.
- **New `smoke:classes` passes:**
  - A new player picks Grade 3; Escape does not skip the picker.
  - Tinker Hollow shows eight places with ready and locked states.
  - Chapter 1 runs from story through five questions, result, ending and bonus game. Evidence is recorded as supported, the checkpoint is cleared and Chapter 2 unlocks.
  - Chapter 2 resumes at question 3 with the same prompt after leaving.
  - The class practice atlas and a question trail work, and a concept trail opens.
  - Adults shows the class and skill rows. Switching to Kindergarten and back keeps each class's chapters and shared coins.
  - Playground unlocks follow slots.
  - A legacy save moves frog, fireflies and guardian to their classes.
  - Every one of the 40 new chapters (5 questions each), 23 question-practice trails and 6 expeditions is drawn and solved (229 questions), and each concept trail opens, with no JS errors.
  - A phone pass covers two Grade 4 chapters, the picker and practice with no horizontal overflow.
- **Existing suites, updated to play each chapter in its class** (saves get a `grade`; cross-class steps call `MQClasses.switchTo`). All of these pass with no JS errors:
  - `smoke:voyage`: the Workshop intro now uses the "together" line, because the Skyrail promise belongs to Grade 2.
  - `smoke:frontier`, `smoke:complete` (the certificate check is replaced by island and save checks) and `smoke:companion`.
  - `smoke:arcade`, `smoke:arena`, `smoke:learning` and `smoke:adventure` (which now picks Grade 1).
- **Contrast fix after screenshot review:** class chapter headers were dark on dark because class stages did not set `--trail-wash`. It is now set.
- **`smoke:flight` passes (rerun 2026-09-16):** 12 of 12 sky questions, 23 tens, best 5,790, no JS errors. On 2026-09-15 it had stalled on a loaded machine only: a frame-rate probe measured headless Chromium at 60 fps on a blank page and on the map but 10 fps inside Lantern Flight at about 63% CPU, and the flight caps each frame at 50 ms of game time, so its legs overran the suite's 70-second waits. No flight code or CSS changed in the class split.
- **Production build passes** (`npm run build`, 2026-09-16): compiled, TypeScript checked, six routes generated.
- **Not verified:** live AI, child playtesting, and teacher review of all 40 chapters' wording.

### Next steps

[CLASSES_HANDOFF.md](CLASSES_HANDOFF.md) is the working handoff for the next agent: the code map, the rules to preserve, how to verify, the remaining work in order, and the gotchas.

1. Art polish: new chapters use emoji landmarks on the shared island art. Give each class its own island tint and landmark art.
2. Ask a K–5 teacher to review the generated questions per class (`test-results/classes/boards/` has one screenshot per chapter question). Consider adding drawing-style items the syllabus mentions (draw shapes and angles).
3. Optional: class-specific badges and a class-completion celebration to replace the skipped certificate.

## Read first: the Muddle Monster Arena — owner-specified AI features (Claude Code, 2026-09-14)

**The owner resolved the open AI question by specifying four features, and they are implemented as one playable mode: the Muddle Monster Arena** (new **Arena** navigation tab, between Quests and Practice). The owner asked for a zero-shot Socratic AI companion, in-memory Elo adaptive difficulty, a dynamic scaffolding engine and a procedural misconception boss system. The brief named Python for the Elo and scaffolding engines; this app has no Python runtime (browser plus Next.js server), so they are pure TypeScript with the same formulas and tier rules, plus unit tests. The earlier section below, with three unselected proposals, is now history.

### Lantern Flight, rebuilt (owner request, 2026-09-14)

The owner liked the Flappy Bird–style Lantern Flight (the bonus game after Chapter 2) and asked for more detail, a longer game, learning in the natural flow of play, and more competition.

- **Longer and more detailed:** four legs, about three minutes in all: Firefly Meadow, Cloud Pass, Windy Canyon (wind gusts push Hoot up or down, with a visible label) and Moon Harbor (more shooting stars, a larger moon). Each leg has its own sky, parallax hills, village and leg banner. An intro card lists the legs and the rules before take-off.
- **Learning in the flow:** fireflies show how many lights they carry (1–3; golden ones carry 5) and fill a ten-frame lantern in the HUD. Every full ten lights a home and starts a new ten, so regrouping is visible without being explained. Three sky questions per leg: rings float in and the question appears 5 seconds ahead (“Your lantern has 27 lights. Which ring makes 30?”, and later “Which ring shows 10 more?” with totals on the rings). Flying through a ring adds its lights, and the question line explains the result (“27 + 4 = 31, one past 30”). No lights arrive while a question is open, so the lantern cannot change under the child.
- **Competition:** points for lights (10 each), full tens (50), right rings (150), shooting stars (200) and a leg without cloud bumps (300), multiplied by a chain multiplier (×2 after 8 catches or right answers in a row, up to ×4). A cloud bump or a wrong ring resets only the chain; points are never taken away and never depend on speed. Pip’s score (75% of the points the flight makes possible) and the saved personal best are on screen, with “You passed Pip!” and “New best!” moments. Medals: gold at the base points, silver at 60%, otherwise bronze.
- **Code:** rules in `src/adventure/flight.ts` (+ `flight.test.ts`): `LEGS`, `planLeg`, `makeGate`, `gatePrompt`, `gateResult`, `addLights`, `multiplier`, `basePossible`, `medalFor`, `rivalScore`, `restoreFlight`, `recordRun`. Runtime `runtime/mini-flight.js`; styles in `styles/minigames.css`; `scripts/adventure-flight.mjs` rewritten (phone layout check plus a full four-leg keyboard flight). Save: optional `flight` (`best`, `runs`, `medals`) in `mq.playtest.v3`, sanitized on read.
- **Not learning evidence:** like the other bonus games, flight answers are not recorded in the learner model or the adult dashboard.
- **Verification (2026-09-14, port 3001):** `npm run check` passes (35 files / 276 tests, including 7 new Lantern Flight rule tests over 60 seeded plans and every lantern count from 0 to 159). `smoke:flight` passes. At 390px with reduced motion, the intro, HUD and first sky question fit with no horizontal overflow. At 1180px, a keyboard-only autopilot that reads only the lantern count and ring labels flew all four legs: 12 of 12 sky questions, 20 tens, 5,010 points (silver, beat Pip’s 4,850), best score saved, Night Flyer badge, no JS errors. `smoke:adventure` and `smoke:complete`, which open or skip the game, also pass. Other suites were not rerun (no shared code changed); production build and live AI were not run.

### Hoot, the companion in every level (owner follow-up, 2026-09-14)

The owner asked for the companion to run throughout the game, not only in the Arena. Hoot is now one companion bar at the bottom of every level: the eight chapters, Story Lab adventures, practice trails and the Arena. The floating owl button and auto-hiding bubble were replaced; the arcade score panel keeps its corner.

- **What the child sees:** the owl, Hoot's current words with a moment label (for example “HOOT NOTICED YOU THINKING”), a “Hoot sees” line (hidden under 600px) and a “Help me think” button. The play area shrinks to leave room, so the bar does not cover controls; on scrolling pages it sticks to the bottom of the screen.
- **What drives it (`runtime/companion.js`):** a start line that opens with a question about the actual task; a nudge after 8, 16 and 24 seconds without any tap, key or typing (reset by each success); a line after every `miss` (after two in a row it offers help instead of giving a hint); a cheer after `solved` and on every third success in a row; the level's own hint when the child taps “Help me think” or the owl (AI rewording as before, dropped if Hoot has said something newer).
- **What each level reports (`api.companion.watch` → `{ sees, nudge }`):** river hops (position, hops to go, too far), glade (lantern lights lit, picked number), Guardian (shield number, first card, riddle, Pip), Skyrail (switches set), robot works (parts loaded), cloud bridge (planks laid), garden (area, fence, joined), water (jar levels), trails (discovery and try), Arena (problem, try, mix-up, help, boss move).
- **Honesty rules:** unprompted lines are built-in questions that never state an answer and are not counted as help. “Help me think” goes through the existing hint count, so it marks the attempt as supported. Unprompted nudges outside the Arena make no AI call. The full-screen bonus mini-games and the map are not covered yet.
- **Arena:** its separate side panel was removed; it speaks through the same bar and turns off the generic nudges (`api.companion.quiet()`) because it runs its own moments and the AI `companion` task.
- **Files:** new `runtime/companion.js`, `styles/companion.css` (now the final stylesheet) and `scripts/adventure-companion.mjs` (`npm run smoke:companion`); changed `Shell.tsx`, `runtime/core.js`, `runtime/index.js`, `AdventureRoot.tsx`, `frog.js`, `fireflies.js`, `guardian.js`, `voyage-games.js`, `frontier-games.js`, `pathway.js`, `arena.js`, `arena.css`, `scripts/adventure-arena.mjs`, `package.json`.
- **Verification (2026-09-14, port 3001):** `npm run check` passes (34 files / 269 tests, typecheck, lint, license audit). New `smoke:companion` passes at 1180px and 390px (reduced motion) with AI off: the same bar in a story chapter, a practice trail, a Skybound mission and a garden mission; “Hoot sees” follows moves; a pause nudge, “Help me think” (counted in `hootAsks`), a miss and a success each change what Hoot says; every checked control stays clickable with the bar on screen; no provider requests. It caught one real bug, now fixed: on phones the river pushed the hop buttons under the bar, so the river now takes only the height that is left. After the change, `smoke:arena`, `smoke:adventure`, `smoke:learning`, `smoke:arcade`, `smoke:voyage`, `smoke:frontier`, `smoke:complete` and `smoke:flight` all pass with no JS errors. Production build and live AI were not run.

### One loop per problem

| Feature | What the player sees | Logic | Guardrails |
| --- | --- | --- | --- |
| Elo adaptive difficulty | “Challenge level” (starts at 1000) and “This problem” rating with Warm-up / Good fit / Stretch; the next category matches the rating | `src/adventure/elo.ts`: `expectedScore`, `updateRating` (K = 32, clamped 400–2000), `chooseCategory`, `recordEncounter`, `startSession`. Seven fixed categories from 700 (adding within 20) to 1350 (unlike-denominator fractions) | Only the first answer to each problem updates the rating. Session-only (`sessionStorage` key `mq.arena.elo`); a new tab starts fresh. Never used as mastery evidence. First problem is the exact match; no category three times in a row |
| Dynamic scaffolding | Help pips. Tier 1 highlights the ones column / denominators after more than 5 s; tier 2 shows block arrays or fraction bars after 1 incorrect attempt; tier 3 groups blocks by tens or shows same-size pieces after 2 | `src/adventure/scaffold.ts`: `ScaffoldEngine` (`addTime`, `recordError`, `tier`, `action`, `reset`), `tierFor`, `SCAFFOLD_TIERS` | Help never drops within a problem. The timer pauses for hidden tabs, open dialogs, the result card and boss fights. Tier 1 is emphasis only and does not mark an answer as supported, so no speed signal enters evidence |
| Misconception diagnosis and bosses | A diagnosis card with a code (for example `ERR_SUB_BORROW → SPAWN_BORROWING_BEHEMOTH`) labeled “found instantly by code” or “found by AI”, then a boss whose mechanic repairs the idea | `src/adventure/arenaMath.ts`: generators, `classifyAnswer`, `plausibleCode`, `diagnosis`, `BOSSES`, mechanics. AI task `diagnose` | Rules classify known patterns instantly with no model call. The model sees only answers the rules call `ERR_UNKNOWN`, is offered only codes that can apply, and code rejects implausible labels. 2.5 s client budget. Every boss move and final answer is code-checked |
| Socratic companion (always present) | Owner follow-up: Hoot is there the whole time, analyzing what the child is working on. A companion panel sits beside every problem (sticky rail on wide screens, pinned above the work under 900px) with a “Hoot sees” line and a “Help me think” button. Hoot asks where to start; nudges after a pause; reads a typed draft (fraction without a slash, an answer already tried); asks about the specific mix-up after a wrong answer; names the next boss move after each successful move; looks closer after a move that fails; cheers when solved. Built-in lines appear instantly; accepted AI questions replace them and are labeled “AI companion” | `arenaMath.ts`: `companionLine`, `draftNote`, `COMPANION_MOMENTS`, `AI_MOMENTS`, `BOSS_STEPS`, `bossStepFits`. AI task `companion` (`src/ai/adventure/arena.ts`: `COMPANION_SYSTEM`, `companionMessage`, `validCompanionRequest`, `acceptCompanion`), replacing the earlier `socratic` task. Runtime: `coach`, `watch`, `readDraft`, `bossStep` in `runtime/arena.js` | Code chooses the moment; AI only words a question for `hesitate`, `mistake`, `boss` and `ask`. Requests carry only the problem, up to 3 wrong answers, the code, tier and boss step; the server rejects wrong answers that are correct, implausible codes and boss steps that do not fit. Replies: one sentence ending in “?”, at most 24 words, allowed numbers only, no stated answer (including equivalent fractions), no “wrong”. Drafts are never judged right or wrong. At most 3 unprompted nudges per problem (after 5 s still, later 12 s); typing or any move resets the wait. Start, pause and boss-move nudges do not mark an answer as supported; a mix-up question, a boss or “Help me think” does. 4.5 s budget; stale replies are ignored. The floating HUD Hoot is hidden in the arena so there is one Hoot |

**Bosses:** Carry Colossus (`ERR_ADD_CARRY`, `ERR_ADD_CONCAT`: bundle ten One-Blocks into a Ten-Block, then name the total); Borrowing Behemoth (`ERR_SUB_BORROW`: shatter a Ten-Block into ten One-Blocks, take away the ones and then the tens, name what is left); Denominator Demon (`ERR_ADD_DENOMINATOR`, `ERR_FRAC_KEEP_DENOMINATOR`: choose a slice size that works for both pizzas, combine, name the fraction; equivalent fractions count). `ERR_WRONG_OPERATION`, `ERR_OFF_BY_ONE` and `ERR_UNKNOWN` get the question and scaffolds but no boss. Each boss appears at most once per problem. A run is six problems and ends on the shared result card (“Back to the arena”).

### Code, save and API

- **New:** `src/adventure/elo.ts`, `scaffold.ts`, `arenaMath.ts` (each with tests); `src/ai/adventure/arena.ts` (+ `arena.test.ts`); `runtime/arena.js`; `styles/arena.css` (now the final stylesheet); `scripts/adventure-arena.mjs` (`npm run smoke:arena`).
- **Changed:** `src/ai/adventure/schemas.ts` (tasks `diagnose` and `companion`, their outputs); `src/app/api/adventure-ai/route.ts` (arena request validation, companion moment checks and the rules fast path); `runtime/core-ai.js` (`diagnose`, `companion`); `runtime/core.js` (optional `resultKicker` and `resultLabel` on a level); `runtime/voyage-world.js` (sixth tab); `runtime/arcade.js` (auto-mode pop-ups may anchor to `[data-arcade-anchor]`); `runtime/index.js`; `AdventureRoot.tsx`; `package.json`; `scripts/adventure-learning.mjs` (its phone check of the old journey map now runs only while that hidden map is shown).
- **API:** ten tasks. Arena requests carry only a generated problem and a digit or fraction answer. The server rejects impossible problems and correct answers with 400 before any model call. Model settings are unchanged and still unverified against a live account.
- **Save:** `mq.playtest.v3` gains optional `arena` (`bosses` defeat counts, `runs`), sanitized on read. Arena evidence uses the existing models: addition goes to the learning model (`simple`/`twoDigit`/`regroup`, format `equation`); subtraction and fractions go to the curriculum model with `mode: "arena-equation"`. An answer is independent only on the first check with no hint, question or boss. Arena stars, arcade score and Elo are not mastery.
- The arena is a `pathway` level (`id: "arena"`): no chapter unlock needed, and it does not change the eight-chapter story.

### Verification (2026-09-14, port 3001)

- `npm run check`: 34 test files / 269 tests, typecheck, lint and license audit pass (rerun after the always-present companion change). Unit tests cover Elo formulas, choice and sessions; scaffold tiers; generated problems, diagnosis, boss mechanics; companion safety for every moment, help tier, plausible code and boss move across generated problems of every category; draft notes that never judge a new answer; and AI schemas, companion moment validation, validators and the route with a mocked provider.
- Always-present companion in the browser (`smoke:arena`, rerun after the change): Hoot is visible from the first second with a start question; the desktop run sees the pause nudge at 5 s (with a mocked AI `hesitate` request at tier 1), a draft note for a fraction typed without a slash and for a repeated wrong answer, the mistake question with the right code, tier and wrong answers, next-move lines through all three bosses, an AI `boss` request after a failed move, “Help me think”, the solved cheer, and Hoot inside the viewport while a monster is on screen (pinned above the boss at 390px). The floating HUD Hoot is hidden in the arena.
- `smoke:arena` passes at 1440px (normal motion, AI mocked on) and 390px (reduced motion, AI off). It covers the landing and monster book; Elo 1000 → 984 after a wrong first answer and rising after correct ones; the 5-second highlight; the keypad; a rules diagnosis with no `diagnose` request; an AI Socratic question with the right code and tier; all three boss mechanics including wrong moves; an AI diagnosis for an unknown answer and a rejected implausible label; tier-3 grouped blocks; saved evidence; the result card; no JS errors, no horizontal overflow and nav buttons at least 48px.
- Regression after the change: `smoke:frontier`, `smoke:voyage`, `smoke:complete`, `smoke:arcade`, `smoke:learning`, `smoke:adventure` and `smoke:flight` all pass with no JS errors. `smoke:learning` needed one test-only fix: its 390px journey-map overlap check now runs only when that old map is shown (the island view hides it). After the always-present companion change, `smoke:frontier` (other AI tasks and fallbacks) was rerun and passes; the other suites were not rerun because that change touches only arena files and the removed `socratic` client call. The production build was not rerun.
- **Not verified:** live provider responses and latency for `diagnose` and `companion`, how often children trigger unprompted nudges in real play, deployment, child playtesting.

### Next steps

1. With the owner's authorization, run a small live check of `diagnose` and `companion` for each moment (acceptance rate, latency, rejected outputs).
2. Write the demo script around one Arena run: Hoot's start question → a pause nudge → wrong answer → diagnosis card → Hoot's mix-up question → boss moves with Hoot naming the next move → Elo change.
3. Optional: bring the always-present companion panel to other levels through their existing hint facts, reuse `diagnose`/`companion` in existing chapters (for example Guardian spells), and add more misconception bosses (multiplication, place value).
4. Known cosmetic issue: the HUD title still reads “Addition Forest” on island tabs.

## Earlier handoff: AI direction before the arena (Codex, 2026-09-14)

**The implementation is ahead of the older notes, but the owner still wants a stronger AI game.** The latest coding pass built eight chapters, eight bonus games, Story Lab and an adult dashboard. The owner then said the AI features were not enough: AI must be an active main feature that makes the hackathon entry clearly AI-powered.

The assistant proposed three directions: **Teach Pip, Save the Isles**, **Imagine It, Play It**, and **A Village That Thinks**. These are **unimplemented proposals, and the owner has not selected one**. The assistant recommended the first; that recommendation is not a product decision. The owner's latest response was: “didnt understand the teach pip, before that update everythimh to the current state so that claude can work on it now”.

**This handoff updates documentation only.** No flagship AI implementation followed that discussion. When continuing with the owner, first make the proposed gameplay concrete and understandable; do not assume that the recommended Pip concept was approved. See [AI_PLAYBOOK.md](AI_PLAYBOOK.md) for the three proposals and the distinction between the existing Teach Pip interaction and the proposed AI teammate.

### Current snapshot

| Area | Actual state |
| --- | --- |
| Main route | `/`: The Lantern Isles; eight sequential story chapters across Lantern & Sky and Moonseed Coast |
| Math | Addition/make-ten/regrouping, compound arithmetic, multiplication/division, fractions, area/perimeter and capacity; seven optional concept trails plus a mixed expedition |
| Rewards and exploration | Eight chapter bonus games, computer-Pip competitions, keepsakes, camp decoration, five navigation tabs |
| Latest replacements/additions | Cloud Courier replaces the lane-choice race; Chapters 7–8, Prism Pop, Glow Orchestra, Story Lab and Adults are implemented |
| Current AI role | Bounded narrative, hints, explanation feedback, world naming and adult notes; no AI-controlled teammate, generated game rules, or autonomous village |
| Existing Teach Pip | Three authored addition mistakes and optional AI feedback on a short explanation; not a teammate that learns a strategy and acts in the world |
| Local AI connection | Read-only check on 2026-09-14: `http://localhost:3001/api/adventure-ai` returned `{"enabled":false}`; no live provider request was made |
| Learning evidence | Browser-local attempts distinguish independent success, supported success and incorrect attempts; the dashboard does not certify mastery |
| Original MVP | `/classic` remains available; its pure learning engine also supports parts of the adventure |
| Repository | Branch `fix/guardian-scene-layout`, HEAD `fd35a370b753f24ed2e5e37a4c0b217a6580eb70`; substantial local changes, including the adventure and its docs/scripts, remain uncommitted/untracked |

### What the next agent needs to preserve

- The user wants a playful application/game with exploration, connected characters, meaningful math actions and a learning pathway. Another decorative AI helper or more generated text alone does not address the latest feedback.
- Keep the current games, saves and adult evidence working while a stronger AI direction is developed. The user has not asked to remove Story Lab or the existing Teach Pip.
- Read [CLAUDE.md](../CLAUDE.md) for commands and constraints; read the installed Next.js guides before code changes. The actual runtime import order and final CSS layer are in `runtime/index.js` and `AdventureRoot.tsx`.
- The prior “AI only writes text” design describes today's implementation. It must not be treated as a reason to dismiss the owner's request for active AI. A future agent can propose constrained actions or generated board data; deterministic code must still validate legality, mathematical correctness and progression. Those action/schema systems are not built yet.
- Preserve other agents' working-tree changes. No commit, push, deployment, key change or paid provider test was performed in this documentation handoff. Do not include secrets or generated test artifacts in a future commit.

### Verification at handoff

The last implementation pass passed `npm.cmd run check` (**30 test files / 226 tests**, typecheck, lint and the 437-package license audit), the production build, and `smoke:frontier`, `smoke:voyage`, and `smoke:complete`. The first two cover desktop/phone; the last covers tablet/phone. AI success paths were **mocked**. Earlier adventure/arcade/learning/flight runs passed before the final extension; they were not all rerun after it. Focused accessibility checks and screenshot review passed as detailed below.

These are recorded implementation results, not fresh test runs for this docs-only handoff. Real provider compatibility/output/latency, deployment, full practice-trail completion and child/proxy playtesting remain unverified. See sections 8–9 for current limitations and next priorities.

The continuation sections below preserve the work history. **“Earlier continuation” sections describe their own point in time**: old counts, the rally and earlier final stylesheets there are historical. The snapshot above and numbered current-reference sections take precedence.

## Latest implementation: A Place to Grow, Story Lab, and adult dashboard (Codex, 2026-09-14)

The owner found the lane-choice race uninteresting, asked for more playable games and chapters, requested a real adult dashboard, and emphasized AI as a core feature. This section supersedes the six-chapter/six-bonus description below. The current product has **eight story chapters, eight bonus games, two explorable regions, and a fifth navigation tab: Story Lab**.

### Games and story

- **Cloud Courier** replaces Cloud Kart Rally in the Chapter 4 outro and Arcade. Push two parcels onto doorsteps in each of three small depot mazes. Real collision/pushing rules, touch D-pad and arrow keys, unlimited undo/restart, and hints from a bounded breadth-first solver. Seeded rotations/reflections vary the three authored layouts. A route score rewards fewer moves, without time pressure. Old `rally` save fields remain harmless legacy data; their distance scores are not converted into courier scores.
- **Chapter 7: The Garden That Belongs to Everyone** (`garden`, Moonseed Meadow). Nimbus wonders whether clouds can put down roots. Design connected flower patches, first to match area and later both area and perimeter. The board draws actual exposed fence edges and accepts any valid connected construction. Four seeded encounters grow from small patches to larger fenced plots. Undo and Hoot support are available.
- **Chapter 8: The Last Little Tidepool** (`water`, Tideglass Cove). Nimbus learns that a little rain can help the island’s smallest residents. Fill, empty, and pour between two jars until either holds the requested amount. Pours stop at an empty source or full destination; quantities and the amount moved are visible. Four seeded, solver-verified encounters introduce capacity, subtraction, and planning. Hoot derives a legal next move from the current jars.
- **Prism Pop**, after Chapter 7: preview a connected gem cluster, pop it, and let the board fall/refill. Four distinct shapes, larger-cluster scoring, a 180-sparkle goal, no move or time limit, and guaranteed available moves.
- **Glow Orchestra**, after Chapter 8: four synthesized instruments and eight beats. Toggle notes, play/pause the loop, follow the beat visually, and save the tune. An in-game sound toggle updates the shared sound preference; the loop stops on hidden tabs/exit. No recording or external audio. The 32-note pattern persists locally.
- The **Moonseed Coast** region contains the new landmarks; the earlier six remain in Lantern & Sky. Region controls occupy a separate toolbar row so they cannot cover a landmark. Quests lists all eight chapters in order. The original three chapters and their mini-games, seven practice trails, Skybound games, camp, keepsakes, and computer-Pip competitions remain.

### Visible AI and adult evidence

- **Story Lab** (`runtime/dream-lab.js`) is the fifth navigation tab. Choose a moon picnic, undersea party, dinosaur sleepover, or candy carnival; choose garden design or water rescue. When AI is configured, optionally submit a short fictional story idea (80 characters). The new `mission` task uses the chosen setting/activity, remembered promise to Nimbus, and a coarse actual practice context to create a title, opening, four encounter beats, and an ending. The result becomes a playable side adventure with themed scenery. AI text never defines numbers, rules, controls, or unlocks.
- Built-in story mode works without a provider. The preview and game explicitly identify AI-created versus built-in stories; rejected/failed requests return an honest fallback. Changed choices abort pending requests and invalidate stale results. Side adventures use `dream-garden`/`dream-water` level IDs and do not unlock main chapters. The current blueprint is session-local; starting it again is a new run, not a promised saved AI-story session.
- **Contextual Hoot** in the two new construction games: local guidance appears immediately, then an optional AI rewording uses actual board state and code-derived guidance. A hint/support flag persists for the encounter. Old-round and departed-level responses cannot overwrite a newer move. The shared Hoot setter also invalidates prior pending hint text.
- **Adults** in the HUD, camp, and Story Lab opens a native dashboard (`runtime/adult-dashboard.js`). It shows chapters completed, skills with evidence, and each skill’s retained recent attempts: independent, correct after help/retry, and not correct. Filter all/practiced/support-needed skills, reveal a practice suggestion, download a local text snapshot, or request an AI coaching note grounded in aggregate counts. Empty states are honest. It does not claim a grade, diagnosis, time trend, unique-question count, or mastery percentage.
- `progressReport.ts` combines the existing addition model, seven curriculum skills, and compound rail-sequence evidence without double-counting voyage’s mirrored fraction/robot records. Each skill displays at most eight recent attempts. The overall recent totals sum these per-skill windows; there are no dates in the old evidence, so this is not a daily or historical dashboard.
- **AI status remains off in the actual local server** (`GET /api/adventure-ai` → `{enabled:false}`). Configuration instructions are available in Adults → AI connection & data and README. Provider code is implemented, but no live paid request has been made or claimed. Browser tests mock configured/off states, and server tests mock the provider. See `docs/AI_PLAYBOOK.md` for implemented capabilities and next AI opportunities.

### Code, saves, and verification

- Pure rules: `frontier.ts` (garden geometry, jar operations/solver, courier rules/solver, gem groups/gravity). Runtime: `frontier-games.js`, `frontier-minis.js`, `dream-lab.js`, `adult-dashboard.js`; final stylesheet: `frontier.css`. No dependencies, external assets, fonts, or recordings were added.
- `voyage.ts` now includes `garden` and `water`; checkpoint records are partial so older three-chapter voyage saves survive the expanded key set. Main encounters save completed rounds and support flags immediately. The original `mq.playtest.v3` key is unchanged. New fields: optional `dreamProgress` for the current side-adventure run, `playRecords.courier`/`.prismpop`, and `orchestra` (validated boolean pattern). New math evidence flows through the existing curriculum model as `area-perimeter-design` and `capacity-pouring`; arcade scores never feed that model.
- AI request/output shapes, frozen prompts, and validators are in the existing `src/ai/adventure/` modules. Mission output is structurally checked, length-limited, and rejects markup, numeric claims and some disallowed content. Optional ideas are delimited as untrusted data in the prompt. This is bounded generation, not a guarantee that every possible response is pedagogically perfect. All math stays in deterministic code. Client requests have a ten-second bound; failures use built-in content.
- `npm run check` passes: **30 files / 226 unit tests**, typecheck, lint, and license audit (437 packages). Production build passes. Unit coverage includes hundreds of reachable generated missions, edge connectivity, water conservation, all courier layout variants, gem-board liveness, old checkpoints, evidence accounting, AI schema/validation, and mocked server errors.
- `smoke:frontier` completes Chapters 7–8 on **1440px desktop and 390px phone**, covering wrong attempts, undo, a support flag and checkpoint reload, all new minis, tune persistence, the adult dashboard/filter/export, AI mission choices, contextual hint requests, coaching-note facts, and rejected/offline fallbacks. It also completes a four-mission AI-shaped side story using mocked output. Screenshots: `test-results/frontier/`.
- `smoke:voyage` passes both sizes with the courier replacement, the original Skybound story choice and all twelve missions, all three chapter bonuses, keepsakes/camp and reload. `smoke:complete` passes tablet/phone for the original Chapters 2–3, Teach Pip, dance, certificate, journal and saved progress after the region-toolbar fix.
- A focused axe audit at 390px reports no violations for color contrast, button names, valid ARIA attribute values and dialog names on the coast, both construction games, all three new minis, Story Lab, a themed side mission, and the dashboard. It is not a full accessibility certification. Screenshot review also tightened phone controls and prevented older toast overlays from obscuring the new games.
- Remaining verification: real provider responses, deployment, child/proxy playtesting, exhaustive completion of the seven original practice trails, and a longer-term runtime lifecycle/CSS isolation refactor. Nothing has been committed, pushed, or deployed in this continuation.

```powershell
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:frontier
```

## Earlier continuation: The Lantern Isles / Skybound (Codex, 2026-09-13–14)

The owner asked for an application that feels like a game: exploration, a connected narrative, more interesting calculations, and playful or competitive rewards after chapters. The home screen is now **The Lantern Isles**, an explorable island. The old atlas remains under Practice. This section supersedes older descriptions of the home screen below.

- **Game shell and exploration:** `runtime/voyage-world.js`, `runtime/voyage-art.js`, `styles/voyage.css`. Original SVG island, six landmark buttons, a moving hero, tap-to-walk, arrow-key movement and Enter to visit nearby places, horizontal exploration on small screens, and a fullscreen control where supported. Four navigation tabs: Explore, Quests, Practice, Arcade. Camp provides the learning journal, shop and badge book, including on phones. All artwork remains authored SVG/CSS with system emoji; no new dependencies or third-party assets.
- **Connected story:** six chapters in order. The original Lantern Valley chapters remain intact. Chapters 4–6 are **Skybound: The Little Storm**. Nimbus is a lost cloud whose attempts to call for help caused the mist. The player chooses to listen or find a way together; Nimbus remembers that promise in the next chapter. Pip connects through his own experience of making mistakes. The ending reunites Nimbus with family and gives the character a second home with the player. Authored dialogue works offline; no new AI task or paid request was added. `runtime/voyage-story.js` uses native dialogs, explicit Next/Skip controls and Escape.
- **Three new math games**, each with four encounters, generated replay values, code-checked outcomes, gentle retries, Hoot support, and checkpoints:
  - **The Runaway Skyrail** (`skyrail`, Chapter 4): choose two or three number switches; the train applies addition, subtraction and, later, multiplication in sequence. Launching animates the train and shows each calculation. Any route reaching the parcel’s destination is accepted.
  - **The Moonbeam Workshop** (`robotworks`, Chapter 5): every robot has a recipe. Plan batteries and gears for the full crew, then divide required supplies into crates. The crew animates into life when both supply belts match the recipe. Later missions use multi-part crates whenever possible.
  - **A Bridge Back Home** (`cloudbridge`, Chapter 6): compose halves, thirds, quarters and sixths using a shared whole-bridge ruler. Equivalent constructions work; later crossings require at least two planks. The correct bridge carries Pip, robots, Hoot and finally Nimbus home.
- **Three new chapter rewards** (`runtime/voyage-minis.js`), automatically reached from the chapter result and replayable from Arcade:
  - **Cloud Kart Rally** (`rally`): six turns against computer Pip; choose a lane, catch a visible tailwind, and spend two boosts. Decisions have no time limit.
  - **Bumper Bowls** (`bowls`): five aimed gear throws, adjustable power, visible wind, distance-based scoring, and a computer opponent. Results stay visible until Next throw.
  - **Constellation Club** (`starmatch`): twelve cards / six matching pairs, unlimited initial study time, alternating turns, and a Pip opponent that remembers revealed cards. Explicit controls separate the turns; there are no timed reveals.
  - The three original story minis remain, making six bonus games in total. These new opponents are local computer characters, not online players. Competition does not affect math progress or evidence.
- **A world to return to:** three discoverable keepsakes with character stories; later keepsakes open after story milestones. Nine garden patches can be decorated with flowers, mushrooms or lanterns; the garden and pocket persist. Nimbus appears on the island after the Skyrail; the final bridge restores a rainbow.
- **Rules and save:** `src/adventure/voyage.ts` (+ nine unit tests) contains seeded puzzle generation, deterministic checks, chapter dependencies, save validation and competition rules. `runtime/voyage-games.js` owns the encounter UI. Save key is still `mq.playtest.v3`; the new `voyage` field contains `promise`, `keepsakes`, `camp`, `runs` (seed, completed round count, independent count, support flag), `recent`, `records`, and `visits`. Old saves get defaults without losing existing progress. Failed attempts and hints persist a support flag across reloads. Completed encounters save immediately; replaying a completed chapter uses a fresh seed. A departed level’s pending animation cannot write further progress.
- **Learning evidence:** robot/fraction outcomes feed the existing curriculum practice model with distinct representation names, keeping independent answers separate from hints/retries. Compound rail routes are recorded as operation sequences in voyage evidence rather than mislabeled as an isolated subtraction skill. Stars celebrate completion/independence; they do not certify curriculum mastery. The new campaign encounters increase authored complexity across a chapter; they do not claim a new adaptive placement system.
- **Integration:** new levels register as `pathway: true, campaign: true`, so legacy three-node map and certificate calculations stay scoped to their original chapters. `core.js` supports optional `canOpen`, `intro`, and `outro` hooks; campaign results continue into narrative and bonus games. The final imported stylesheet is now `voyage.css`. New story math uses quieter arcade feedback to leave room for equations and construction animations. Existing browser scripts have been updated to enter chapters through the island’s destination dialog.
- **Verification (2026-09-14, port 3001):** `npm run check` passes: 27 files / 209 tests, type checking, linting and the license audit (437 packages). Production build passes. `smoke:voyage` passes on desktop (1440px, normal motion) and phone (390px, reduced motion), covering all twelve new missions, incorrect attempts, story choice and recall, reload between encounters, saved garden/keepsakes, all three competitions, six restored chapters, replay and leaving mid-animation. `smoke:arcade` and `smoke:adventure` also pass on tablet/phone. Screenshots are in `test-results/voyage/`, `test-results/adventure-arcade/` and `test-results/adventure-shots/`. A focused axe audit at 390px reports no violations for color contrast, button names, valid ARIA attribute values, or dialog names on the cover, island, all three new missions and all three new minis; this is not a full accessibility certification. All browser runs mock AI status off and report no JavaScript errors.
- **Verification fixes:** rail instructions now have a solid contrasting background; mini-game primary buttons use dark text; badge toasts do not obscure the new construction games or story/bonus screens. The mobile header uses one row and a normal-flow Back button. Next's floating dev indicator is disabled through the documented `devIndicators` option because it covered the phone's Explore tab. The older smoke tests now wait for each river landing and send Firefly concurrency probes in one browser task, so they test the intended state rather than racing animation completion.
- **Final regression:** `smoke:complete` also passes on tablet and phone, including both original later chapters, Teach Pip, the Guardian riddle, Dance Party, certificate, journal and restored progress after reload. Lint and the production build passed again after the final interface changes. No commit, push, deployment or paid AI request was made.
- **Boundaries:** exploration is a 2D illustrated island with free movement and destinations, not a physics-driven 3D open world. The atlas still needs exhaustive completion coverage across its seven earlier trails. Live AI, deployment, and child/proxy playtesting remain unverified. Changes remain local and uncommitted.

```powershell
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:voyage
```

## Earlier continuation: arcade layer (Claude Code, 2026-09-13)

The owner played the storybook build and said the games still did not feel like an arcade. This pass adds a shared arcade layer to every level. It does not change any math, answer checking, learning evidence, hints, stars or progression, and Codex's work below (atlas, learner model, storybook art, accessibility) is intact.

- **Codex's learning atlas (recorded here because the section below predates it):** the map now opens with "Your learning atlas": seven hands-on trails (subtraction, multiplication, division, fractions, patterns, measurement, geometry) and a mixed "Mystery expedition" of five discoveries. Code: `runtime/pathway.js`, `src/adventure/curriculum.ts` (+ tests), `styles/pathway.css`. Trails are registered as `pathway` levels, keep their own practice model under `curriculum` in the save, and offer "Show me a step" and gentler numbers. They have unit tests but no browser smoke test yet.
- **Scoring rules** (`src/adventure/arcadeScore.ts`, 11 unit tests): a streak counts consecutive successes, and a miss resets it to zero. Points are never taken away and never depend on time. The multiplier rises one step per success (one per four clean hops in Frog Hop), capped at ×5. Power mode starts at a streak of 3 (8 in the river) and doubles points until the next miss. Best scores are saved per level under `best` in `mq.playtest.v3` and sanitized on load.
- **Shared layer** (`runtime/arcade.js`, `window.MQArcade`; `styles/arcade.css` is now the last style layer): `core.js` attaches a run to each level as `api.arcade`, starts it after mount (Ready?/Go! banner and a synthesized per-game soundtrack) and ends it inside `api.finish`, which saves the best score and adds a score tally to the result card. Run API: `hit`, `bonus`, `miss`, `pickup`, `say`, `banner`, `impact` (ring, capped flash, world-only shake, 60–120 ms hit-stop), `trail`, `zap`, `shatter`, `gust`, `fireworks`, `charge`, `note`, `finish`, plus `frozen` for animation loops. The score panel (score, multiplier, power meter) sits under Hoot, outside the stage.
- **Frog Hop:**
  - Glow bits sit on the pads between the start and the landing pad. In guessing rounds they appear after the guess, so they never reveal the answer.
  - A +10 hop sweeps up a whole row mid-air ("Super leap!") and lands with a splash and a river shake.
  - The catch pops "Caught it!" or "Bullseye!". The round card lists bonuses: Bullseye guess +500, Perfect round +200, Smart hops +150.
  - Round banners; a golden glow on the river and hopper in power mode.
- **Make-10 Fireflies:**
  - Each connection scores with the streak; three in a row turns on power mode (rainbow banner, hue-shifting lights, brighter glade).
  - Golden lights add +300. They are still ordinary numbers, marked with a ★ badge and "Golden" in their label.
  - Triples crackle with lightning, and every fusion knocks nearby lights aside.
  - "One more ten!" and "Lantern full!" banners with fireworks. The equation still floats up for every connection.
- **Guardian Duel:**
  - A boss bar with one segment per shield and a lagging drain. It sits above the shields on wide screens and below them under 1100px.
  - Spells charge with converging sparks and fly as trailing bolts. A first-try spell lands as a "Critical!" with double points.
  - Shields shatter into leaf shards. A spell that does not match gets a "Blocked!" glint and a leaf gust, and only cools the streak.
  - Riddle attack banner and "Perfect block!", a "Teamwork!" bonus after teaching Pip, and "Final shield!" and "Shields down!" banners.
- **Result card, map and badges:** the score counts up with a "New best!" stamp and up to four highlight chips (best streak, power mode, bullseyes, super leaps, perfect rounds, golden glows, triples, critical spells, perfect block). The map's next-chapter card shows "🏆 Best score". Two new badges, Power Surge (`powerMode` event) and High Scorer (`newBest` above a previous best), make 22 in total.
- **Atlas trails and mini-games:** trails score each discovery through the bus events `solved` and `miss`, with pop words over the puzzle board. The panel shows on screens 1280px and wider, where it clears the trail header. The story mini-games get cheers only, through `kit.cheer`: Lantern Flight light chains, Dance Party "Perfect beat!", Mist Painter "Halfway there!". They keep their no-score, no-fail design.
- **Comfort and accessibility:** pop words, points, banners and effects are decorative (`aria-hidden`); banners and power mode are announced through one polite live region. Reduced motion and calm mode keep the numbers and words but remove shakes, flashes, hit-stops, particles and slide-ins, and flashes are throttled to about two per second. Calm mode also turns the music off; its button label and toast now say so. Music follows the sound button and stops on hidden tabs, on the result card and when leaving a level.
- **Verification (2026-09-13, dev server on port 3001):** `npm run check` passes (26 files, 200 tests). All browser checks pass with no JS errors: `smoke:adventure`, `smoke:complete`, `smoke:learning`, `smoke:flight` and the new `smoke:arcade`.
  - On tablet, `smoke:arcade` plays all three chapters and checks glow bits, round bonuses, power mode, the boss bar, critical spells, a blocked spell, and the result tally with a saved best.
  - On phone with reduced motion, it checks the panel, bonuses, boss bar and horizontal overflow.
  - Screenshots are in `test-results/adventure-arcade/`.
- **Follow-ups:**
  - Playtest music volume and the amount of pop text with children; it is busiest in Fireflies power mode.
  - Consider a separate music toggle if calm mode proves too broad.
  - Add a browser smoke test for the atlas trails.

## Earlier continuation: explorer's storybook (Codex, 2026-09-13)

The current UI has been substantially refreshed from the glass/emoji prototype described in the history below. All changes remain local and uncommitted; the previous Claude Code work has been preserved.

- **Visual direction:** warm paper, forest green, generous spacing, a new illustrated book cover and hand-authored SVG valley/Hoot artwork (`runtime/art.js`). Five world palettes have their own scenery (trees, planets, coral, lollipops, volcanoes). No new third-party assets or dependencies.
- **Map:** the three playable chapters form one clear journey, alongside the next discovery, a three-part Great Lantern meter and the discovery journal. Removed the two nonfunctional "coming soon" nodes; the playtest unlock button is hidden. The Playground has separate pastel cards with visible previews even while locked.
- **Discovery journal:** reports observed actions (big hops, make-ten connections, teaching Pip, recovery after a mistake). A keyboard-accessible grown-ups disclosure shows each skill's last eight attempts, independent answers, successes after support/retries, and next practice direction. It does not equate chapter completion with assessed mastery.
- **Frog Hop:** a live tens-and-ones model makes place value visible. Repeated overshoots offer gentler paths; replays use `src/engine/generators.ts` via the small, tested `riverLearning.ts` adapter. First-play teaching numbers stay stable. Purchased hats now appear on the hopper.
- **Firefly Tens:** a ten-frame fills when a number is selected. Wrong connections explain how many too many/few. Combos reward consecutive connections with no speed window. Connection animations are serialized, preventing concurrent fills/overrun; a partner pair is guaranteed among available numbers. Calm/reduced-motion play uses stationary, spaced numbers. Two unsuccessful connections before a success also make the lights stay still for the rest of that visit. Keyboard focus pauses a moving number.
- **Guardian:** the block button beside the spell opens an accessible native dialog comparing the target with a selected card as tens and ones. After a pattern of mistakes/support, subsequent shields use simpler generated addition; replays generate shields and riddles. Cards are disabled during spell resolution. Riddle bubbles stay still with reduced motion and pause when focused.
- **Persistent learner evidence:** `learning.ts` adapts the existing deterministic learner model and tutor policy; `runtime/learning.js` stores it under `learning` in `mq.playtest.v3`. River outcomes, make-ten connections, Guardian spells and riddles record their actual skill/level and keep first attempts, hints and retries separate. Guided river finishes and the Guardian block helper count as supported. No response-speed or inferred-misconception signal is used. River replays and Guardian numbers use the policy within their chapter's skill, capped below 100 for shields/river. Old or malformed learning subtrees recover without resetting the adventure.
- **Accessibility/comfort:** cover, hero picker, journal and certificate trap keyboard focus and make the background inert. Phone sound control is visible; sound preference persists. Calm mode reduces particles and suppresses shakes, in addition to scenery. Offline AI text inputs are hidden, leaving the working idea cards and theme presets.
- **Implementation:** `styles/storybook.css` is the final style layer; `runtime/accessibility.js` manages the new full-screen dialogs. The vanilla-runtime architecture remains in place.
- **Verification:** `npm run check` passes (24 files, 173 tests); production build passes; original chapter-one/tablet/phone smoke passes. Automated text-contrast checks on the refreshed title and map report no violations. Later chapters, both Pip lessons, riddle, all dance sequences, certificate, journal and saved progress have passed on tablet and phone. The new learning check verifies block-helper focus, supported/retry evidence, a simpler follow-up shield, saved levels, older saves and steady fireflies at 1180px and 390px. Unit tests sample 1,000 generated shields and verify a unique valid regrouping pair. Screenshot review also covers 360px and fixes the mobile map heading/node overlap. Lantern Flight has completed all 12 lights using the keyboard controls with no JS errors. Browser checks mock AI status to avoid paid API requests.

Run browser checks against the app's actual port (currently 3001 on the owner's machine):

```powershell
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:adventure
npm.cmd run smoke:complete
npm.cmd run smoke:flight
npm.cmd run smoke:learning
```

Screenshots are under `test-results/adventure-shots/`, `test-results/adventure-complete/` and `test-results/adventure-learning/` (git-ignored). On Windows PowerShell, use `npm.cmd` if `npm.ps1` is blocked by execution policy.

**Remaining boundaries:** the learner model now receives evidence from all three chapters, but the adventure intentionally keeps its chapter-specific interactions. It does not yet implement placement, interleaved cross-skill review, the full scaffold/return queue, or evidence across enough representations to establish curriculum-wide mastery. Make-ten keeps its fixed objective, and Pip's teaching examples remain authored. Live AI, deployment and submission remain unverified. Legacy global CSS and runtime remount cleanup still warrant an architecture pass.

## 1. What this project is

- **Event:** Nerdy AI Hackathon, Prompt 01, "K–5 Math Game": *an interactive, gamified math experience for elementary students that makes foundational arithmetic intuitive and engaging; innovative mechanics that encourage steady progression and reward mastery.*
- **Entrant:** solo (GitHub `vishnu1121`). Public repo: https://github.com/vishnu1121/Nerdy-AI-hackathon-K5-game-prompt
- **Deadline:** Friday 2026-09-18, 11:59 PM CT. Judged by Nerdy engineers from the demo video (max 3 minutes), the written description and the repo; they may not run the code.
- **Rules that shape the code** (full text in `docs/nerdy-hackathon-k5-math_rules.md`):
  - no GPL/LGPL/AGPL/SSPL dependencies, and every third-party component, model, font, image or audio must be disclosed
  - no biometrics or real child data
  - the entry is assigned to Nerdy on submission, so do **not** add an open-source LICENSE file
- **Product spec:** `docs/MathQuest_Product_Spec_for_Claude.md` (original vision: adaptive K–5 adventure, Addition Forest MVP).

## 2. The product today

### `/`: The Lantern Isles

A 2D illustrated exploration game with a connected story. Hoot helps the player; Pip is a fellow learner. The first three chapters restore the Great Lantern. Chapters 4–6 reveal that the mist came from Nimbus, a lost little storm, and help Nimbus return home. Chapters 7–8 explore belonging and how Nimbus's rain can help a new community.

**Flow:** title → unisex hero picker → prologue → island exploration. Each chapter has an introduction, interactive math encounters, results, an outro and a bonus game. The original Chapter 3 certificate celebrates the Lantern Valley milestone; it is not the end of the eight-chapter adventure.

| Chapter / level ID | Playable math | Bonus game |
| --- | --- | --- |
| 1 The Scattered River / `frog` | Counting on, +1/+10 jumps, crossing a ten and estimating a landing | Mist Painter: scratch-reveal the valley |
| 2 The Dark Glade / `fireflies` | Connect numbers to make ten; ten-frame and calm-mode support | Lantern Flight: hold to fly and collect twelve lights |
| 3 The Muddled Guardian / `guardian` | Compose sums, regroup and solve addition riddles | Guardian's Dance Party: repeat a beat |
| 4 The Runaway Skyrail / `skyrail` | Choose switches that apply two or three arithmetic operations in sequence | Cloud Courier: push parcels through three depot puzzles |
| 5 The Moonbeam Workshop / `robotworks` | Multiply robot recipes and divide supplies into crates | Bumper Bowls: aim gear throws against computer Pip |
| 6 A Bridge Back Home / `cloudbridge` | Build equivalent fraction bridges | Constellation Club: matching pairs against computer Pip |
| 7 The Garden That Belongs to Everyone / `garden` | Build connected shapes with specified area and, later, perimeter | Prism Pop: select and pop connected gem clusters |
| 8 The Last Little Tidepool / `water` | Fill, empty and pour jars to measure a target capacity | Glow Orchestra: compose, play and save an eight-beat tune |

Chapters 4–8 each contain four seeded encounters, gentle retries, support and saved checkpoints. Replays vary the puzzles. Computer opponents are local game logic, not online players or LLM agents. Cloud Kart Rally is no longer an active chapter reward or Arcade choice; legacy rules/styles/save fields may still exist.

**Navigation and persistent systems**

- **Explore:** walk or tap across Lantern & Sky or Moonseed Coast, enter destinations, discover three keepsakes and decorate nine camp patches.
- **Quests:** all eight chapters with sequential story dependencies.
- **Practice:** seven concept trails (subtraction, multiplication, division, fractions, patterns, measurement, geometry) and a mixed expedition. These broaden practice; they are not a complete adaptive K–5 curriculum.
- **Arcade:** replay the eight unlocked chapter bonuses. Scores and competition never count as math evidence.
- **Story Lab:** choose one of four fictional settings and either garden design or water rescue. Optional AI supplies a bounded story around code-generated puzzles. Each side adventure has four encounters and does not unlock main chapters. The current generated story is session-local.
- **Adults:** a dashboard from the HUD, camp or Story Lab. See retained attempts per skill, independent/supported successes, incorrect attempts, practice suggestions, a local text export and an optional AI note. Counts are bounded recent evidence, not a dated history or mastery assessment.
- **Other retained systems:** achievements, exact-payment shop, cosmetics, five world-theme presets, optional AI world naming, Hoot support, original Teach Pip explanations, strategy sharing, journal, calm mode and the original certificate.

**Save:** `mq.playtest.v3` in browser localStorage. It retains the original state plus `learning`, `curriculum`, `voyage`, optional `dreamProgress`, new `playRecords` entries and the `orchestra` pattern. Main voyage checkpoints are validated partial records so older saves survive new chapters. Side-story checkpoints do not make the generated narrative persistent. Keep supported attempts separate from independent ones, including across reloads. The Badge Book's whole-game reset clears the local journey.

### `/classic`: original MVP

The earlier React game has warm-up placement and adaptive addition challenges driven by `src/engine/`, with Hoot's hint ladder, Build-it blocks, Pip's Puzzle, a Guardian round and a grown-ups tutor note. The owner found that version too quiz-like. It remains a reference and source of tested learning-engine logic; it is not the current main UI.

## 3. How to run

Dependencies are already installed in this workspace. Use `npm.cmd` in PowerShell if its script policy blocks `npm.ps1`.

```powershell
npm.cmd run dev -- --port 3001
```

The local server responded at **http://localhost:3001** during this handoff; check for an existing server before starting another. Port 3000 is used by another project on the owner's machine. Do not stop that unrelated process.

In a second terminal:

```powershell
npm.cmd run check
npm.cmd run build
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:frontier
npm.cmd run smoke:voyage
npm.cmd run smoke:complete
```

Additional focused browser scripts: `smoke:adventure`, `smoke:flight`, `smoke:learning`, `smoke:arcade`. Run the relevant scripts after changes; screenshots go to `test-results/`. Browser scripts mock AI or use disabled mode and do not test the live provider.

**AI configuration:** `.env.local` can set `ANTHROPIC_API_KEY` and `AI_ENABLED=true`; restart the server after changing it. No key values were inspected in this handoff. `.env*` is ignored except `.env.example`. `AI_ENABLED=false` disables AI; otherwise a nonempty key is enough for the current code to report configured. A successful status GET proves configuration, not provider compatibility. The last actual GET returned `{"enabled":false}`.

If Git reports dubious ownership in this workspace, use the per-command option `git -c safe.directory=D:/Nerdy_AI_Hackathon_K5 ...`; do not change global Git configuration merely to inspect this repository.

## 4. Architecture

Installed framework versions in `package.json`: Next.js **16.3.5**, React **19.2.8**, Zod **4.6.2** range, Anthropic SDK **0.125.0** range. Follow `AGENTS.md` and read relevant local Next.js guides before writing code.

| Location | Responsibility |
| --- | --- |
| `src/app/page.tsx` / `src/app/classic/page.tsx` | Main adventure / original React MVP |
| `src/adventure/AdventureRoot.tsx`, `Shell.tsx` | Static game DOM, stylesheet order, guarded one-time runtime start |
| `src/adventure/runtime/index.js` | Runtime import order; modules attach namespaces to `window` and register levels |
| `runtime/store.js`, `core.js` | MQS save/event bus; MQ level lifecycle, results, sound, Hoot and effects |
| `runtime/frog.js`, `fireflies.js`, `guardian*.js` | Original three chapters |
| `runtime/story.js`, `teach.js` | Original narration/choice, three authored Pip mistakes and explanation/strategy interactions |
| `runtime/pathway.js` | Seven concept trails and mixed practice |
| `runtime/voyage-world.js`, `voyage-art.js`, `voyage-story.js` | Island regions/navigation, SVG art, Nimbus story and remembered promise |
| `runtime/voyage-games.js`, `voyage-minis.js` | Skybound math games, bowls and matching; older rally implementation remains legacy |
| `runtime/frontier-games.js`, `frontier-minis.js` | Garden/water chapters and themed side missions; courier, gem clusters and orchestra |
| `runtime/dream-lab.js`, `adult-dashboard.js` | Story Lab generation/preview/launch and adult evidence/AI note/export dialogs |
| `runtime/core-ai.js` | Same-origin AI requests, status subscriptions, cancellation/timeouts and stale-result protection |
| `runtime/arcade.js`, `minigames.js`, `mini-*.js` | Shared scoring/effects, bonus-game lifecycle and original three minis |
| `runtime/art.js`, `ux.js`, `modern.js`, `map.js` | Retained illustration, journal/certificate, HUD, hero/world-theme and map layers |
| `runtime/achievements.js`, `shop.js`, `accessibility.js` | Badges, exact-payment shop and dialog focus handling |
| `learning.ts`, `riverLearning.ts`, `runtime/learning.js` | Validated original learner evidence and bounded difficulty decisions |
| `curriculum.ts` | Pure trail puzzles, concept practice and saved evidence |
| `voyage.ts` | Seeded chapter puzzles, dependencies, checkpoints, story/world save and competition rules |
| `frontier.ts` | Garden geometry/connectivity; water operations and BFS solver; courier pushes/solver; gem groups/gravity |
| `progressReport.ts` | Bounded adult evidence aggregation without duplicated voyage/curriculum observations |
| `arcadeScore.ts` | Pure streak/multiplier rules; no time-based math rewards |
| `src/ai/adventure/` | Request/output schemas, frozen prompts, validation and unit tests |
| `src/app/api/adventure-ai/route.ts` | Validated/rate-limited adventure tasks; GET configuration status |
| `src/ai/server/claude.ts`, `rateLimit.ts` | Shared server-only Anthropic client and request limiter |
| `src/engine/`, `src/game/`, `src/app/api/ai/` | Pure original engine, classic React UI and classic AI endpoint |
| `scripts/adventure-*.mjs` | Seven browser test suites; see `package.json` for exact commands |

Paths starting with `runtime/` or a standalone TypeScript filename in this table are relative to `src/adventure/`.

**Styles:** global CSS imports end in `storybook.css` → `pathway.css` → `arcade.css` → `voyage.css` → **`frontier.css`**. Earlier notes naming another “final” layer are historical. Scope additions carefully; global styles can affect `/classic` after client navigation.

**Runtime lifecycle:** `AdventureRoot` uses `window.__mathquestStarted` to avoid duplicate startup. Runtime modules are plain JavaScript and excluded from ESLint; TypeScript checks alone cannot verify their browser behavior. MQS's event bus has no general unsubscribe API; do not assume React-style cleanup. MQAI status subscriptions do return an unsubscribe function. Cancel pending work on changes/exits, and preserve save compatibility.

**Learning boundary:** code computes valid moves, answers, support flags, scoring and progression. Pure engine logic stays free of React/network/AI and uses injected clocks/RNG. Campaign code records independent and supported attempts separately. Arcade records and stars do not establish mastery.

## 5. AI design

Read [AI_PLAYBOOK.md](AI_PLAYBOOK.md) for feature scope and the **unselected active-AI proposals**. The implemented system has **eight tasks**. It currently generates bounded text, not executable rules or world actions.

| Task | Current use |
| --- | --- |
| `world` | Short world idea → checked names, approved emoji and palette |
| `hint` | Move-aware Hoot text; garden/water use actual state and deterministic guidance |
| `riddle` | Guardian addition riddle from supplied operands |
| `teach` | Feedback on an explanation of one of three authored mistakes: `hopStart`, `sixFive`, `carry513` |
| `strategy` | Classify/respond to a short explanation of a completed addition problem |
| `narrate` | Some original chapter introductions/outros using known game facts |
| `journey` | Original grown-ups note and new adult coaching from aggregate practice observations |
| `mission` | Story Lab title, opening, four beats and closing for garden/water in one of four settings |

**Provider configuration as found in the repository, not independently verified:** `src/ai/server/claude.ts` uses model string `claude-opus-5`, structured outputs through `betaZodOutputFormat`, low effort, and the `server-side-fallback-2026-07-01` beta with `fallbacks: "default"`. Adventure `writeJson` disables thinking. The SDK has zero retries and an eight-second timeout. These settings were preserved, not validated against a live account. Before a real demo, verify available model IDs/API features with the configured account and current provider documentation; do not assume an alternative model string works.

**Request and display safeguards:** server schemas limit task shape and child-text length, prompts delimit untrusted ideas/explanations, and reply validators enforce task-specific structure/content/number rules. Requests are rate-limited (20/minute per client). The client bounds requests to ten seconds; changed Story Lab choices abort pending generation and stale hints cannot overwrite later game state. Built-in text/guidance remains available if AI is off, unavailable or rejected.

**Story Lab boundary:** AI supplies narrative around two implemented mechanics. Math targets and legal moves come from code. The generated story is session-local; four completed side encounters do not unlock main chapters. The app identifies built-in versus accepted AI-created stories. It does not create arbitrary new games or store a persistent AI character memory.

**Data:** learner evidence stays in this browser. A submitted fictional idea or short explanation can be sent to the server/provider for that feature; adult notes send aggregate practice counts. No identity, microphone, camera, biometrics or emotion inference. Content checks are bounded safeguards, not proof that every possible model response is appropriate.

**Future direction:** the owner wants AI to make observable gameplay decisions or constructions. That may require new bounded action/board schemas and code validation. It is compatible with preserving deterministic correctness, but it is not present in today's API. The current text-only design is not a decision to reject that request.

## 6. Design principles in use

- **Game first:** every answer is an action (hop, connect, cast), the first win comes within about a minute, and wrong answers are funny, never punishing.
- **Accessibility:**
  - never color alone (icon, shape or words, plus sound)
  - touch targets ≥48px, text ≥14px, keyboard support in levels and mini-games
  - `prefers-reduced-motion`, plus an in-game calm mode (🍃)
- **Inclusive:** unisex heroes and cosmetics; the story addresses the child as "you".
- **Design skills:** installed in `.claude/skills/` and not committed. Exact matches are `frontend-design` and `game-ui-design`; `motion-system`, `interfaces-that-feel`, `journey-map` and `peak-end-rule` stood in for names that didn't exist. They drove the storybook materials, motion rules, notification lanes, peak-end moments and the modern glass layer.
- **Research cited to the owner:**
  - Habgood & Ainsworth 2011: math as the mechanic beats quiz-then-reward.
  - Ramani & Siegler 2008: linear number board games improve number skills.
  - Clark et al. 2016: games help learning, and design matters.
  - Cordova & Lepper 1996: personalization and choice.
  - Chase et al. 2009: teachable agents, the protégé effect.

## 7. History (what was done, in order)

1. **Discovery and planning:** read the spec and rules, and chose Next.js + TypeScript, the Claude API, emoji + CSS/SVG art. A mockup artifact and a PM/QA feature review were done, and the "Sunny Forest" palette picked.
2. **Classic MVP:**
   - pure engine with 151 tests
   - React UI and server AI route with guards
   - license audit and sharp stub
   - Playwright screenshot QA
   - committed to `main` (commit `dd53904`) in the public repo
3. **PR #1** (`fix/guardian-scene-layout`): Guardian scene cropping fix. It was open when this history was written; remote status has not been rechecked for the current handoff.
4. **Owner feedback:** "too many problems before progress; not a game; generic". This started a playable prototype (Claude artifact, vanilla JS) iterated with the owner:
   - **v1:** three mechanics (Frog Hop, Firefly Tens, Guardian Duel).
   - **v2:** more interactivity (slingshot, light threads, card drag, riddles) and AI features (world maker, move-aware hints, riddles, Teach Pip).
   - **v3:** story chapters, cutscenes, choice and friend memory, 17 badges, shop, Teach Pip in every chapter, strategy sharing, AI story director and journey note.
   - **v4:** UX pass with design skills (title screen, paper-cut map, calm mode, 14px floor, certificate, and more).
   - **v5:** modern glass design, unisex hero picker, three story mini-games, Playground, 20 badges.
5. **Port into this app (2026-09-13):**
   - runtime copied to `src/adventure/`
   - AI moved server-side (`/api/adventure-ai` with schemas, prompts, validators and 9 new tests)
   - classic moved to `/classic`
   - smoke test added

## 8. Current state and verification

- **Working copy:** branch `fix/guardian-scene-layout`, HEAD `fd35a370b753f24ed2e5e37a4c0b217a6580eb70` (“Keep the whole Forest Guardian visible on tablet and phone”). The adventure, classic route, AI extensions and documentation include substantial uncommitted/untracked work from Claude Code and Codex. `.claude/`, `skills-lock.json` and `debug.log` are also untracked. Preserve work; inspect staging explicitly before any future commit.
- **Last implementation verification, 2026-09-14:** `npm.cmd run check` passed 30 test files / 226 tests, typecheck, lint and the 437-package license audit. Production build passed after the final orchestra sound control changes.
- **Freshest browser regressions:** `smoke:frontier` and `smoke:voyage` passed at 1440px and 390px; `smoke:complete` passed on tablet/phone after the world-region toolbar overlap fix. Frontier covers complete garden/water chapters, all three new minis, wrong attempts/support/reload, tune persistence, adult evidence/filter/export, mocked story generation, hints/coach notes, rejected/offline fallbacks, and a complete four-encounter side story. No JavaScript errors were reported.
- **Earlier browser results:** `smoke:adventure`, `smoke:arcade`, `smoke:learning` and `smoke:flight` passed in preceding implementation passes. They were not all rerun after the final Frontier extension; do not present them as a fresh full-suite result.
- **Visual/accessibility review:** screenshots in `test-results/frontier/`, `test-results/voyage/` and other suite folders. Focused axe checks at 390px found no violations for contrast, button names, valid ARIA values or dialog names on nine latest screens. This does not replace a full accessibility audit or user testing.
- **AI:** GET status rechecked during this docs-only handoff at port 3001 → `{"enabled":false}`. Tests mocked provider responses; no paid live request was made. The configuration/model/beta options have not been proven against a live account.
- **This handoff:** documentation changes only; implementation test results above are retained records, not new test executions. No commit, push or deployment.

**Known gaps:** the owner has not selected a flagship AI direction and did not understand the proposed new Teach Pip; live AI, deployment and child/proxy playtesting remain unverified. The seven practice trails lack exhaustive browser completion coverage. Story Lab does not persist a generated narrative across reloads. The dashboard has bounded undated evidence, not longitudinal analytics or multiple profiles. The adventure is not a complete K–5 adaptive curriculum. Global CSS and one-time runtime startup need care around client navigation; explicit module cleanup and CSS isolation remain technical follow-ups.

## 9. Next steps (current priorities for the 2026-09-18 deadline)

1. **Resolve the flagship gameplay direction.** The owner wants an active AI main feature and has not chosen among the three proposals in [AI_PLAYBOOK.md](AI_PLAYBOOK.md). Start with a plain, concrete gameplay example: what the child does, what AI decides, what changes on screen and what the child learns. Do not treat the assistant's Teach Pip recommendation as owner approval or claim it already exists.
2. **Build a focused playable slice of the resulting direction.** Reuse the story, construction mechanics, deterministic solvers, bounded server API and evidence model where useful. A successful slice must make AI's contribution visible in play, react to the child's input and preserve valid math/actions. Another narrative-only reskin does not fulfill the latest feedback. Exact scope is still undecided.
3. **Verify real AI and recoveries.** With the owner's configured account and authorization for live usage, check provider/model compatibility, representative accepted/rejected outputs, latency, offline behavior and stale-response handling. Keep keys server-only and mocked test claims distinct from live results. Do not automatically run the old suggested twenty-request paid batch.
4. **Playtest and regress the finished slice.** Check phone/desktop and keyboard/calm mode; run `check`, build and the affected browser suites. Use proxy feedback to tune reading load, fun, first-play difficulty and the observable learning loop. Complete relevant untested practice paths if changed.
5. **Package the actual entry.** Prepare `docs/SUBMISSION.md`, `docs/DISCLOSURES.md` and `docs/DEMO_SCRIPT.md` (not yet present). The maximum-three-minute demo should center the implemented active AI loop once it exists. Do not reuse the obsolete helpers-only demo outline or market proposals as built.
6. **Review repository and deployment with the owner.** Preserve the current work, review untracked files/skills and generated artifacts, and commit/push/deploy only within the owner's authorization. The old history mentions PR #1; its current remote status has not been rechecked in this handoff. Deployment remains outstanding.
7. **Then address structural improvements as justified:** explicit runtime mount/unmount, CSS isolation, broader learner evidence and interleaved practice, and saved Story Lab sessions. Avoid a broad framework rewrite that delays the central playable feature.

## 10. Rules for agents working here

- Run `npm run check` before committing; run the smoke test after touching `src/adventure/`.
- Never send the API key or call Claude from the browser; add new AI tasks to `src/ai/adventure/` (schema, prompt, validator and test) and `/api/adventure-ai`.
- Keep built-in/offline play and honest AI status. Validate all AI outputs; any future action or generated-board feature needs code checks for legal moves, solvability and mathematical correctness. Math scoring, stars, badges and progression stay deterministic.
- Keep Hoot as the helper and Pip as the learner; keep heroes and cosmetics unisex; no timers that punish; no child PII, microphone, camera or emotion inference.
- Don't add third-party fonts, images, audio or copyleft dependencies; update disclosures when adding anything third-party.
- Commit or push only when the owner asks; don't commit `.env*`.
