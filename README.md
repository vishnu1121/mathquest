# MathQuest

A math adventure on an explorable island: befriend a lost little storm, drive a number train, build rescue robots, and piece together a bridge to the sky. Built for the Nerdy AI Hackathon (Prompt 01: K–5 Math Game).

**Latest update:** visual arithmetic and factor workbenches, and a connected the class chapters with four playable stops and saved storybook replay. Each class has one fixed setting; the Theme picker was removed. See [the current handoff](docs/VISUAL_STORYLAB_REVIEW.md) and [project state](docs/PROJECT_STATE.md); older feature descriptions below are historical where they differ.

- `/`: **The Lantern Isles**, six classes from Kindergarten to Grade 5, each with an island of eight story chapters and its own practice, plus eight bonus games, the Muddle Monster Arena, the class chapters, an adult progress dashboard and a home camp
- `/classic`: the original adaptive quiz-style MVP, kept for reference

The current adventure uses an original illustrated storybook world, five scenery themes, a discovery journal, visible place-value blocks and ten-frames. A local learner model distinguishes independent answers from hints and retries, adjusts river replays and Guardian spells, and shares a practice snapshot with grown-ups. Repeated mistakes bring gentler paths or steadier fireflies. Rewards celebrate connections and persistence, with no speed requirement.

**Classes.** Before the story starts, the child picks a class: Kindergarten (Firefly Meadow), Grade 1 (Riverbend), Grade 2 (Whistlewood), Grade 3 (Tinker Hollow), Grade 4 (Crystal Canyon) or Grade 5 (Star Harbor). Every class has the same structure:

- Eight story chapters in order, each leading to the same bonus game for that slot.
- Six practice trails and a mystery expedition.

The eight original chapters now sit in the grade they fit, in their original slots. The 40 new chapters draw, generate and check grade-level questions: counting and teen numbers, the equal sign, place value to a million, clocks, coins, graphs and line plots, fractions and decimals, angles, volume and the coordinate plane. Answers are chosen, typed on a keypad, tapped on a number line, sorted, ordered or built with dials. Each class keeps its own chapters, stars and learning records; coins, badges and the camp are shared. Grown-ups can change the class under **Adults**. See the [curriculum map](docs/CURRICULUM_MAP.md).

The first three chapters relight the Lantern Valley. In **Skybound: The Little Storm** (Chapters 4–6), the player meets Nimbus, whose attempts to call for help caused the mist. A remembered promise connects three new math games: composing arithmetic routes on the Skyrail, multiplying robot recipes and dividing supplies into crates, and building equivalent fraction bridges. Each has four missions, fresh replay numbers, hints, and saved checkpoints.

**A Place to Grow** (Chapters 7–8) continues Nimbus’s story on Moonseed Coast. Design connected gardens with area and perimeter, then fill and pour measuring jars to rescue tidepools. Each chapter has four generated encounters, undo, contextual Hoot hints, and saved checkpoints.

Every chapter leads to a bonus game. **Cloud Courier** replaces the lane-choice race with a parcel-pushing puzzle: three depot rooms, legal pushes, undo, and solver-backed hints. **Prism Pop** offers cascading gem clusters, and **Glow Orchestra** lets children compose and save an eight-beat tune. Bumper Bowls and Constellation Club retain their computer Pip opponents. **Lantern Flight** is a four-leg night flight: catch fireflies to fill a ten-frame lantern, fly through the ring that answers each sky question (make the next ten, or ten more), ride the wind, build chains, and try to beat Pip’s score and your own best. The five navigation tabs are Explore, Quests, Practice, Arcade, and the class chapters. Explore two island regions, find keepsakes, or decorate the camp. Practice retains the seven concept trails and mixed expedition.

**the class chapters** turns a setting, building activity, optional short story idea, remembered promise, and observed practice context into an opening, four playable story beats, and an ending. Local code generates and checks the math; AI supplies the bounded narrative. Generated stories and built-in fallbacks are clearly distinguished. the class chapters adventures do not unlock the main chapters.

The **Adults** button opens an accessible dashboard with up to eight recent answer attempts per skill, independent and supported successes, incorrect attempts, practice suggestions, a downloadable text snapshot, and an optional AI coaching note. It uses actual local evidence rather than treating stars or arcade scores as mastery.

The **Muddle Monster Arena** (the Arena tab) is the AI-driven practice mode. An in-session Elo rating picks each problem (carrying, borrowing, fractions), and help grows from highlighted digits after a pause to block arrays after mistakes. A wrong answer is diagnosed into a misconception code, instantly by rules or by AI for unusual answers. Hoot stays beside the child the whole time, noticing pauses, typed answers, mix-ups and boss moves, and asks one Socratic question that fits that moment. After a diagnosed mix-up, the matching boss appears. Beat it by doing the right math move: bundle ones into a ten against the Carry Colossus, shatter a ten against the Borrowing Behemoth, or cut pizzas into equal slices against the Denominator Demon. Code checks every answer, boss move and AI reply.

**Hoot, the companion,** stays beside the child in every level: a bar at the bottom of the screen shows what Hoot notices, asks a question after a pause, responds to mistakes and streaks, and offers “Help me think”. Unprompted questions never give away an answer.

