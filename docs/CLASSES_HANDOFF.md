# Handoff: the six-class split (for the next coding agent)

**Superseded in part by the 2026-09-16 gameplay/AI update.** Read [GRADE_GAMEPLAY_REVIEW.md](GRADE_GAMEPLAY_REVIEW.md) first. New visual game mechanics, grade-specific shared features, separate bonus records and roaming Hoot replace several behaviors below. `smoke:classes` passed 247 tasks; `smoke:grade-play` passed all six class Arenas, real gameplay moves, mocked sequential AI hints, bonus isolation and phone layouts. Preserve this file as the record of the original split.

Written 2026-09-16 by Claude Code for whoever continues this work. It records what the class split delivered, the rules it introduced, how to verify it, and what is left. Product context is in [PROJECT_STATE.md](PROJECT_STATE.md); the syllabus mapping is in [CURRICULUM_MAP.md](CURRICULUM_MAP.md); repository rules are in [../CLAUDE.md](../CLAUDE.md).

Branch `fix/guardian-scene-layout`. Everything below is **uncommitted working-tree work**, together with earlier uncommitted work from other agents. Do not commit, push or deploy without the owner's instruction, and never include `.env*`, `debug.log`, `test-results/` or `.claude/` in a commit.

## 1. What the owner asked for

Divide the game into classes for Kindergarten through Grade 5 from a supplied syllabus (CC, OA, NBT, NF, MD, G), keeping the same structure and the same number of games in every class, adding games where a class was short, and leaving the existing AI features alone.

The owner chose: eight chapters per class with shared bonus games; one island per class in the same world with the same characters; a class picked at start with separate progress, changeable from Adults; and all six classes built at once, with math correctness first and art polish last.

## 2. What is delivered

- Six classes: Kindergarten (Firefly Meadow), Grade 1 (Riverbend), Grade 2 (Whistlewood), Grade 3 (Tinker Hollow), Grade 4 (Crystal Canyon), Grade 5 (Star Harbor).
- Each class: one island, eight chapters in slot order, the same eight bonus games by slot, six practice trails and a Mystery expedition.
- The eight existing chapters keep their original slot inside the class they now belong to, so every slot's bonus game is unchanged.
- 40 new chapters (5 questions each) with a short story intro and ending.
- A class picker at start, class switching under Adults, and migration for saves made before classes.
- A class-aware adult report.

## 3. Code map

Pure TypeScript, `src/adventure/classes/` (no DOM, no AI, seeded RNG only):

| File | Contents |
| --- | --- |
| `tasks.ts` | Task and response types, `normalizeAnswer`, `checkTask`, `correctResponse`, `validateTask` |
| `kit.ts` | Shared helpers (`choose`, `near`, `scrambled`, `fmt`, `fractionText`, …) |
| `familiesNumber.ts`, `familiesFractions.ts`, `familiesMeasure.ts` | ~120 question generators |
| `catalog.ts` | The six classes, chapters, stories, practice lists, `SKILL_NAMES`, `chapterTask`, `practiceTask`, `chapterHome` |
| `progress.ts` | `GRADE_IDS`, `CLASS_FIELDS`, `CLASSIC_HOME`, `switchClass`, `assignFirstClass`, `recordClassWork`, `restoreRun` |
| `classes.test.ts` | Unit tests (see §5) |

Runtime (plain JS on `window`, loaded by `runtime/index.js` after `arena.js`):

| File | Contents |
| --- | --- |
| `runtime/class-visuals.js` | `MQClassArt`: every picture (`visual`), small pictures in options (`mini`) and live build previews (`live`) |
| `runtime/class-games.js` | The chapter and practice runner; registers 40 chapter levels and 42 practice levels |
| `runtime/classes.js` | `MQClasses`: `grade`, `current`, `canOpen`, `slotChapter`, `slotDone`, `nextChapter`, `switchTo`, `openPicker`, `ensureGrade` |
| `styles/classes.css` | Picker, class stage, controls and pictures |

Changed elsewhere: `runtime/voyage-world.js` (island rewritten per class), `runtime/pathway.js` (class practice atlas; `mountTrail(stage, api, id, { band })` exported on `MQPath`), `runtime/voyage-story.js` (`kicker` option), `runtime/modern.js` (playground unlocks by slot), `runtime/adult-dashboard.js` (class line and **Change class**), `src/adventure/progressReport.ts` (class-aware), `runtime/index.js`, `AdventureRoot.tsx`, `package.json` (`smoke:classes`), `scripts/adventure-classes.mjs` (new) and the eight existing suites.

## 4. Rules to preserve

