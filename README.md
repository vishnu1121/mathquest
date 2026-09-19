# MathQuest

A maths game for kids aged 5 to 11, where the maths is the game rather than a quiz between cartoons.

Built for the **Nerdy AI Hackathon** (Prompt 01: K–5 Math Game).

The short version: children get an island of their own, eight chapters built from their grade's real
syllabus, and an owl who helps without giving answers. An AI writes fresh questions while they play, so
replaying a chapter is not replaying the same five questions — but it is never allowed to *assert* an
answer. It has to show its working, and the server re-solves that working before any child sees it.

---

## Contents

- [What you actually play](#what-you-actually-play)
- [The two AI features](#the-two-ai-features)
- [How a generated question is checked](#how-a-generated-question-is-checked)
- [Apex Mode and the treasure](#apex-mode-and-the-treasure)
- [Running it](#running-it)
- [AI setup](#ai-setup)
- [Deploying to Vercel](#deploying-to-vercel)
- [How the code is laid out](#how-the-code-is-laid-out)
- [Tests](#tests)
- [Constraints and disclosures](#constraints-and-disclosures)

---

## What you actually play

You type a name, pick a class, and get an island.

**Six classes, Kindergarten to Grade 5.** Each is its own island: Firefly Meadow, Riverbend,
Whistlewood, Tinker Hollow, Crystal Canyon, Star Harbor. Each has **eight story chapters** whose
questions are generated from that grade's syllabus, plus practice, a mystery expedition and a bonus
game after every chapter. [`docs/CURRICULUM_MAP.md`](docs/CURRICULUM_MAP.md) maps every chapter to the
standard it covers.

**The boards are things you do, not boxes you fill.** You pour jars, balance scales, build arrays,
drag planks into a bridge, place points on a grid, turn dials on a place-value workbench, count crates
into a cargo ship. Typing a number on a keypad is one input among many.

**Hoot the owl** sits with you the whole way. He notices pauses and mistakes, and asks one question
that fits the moment. He is not allowed to say the answer — a guard strips any hint containing it.

**Other places to go.** The Muddle Monster Arena is an adaptive practice mode with an in-session Elo
rating and misconception bosses. Practice has trails, a mixed expedition and a set of static maths
cards for looking things up. The Adults dashboard shows real evidence per skill — independent answers
kept separate from ones that needed a hint or a retry — and can export a text snapshot.

**Everything is local.** Progress lives in browser storage under `mq.playtest.v3`. No accounts, no
analytics, no server-side profile. The name you type is stored on the device and never sent anywhere.

---

## The two AI features

### "You wanna know how?"

After a question has **already been marked**, a button appears offering a step-by-step walkthrough.

The ordering is the whole point. A child who guessed right and knows they guessed can ask how it
actually works, and because the question is already scored, asking cannot cost them anything. The
server drops any explanation whose closing line lands on a different answer than the code computed.

### Fresh questions during play

Replay a chapter and the questions are different — new scenarios, new wording, new problem shapes, not
the same sum with the numbers swapped.

The next question is written **while the child is still answering the current one**, so nothing ever
waits on a provider. Question 1 of a chapter is always a built-in one; there is no cutscene to hide a
fetch behind, and a spinner before a child's first question would be the wrong trade.

What it can reach, measured and pinned by a test:

| | K | G1 | G2 | G3 | G4 | G5 |
|---|---|---|---|---|---|---|
| chapters & practice | 5% | 23% | 20% | 20% | 43% | 57% |
| Apex quests | — | — | — | 53% | 45% | 68% |

The rest are boards whose question lives in a **picture** — ten frames, clocks, coins, fraction bars,
world puzzles. Those are never sent to a model, because words cannot restate them without making them
a different and worse question. Kindergarten is nearly all hands-on, which is the right answer for
five-year-olds.

---

## How a generated question is checked

This is the part worth reading if you only read one.

Every other AI task in this game hands the model an answer the code already computed. Generation runs
the other way, so it is the one place a model could put a wrong answer in front of a child. The rule
that makes it safe: **the model is not believed about the answer.** It must return its working as a
small flat program —

```json
{
  "prompt": "Tinker loads 7 crates with 8 bolts each, then uses 6 bolts. How many are left?",
  "answer": "50",
  "work": [
    { "op": "*", "a": "7",  "b": "8" },
    { "op": "-", "a": "r0", "b": "6" }
  ],
  "hint": "Work out the whole load first.",
  "explain": "Seven eights is 56 bolts, and six are used, so 50 are left.",
  "options": []
}
```

`r0` names the first step's result. The server runs that program itself in **exact rational
arithmetic** (`{n, d}`, never floats — `0.1 + 0.2` is not `0.3`, and a fraction compared in floats is a
coin toss at the fourth decimal place). The question is thrown away unless the last step equals the
answer the model claimed.

On top of that, in order:

1. The declared answer must be writable in the format the keypad is about to draw.
2. Apex questions must use **at least two steps** — the difficulty floor is enforced in code, not asked
   for in prose.
3. No step may go **below zero** at any point. No grade from K to 5 works with negative numbers.
4. Every literal the work used must be a number the **prompt actually shows**. A number the model
   invented makes the question unsolvable as written even when the arithmetic checks out. Quantities
   named in words — "half", "a dozen", "twice" — count as shown.
5. The prompt must not **print its own answer**, unless that number is also an input.
6. `skill`, `format` and `unit` are the ones the **game** asked for, never the model's. The learner
   model is keyed on `skill`.
7. Multiple choice: exactly one option may be correct, by value, and the positions are shuffled by a
   seeded RNG so a model that always writes the answer first cannot teach that pattern.
8. The finished object must pass `validateTask` — the same structural gate every built-in question
   passes — and, in the browser, `checkTask(task, correctResponse(task))`, so "See a worked example"
   can never hand a child a losing answer.

Anything that fails falls to the second provider account, and then to the built-in question the browser
is already holding. **A rejection is not an error path. It is the normal path, taken slightly more
often than the happy one.**

Measured live: roughly **three replies in four** survive the guard.

---

## Apex Mode and the treasure

**Grades 3, 4 and 5 only**, and only once every chapter of that island is finished. Younger classes do
not see a locked tab or a greyed-out card — Apex is not in their navigation and no Apex level is
registered for them.

It replays the same eight quests at the hardest that grade goes: multi-step problems, working
backwards, unknowns in the middle, deciding which operation is even needed. It is **not another
grade** — a Grade 3 child in Apex is a Grade 3 child doing the hardest Grade 3 thinking.

About one round in ten reaches **one grade up**. That ratio is chosen by position, in code, never asked
of the model: 4 of 40 rounds at Grades 3–4, 3 of 40 at Grade 5 (one grade up from Grade 5 is middle
school, and that edge deserves more care). A stretch round is labelled to the child and is excluded
from the learner model.

**Apex is fully playable with AI switched off.** The built-in fallback draws each chapter's hardest
generators, and the last two rounds bring in a different chapter from the same class, so a quest ends
by combining topics.

### The gems

Seven gems named after rare-earth elements, plus the Nova. **Rarity is earned, never diced** — a child
who three-stars everything and gets nothing because dice went against them learns that effort does not
pay.

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

A gem you did not earn stays buried, and the card says *"something is still humming under Anvil
Row"* — never what it needs. The vault shows found gems with a one-line fact, silhouettes for the rest,
and a remaining count. The Nova is the one unfound gem that **is** named, because it is the goal rather
than a secret.

---

## Running it

Node 20 or newer.

```bash
npm install
npm run dev -- --port 3001
```

Then open <http://localhost:3001>. The original quiz-style MVP is kept at `/classic` for reference.

Useful flags:

- `?demo=1` opens every chapter, and with them Apex, for a walkthrough or a recording. It sets the same
  playtest flag the hidden "unlock all chapters" button sets and changes nothing about how progress is
  earned. Clear it with `MQS.update(s => s.unlockAll = false)` in the console.
- To wipe your save entirely: `localStorage.clear()` and reload.

---

## AI setup

**The game is fully playable with no keys at all.** Every question comes from the built-in bank, hints
fall back to written ones, and the "You wanna know how?" button hides itself rather than offering a
control that cannot answer. Nothing stalls and nothing errors.

Copy `.env.example` to `.env.local` and fill in what you want.

There are **four jobs**, each with a **second account as an understudy**. A free-tier key does not fail
politely — it runs out in the middle of a lesson — so the understudy is what keeps a feature alive
until somebody notices.

| Job | Primary | Understudy | Carries |
|---|---|---|---|
| general | `AI_*` | `AI2_*` | coaching, narration, Teach Pip, diagnosis, Hoot's companion line |
| hints | `HINT_AI_*` | `HINT2_AI_*` | Hoot's hints |
| explainer | `EXPLAIN_AI_*` | `EXPLAIN2_AI_*` | "You wanna know how?" |
| questions | `GEN_AI_*` | `GEN2_AI_*` | fresh questions, one per question answered |

Each set is five variables, for example:

```bash
GEN_AI_PROVIDER=groq              # anthropic | openai | groq | openrouter | together | gemini | ollama | custom
GEN_AI_API_KEY=...
GEN_AI_MODEL=openai/gpt-oss-120b
GEN_AI_BASE_URL=                  # only for provider=custom
GEN_AI_ENABLED=true               # "false" switches just this job off
```

Notes worth knowing:

- **The provider is configuration, not code.** Prompts, guards, validators and routes are all
  provider-unaware. Swapping Groq for Anthropic or a local Ollama is two environment variables.
- Understudies are optional. With one unset, that job simply has one account.
- Hints fall back to the general accounts when no hint account is set, so an older setup keeps working.
- No job falls back across to another job's key. Generation is the highest-volume call in the game and
  must not be able to drain what hints and coaching depend on.
- Each job has its own rate-limit bucket.
- Keys are read server-side only and never reach the browser.

---

## Deploying to Vercel

1. Import the repo at <https://vercel.com/new>. The defaults are correct; no build overrides needed.
2. **Settings → Environment Variables.** Vercel does *not* read `.env.local` from the repo — that file
   is gitignored on purpose. Paste your env file into Vercel's bulk import box, or add the variables by
   hand, and select Production, Preview and Development.
3. Redeploy.

You can deploy with **no** environment variables at all and add them later. The game works either way.

---

## How the code is laid out

```
src/engine/            pure TypeScript: rng, skills, generators, learner model. No React, no network, no AI.
src/adventure/         the current game
  classes/             per-grade content and rules, all pure and seeded
    catalog.ts         the six classes, their chapters, stories and practice
    tasks.ts           task shapes, answer parsing, checkTask, validateTask
    families*.ts       the question generators
    apex.ts            Apex unlock, quests, stretch ratio, the gem table and award rule
    reference.ts       the Practice view's maths cards
    progress.ts        the per-class save swap
  runtime/             plain-JS modules that attach a namespace to window, loaded in order by index.js
  styles/              global CSS, imported in cascade order by AdventureRoot.tsx
src/ai/
  adventure/           zod schemas, frozen prompts, reply validators
    generate.ts        the generation contract and its guard (pure, no server imports)
    chain.ts           primary → understudy, shared by every job
  server/provider.ts   picks an adapter from environment; keys stay here
src/app/api/adventure-ai/route.ts   the one AI endpoint
src/game/              the original MVP's React UI, at /classic
scripts/               Playwright suites that play the real game
```

Two rules the codebase holds to:

**AI never decides correctness.** Maths scoring, stars, badges and progression are code. The runtime
never calls a model directly; it posts to `/api/adventure-ai`, and every reply is re-checked by the
same code that checks built-in content.

**The pure layer stays pure.** `src/engine` and `src/adventure/classes` have no React, no network, no
AI, and no `Date.now()` or `Math.random()` — a clock and a seeded RNG are injected, so a chapter with
the same seed is always the same chapter.

---

## Tests

```bash
npm run check      # typecheck, lint, 414 unit tests, licence audit
npm run build      # production build
```

Browser suites need the dev server running:

```bash
npm run dev -- --port 3001
# then, in another shell
BASE_URL=http://localhost:3001 npm run smoke:classes      # 247 class questions solved
BASE_URL=http://localhost:3001 npm run smoke:grade-play   # all six classes, arenas, bonus games, phone
BASE_URL=http://localhost:3001 npm run smoke:models       # workbenches, maths cards, phone layouts
BASE_URL=http://localhost:3001 npm run smoke:apex         # Apex, the gems, generated questions, nav layout
BASE_URL=http://localhost:3001 npm run smoke:explain      # the explainer on all four question surfaces
BASE_URL=http://localhost:3001 npm run smoke:adventure    # no JS errors
```

**Browser suites never call a provider** — the route is intercepted and answered locally. The one
script that does make real calls, `scripts/live-question-check.mjs`, is deliberately outside the test
gate and has to be run by hand.

Some older suites (`smoke:arcade`, `smoke:learning`, `smoke:complete`, `smoke:voyage`, `smoke:frontier`)
fail on stale assertions about UI that has since been replaced. That is drift, not breakage, and it is
documented in [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).

A few tests are worth calling out because they check claims rather than code:

- `generate.test.ts` re-solves generated questions and pins the coverage table above as floors.
- `reference.test.ts` re-solves **every equation on every maths card** in exact arithmetic, and checks
  each card's standard against the standards that class's own chapters cite — so a card cannot be wrong
  or off-grade.
- `apex.test.ts` proves K/1/2 can never unlock Apex even with a completed island, and that the stretch
  ratio stays inside 5–15% with no two stretch rounds in a row.

---

## Constraints and disclosures

Hackathon Rule 7.6 asks for disclosure of the models used and the licences shipped.

**Models.** Everything runs on **Groq** with **`openai/gpt-oss-120b`**. The code supports Anthropic
(default `claude-opus-5`), OpenAI, OpenRouter, Together, Gemini and Ollama through the same
configuration path.

**Built with Claude Code**, using its `artifact-design` and `frontend-design` skills for the visual
direction, `claude-api` for the provider layer, and `workflow-authoring` to run multi-agent design
reviews before large features. `skills-lock.json` records what was installed.

**Licences.** `npm run audit:licenses` fails the build on GPL, LGPL, AGPL and SSPL, and flags MPL, EPL
and CDDL for review. It writes [`docs/THIRD_PARTY_LICENSES.md`](docs/THIRD_PARTY_LICENSES.md).
Consequences of that rule which shaped the build:

- **No Tailwind.** Its `lightningcss` dependency is MPL-2.0.
- **No `sharp`.** Next's optional image binaries are LGPL-3.0, so `sharp` is overridden with an MIT
  no-op stub in `vendor/sharp-stub` and `next/image` is never used.
- **No third-party fonts, images or audio.** Every graphic is hand-written SVG or a system emoji, and
  every sound is synthesised with the Web Audio API.

**Children.** No biometrics, camera, microphone or emotion inference. No accounts and no analytics.
Learner state stays in browser storage. The name a child types is stored on the device and is not part
of any request the game makes — every AI request is built field by field from game state, never from
the save. Skipping the name is a real option and costs nothing.

**Accessibility.** Right and wrong are never signalled by colour alone — always an icon or shape plus
words, plus sound. Touch targets are at least 48px and text at least 14px. `prefers-reduced-motion` is
honoured, and an in-game calm mode is a separate switch that turns off music, shakes and flashes.

---

## Licence

No licence file, on purpose: this is a hackathon submission rather than a package to depend on.