**Development handoff — 2026-09-14:** start with [the current project state](docs/PROJECT_STATE.md) and [Claude's working instructions](CLAUDE.md). The owner wants a stronger active AI gameplay feature than the supporting features above. Three ideas were discussed; none has been selected or implemented. In particular, the proposed AI teammate “Teach Pip, Save the Isles” is different from the existing explanation activity. [The AI guide](docs/AI_PLAYBOOK.md) records these boundaries. The working copy remains uncommitted, and the actual local server reports AI disabled.

## Run it locally

```bash
npm install
npm run dev
```

Open the address printed by Next.js (normally http://localhost:3000). In the owner's current workspace another project uses port 3000; this app was checked at http://localhost:3001. To choose that port explicitly, run `npm.cmd run dev -- --port 3001` in PowerShell if a server is not already running.

### Turn on the AI helpers (optional)

The game works fully without AI. The AI helpers are provider-agnostic: give the server a key from whichever provider you have, in `.env.local` at the project root.

Anthropic (the default; nothing else to set):

```bash
ANTHROPIC_API_KEY=your-key-here
```

Any provider that speaks the OpenAI chat-completions shape:

```bash
AI_PROVIDER=groq          # openai | groq | openrouter | together | gemini | ollama | custom
AI_API_KEY=your-key-here  # not needed for a local model, but set something
AI_MODEL=llama-3.3-70b-versatile
# AI_BASE_URL=...         # only for AI_PROVIDER=custom, or to override a known provider
```

`AI_ENABLED=false` switches every helper off while leaving the key in place. Keys stay on the server and are never sent to the browser. Whichever provider and model you use must be listed in your Rule 7.6 disclosures.

Verified live on Groq's free tier with `openai/gpt-oss-120b`: Hoot's stepped hints, chapter hints, the class chapters writing and the adult note all returned replies that passed the game's validators, at roughly one second each.

Restart `npm run dev`. the class chapters, contextual hints, Guardian riddles, Teach Pip, strategy replies, story narration, and adult coaching can then use Claude. Each reply is checked before display; unavailable or rejected responses use built-in content. Configuration status is visible in the class chapters and Adults → AI connection & data. A configured key is not a successful live test. See [the AI feature guide](docs/AI_PLAYBOOK.md) for current capabilities and the next opportunities.

## Quality checks

```bash
npm run check                                            # typecheck, lint, unit tests, license audit
BASE_URL=http://localhost:3000 npm run smoke:adventure   # browser playthrough (dev server running)
BASE_URL=http://localhost:3000 npm run smoke:classes     # class picker, class chapters, checkpoints, switching class, every class question
BASE_URL=http://localhost:3000 npm run smoke:complete    # Chapters 2–3 in their classes, Teach Pip, dance and persistence
BASE_URL=http://localhost:3000 npm run smoke:flight      # Lantern Flight: phone layout, then all four legs and sky questions with the keyboard
BASE_URL=http://localhost:3000 npm run smoke:learning    # visual helper, adaptive practice, retries and saved evidence
BASE_URL=http://localhost:3000 npm run smoke:arcade      # score panel, streaks, power mode, boss bar and best scores
BASE_URL=http://localhost:3000 npm run smoke:voyage      # Skybound chapters, all three bonus games, choices, reload and island exploration
BASE_URL=http://localhost:3000 npm run smoke:frontier    # chapters 7–8, new minis, dashboard/export, mocked AI stories/hints/coaching and fallbacks
BASE_URL=http://localhost:3000 npm run smoke:arena       # Arena: Elo, scaffolds, rule and AI diagnoses, always-present Hoot, three bosses
BASE_URL=http://localhost:3000 npm run smoke:companion   # Hoot’s companion bar in a chapter, a trail and two missions
```

Browser checks use mocked AI responses or built-in text and avoid paid AI requests. On Windows PowerShell, use `$env:BASE_URL='http://localhost:3001'` followed by the desired `npm.cmd run smoke:...` command. Screenshots are written to `test-results/`.

The latest pass (2026-09-15, six classes) passed `check` (36 test files / 285 tests), the new classes suite (all 229 class questions solved in the browser) and all nine other browser suites, including Lantern Flight. The production build passes. Live provider responses, deployment and user playtesting remain unverified; see [verification details](docs/PROJECT_STATE.md#8-current-state-and-verification).

## Project layout

```
docs/                    product spec, hackathon rules, license report, PROJECT_STATE.md (start here)
scripts/                 license audit, browser smoke tests, screenshot walkthrough
src/app/                 Next.js routes: / (adventure), /classic, /api/adventure-ai, /api/ai
src/adventure/           the story adventure: Shell.tsx, AdventureRoot.tsx, runtime/ (game modules), styles/
src/ai/adventure/        adventure AI: request schemas, prompts, reply validators (+ tests)
src/ai/                  classic MVP AI (hints, stories, tutor note) and the shared Claude client
src/engine/              pure TypeScript learning engine (math, mastery, adaptivity) with unit tests
src/game/                React screens of the classic MVP
vendor/                  sharp stub (keeps LGPL binaries out of the tree)
```