- **Correctness stays in code.** A generator returns a task carrying its own answer; the runtime only draws it and calls `checkTask`. Any new question must pass `validateTask` and the seeded tests. AI never decides correctness.
- **Unlocking.** `MQClasses.canOpen(id)`: a chapter opens only in its own class, in slot order; slot 1, `unlockAll` and any already-finished chapter always open.
- **Save shape** (`mq.playtest.v3`, still v3):
  - `grade`: the current class.
  - `classes[grade]`: stored copies of `CLASS_FIELDS` (`chapters`, `stars`, `learning`, `curriculum`, `voyage`, `dreamProgress`, `facts`, `choice`, `classWork`, `classRuns`).
  - `classWork.skills[skill]`: `{ attempts, recent: [{ correct, independent }] }`, last 8.
  - `classRuns[chapterId]`: `{ seed, round, independent }` checkpoint.
  - Shared and never swapped: coins, badges, cosmetics, minis, best scores, and `voyage.camp`, `voyage.keepsakes`, `voyage.records`.
  - `switchClass` snapshots the old class and loads the new one; `runtime/classes.js` `apply()` also restores defaults the store expects (`chapters`, `stars`, `facts`, `choice`).
- **Determinism.** `chapterTask(chapter, seed, round)` is pure, so a checkpoint replays the same question.
- **Evidence.** An answer counts as independent only on the first try with no hint, no "Show me how" and no earlier miss. Supported answers are recorded separately.
- **Accessibility.** Right and wrong are never color alone; touch targets ≥48px; the number line scrolls inside its own container so the page never scrolls sideways.
- Runtime JS is excluded from ESLint, so verify runtime changes in the browser.

## 5. How to verify

```powershell
npm.cmd run check                                  # typecheck, lint, 285 unit tests, license audit
npm.cmd run dev -- --port 3001                     # if no server is already answering on 3001
$env:BASE_URL='http://localhost:3001'
npm.cmd run smoke:classes                          # the class suite
```

The class unit tests generate every round of all 40 new chapters across 40 seeds (8,000 questions) and require each to validate, accept its right answer and reject a wrong one. They also cover answer formats, `switchClass`, legacy migration, bounded evidence and the class-aware report.

`smoke:classes` covers the picker, a Grade 3 chapter from story to bonus game, resuming from a checkpoint, practice, switching class in Adults, playground unlocks by slot, a legacy save, every class chapter and practice trail (229 questions solved through "Show me how"), and a phone pass. Board screenshots land in `test-results/classes/boards/`, one per chapter question — useful for a teacher review.

The other suites now seed a `grade` and call `MQClasses.switchTo(...)` when a step belongs to another class; follow that pattern if you add steps.

**Status at handoff:** `npm run check`, `npm run build` and all ten browser suites pass (`classes`, `voyage`, `frontier`, `complete`, `companion`, `arcade`, `arena`, `learning`, `adventure`, `flight`). `smoke:flight` had stalled on 2026-09-15 on a loaded machine and passed on a rerun the next day; if it stalls for you, check load before assuming a bug — headless Chromium drew that game at 10 fps under load (60 fps elsewhere) and the flight caps each frame at 50 ms of game time, so its legs overrun the suite's 70-second waits.

## 6. Remaining work, in the order I would do it

1. **Confirm the toolchain on your machine first.** `npm run check`, `npm run build` and all ten browser suites pass here (2026-09-16), so a failure you see at the start is likely environmental rather than a bug in this work.
2. **Art polish (the owner deferred this deliberately).** New chapters draw an emoji badge landmark (`vw-emoji-building` in `runtime/voyage-world.js`) on the shared island from `runtime/voyage-art.js`. Give each class its own island tint or art, and consider per-chapter landmark drawings. `#voyageWorld` carries `data-class`, so CSS can key off it.
3. **Teacher review of question wording.** I reviewed a sample and fixed grammar, clock choices, graph phrasing, Grade 3 fraction denominators, line-plot variety and shape-family reasons. The rest is unreviewed. Screenshots per question already exist (§5).
4. **Class-completion celebration.** The "Lantern Keeper" certificate is skipped once a class is chosen (`runtime/classes.js` wraps `MQUX.certificate`), because it celebrated the original three-chapter story. Nothing replaces it yet; finishing slot 8 deserves a moment, and possibly a badge (`runtime/achievements.js` currently only knows the original chapters).
5. **Syllabus items that need drawing.** Answers are chosen, typed, tapped, sorted, ordered or built with dials. "Draw shapes with given attributes" and "draw angles" are practiced by building or choosing. A simple drawing or peg-board input would close that gap.
6. **Optional polish:** per-class badges; a class chip in the world heading that explains where to change class; Story Lab currently ignores the class when it themes a mission.

## 7. Gotchas

- `runtime/classes.js` wraps `MQ.start` and `MQStory.prologue`. Load order matters: it must run after every level registers, and `class-games.js` reads `window.MQClassArt` at module scope, so `class-visuals.js` loads first.
- The class picker is modal and cannot be escaped on a first run; the Adults version can.
- `voyage-world.js` renders a "Choose my class" state when no class is set. Keep that path working: it is what a legacy save shows behind the picker.
- Story choices are per class (`voyage.promise` lives in `CLASS_FIELDS`), so Grade 3's Workshop intro uses the "together" line. `smoke:voyage` asserts this.
- Nimbus appears from Grade 2 on the island (`slotDone(4)` and not K/G1). Keep character roles coherent if you add chapters.
- `progressReport` shows the class's syllabus skills plus any trail or game where that class recorded evidence, so the frontier dashboard checks still pass.
