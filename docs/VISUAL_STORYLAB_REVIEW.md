# Meaningful visuals, student themes and Story Lab — 2026-09-16

**Themes were removed on 2026-09-17** at the owner's request: no picker, no `studentTheme`, one fixed setting per class. Everything else on this page still applies; see the top of [PROJECT_STATE.md](PROJECT_STATE.md).

This update follows the owner's screenshots of a bare standard-algorithm problem and unrelated houses in Factor Forest. It also addresses the request for useful Story Lab adventures and class-appropriate theme choices. Read alongside [GRADE_GAMEPLAY_REVIEW.md](GRADE_GAMEPLAY_REVIEW.md); the six-class curriculum and roaming Hoot remain in place.

## Delivered

- Addition/subtraction now show aligned place-value columns with operand blocks, including decimal places. Addition reserves an extra leading place for a possible final regroup. Multiplication shows a partitioned partial-product model; division shows a grouping plan, including decimal group sizes. Models do not fill in answers. Desktop layouts place answer controls beside the model; narrow screens stack controls and allow the model to scroll internally.
- Factor Forest's factor-choice rounds now arrange the actual number of seeds into the selected row size, showing complete rows and leftovers. Changing a choice rearranges the same seeds. Other choice questions use their own diagrams/options instead of arbitrary houses, tents and delivery destinations.
- Area-formula diagrams now show the actual dimensions with labels, rather than a silently shortened rectangle.
- ~~The HUD **Theme** button opens a native keyboard-accessible dialog with three named choices per class.~~ **Removed 2026-09-17.** Each class now has one fixed setting, which still supplies Story Lab's characters, supplies and boards.
- Story Lab has two purposes, **Help the crew** and **Build something together**, a preview of four connected class-level activities, character-led openings/endings, and an adventure book. It no longer samples unrelated chapter questions. Younger classes collect, sort and construct objects; older classes add factors, division, fractions, decimals, geometry and coordinates.
- Completing a story stores its seed, class, purpose and validated narrative. Up to eight books per class can be replayed with the same tasks and story. Each class keeps its own books. Main-chapter unlock rules are unchanged.

## AI boundary

The existing `mission` request now includes the four ordered mission purposes as a bounded `itinerary`. The writer receives the grade, theme, activity focus and optional short fictional twist. It writes the opening, matching encounter beats and ending around that plan. Math generation/checking stays in code. Changing theme, purpose, class or the idea cancels an old draft; stale replies cannot replace the new plan. Built-in stories remain playable when AI is off, slow or rejected, with explicit source labels.

Saved narrative is checked again before replay. No new provider, dependency, paid AI call or key change was introduced. Provider integration was tested with mocked replies, not a live model. The roaming Hoot implementation is unchanged.

## Files and saves

- `classes/mathModels.ts`: operand parsing, decimal alignment and equal-row grouping.
- `runtime/math-workbench.js`: arithmetic/factor models; `class-visuals.js` and `class-play.js` route tasks to them.
- `classes/storyLab.ts`: the fixed per-class setting, deterministic four-stop plans, character premises and bounded save restoration.
- `runtime/story-studio.js`: current Story Lab. The old `dream-lab.js` is retained as **unloaded legacy code**.
- `runtime/class-games.js`: plays the fixed story plan and records completed books.
- `styles/meaningful-play.css`: final adventure stylesheet layer.
- `storyShelf` is a new per-class field under the existing `mq.playtest.v3` save. No reset or migration is required.
- `src/ai/adventure/schemas.ts` and `prompts.ts`: bounded itinerary contract and story-writing instructions.

## Verification

- `npm run check`: passed typecheck, lint, **40 files / 303 tests**, license audit. The final regroup-column assertion also passed its targeted unit rerun.
- `npm run build`: passed the final production build.
- `npm run smoke:models-story`: operand displays, factor seed conservation, every class/purpose combination (12 full journeys), completion/replay, phone layouts, cancelled drafts, and one mocked AI-writing request with the actual itinerary.
- Regression suites: `npm run smoke:classes` passed **247 rendered/solved tasks**; `npm run smoke:grade-play` passed all six classes, Arenas, Hoot hint context, bonus isolation and phone layouts. Its final reload now waits for DOM readiness followed by explicit visible-UI assertions; the previous generic load-event wait timed out during development runs.
- A final targeted phone check confirms all five standard-addition place columns fit within the workbench at 390px, with no hidden ones column.
- Reviewed screenshots: `test-results/models-story/` (desktop place value/factor rows/Story Lab; phone place value/Story Lab). These are generated verification artifacts, not product assets.

Keep the substantial existing uncommitted work. No commit, push or deployment was performed. This is a visual and interaction improvement, not evidence of measured learning outcomes or a claim that every question is now an action game.
