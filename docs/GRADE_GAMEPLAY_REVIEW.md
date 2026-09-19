# Grade gameplay and roaming Hoot — 2026-09-16

## Owner direction

The six-class split must preserve visual, playable games. A quest should not become a sequence of addition cards. Reusing a game idea across classes is welcome when its numbers, concepts, controls and narrative fit the class. Arithmetic includes subtraction, multiplication and division at the appropriate grades. Hoot should travel with the player, stop on request, understand the active game and give successive AI hints without supplying answers.

## Implemented

The existing six islands and **48 chapters** remain. Seven original visual chapters remain in their assigned grades. Kindergarten's old moving-number Fireflies game has been replaced by **Firefly Homes**, preserving its level ID and chapter slot. There are now **41 generated chapter registrations**, 36 practice routes, six mixed expeditions and six grade-specific Arenas.

### Games, rather than only answer cards

`classes/worlds.ts` implements deterministic move-based games. `replayWorld` checks legal moves and the constructed result; UI and AI cannot award correctness.

| Mechanic | Gameplay | Grade use |
| --- | --- | --- |
| Bunny patch / cargo boat | Move objects into or out of the world; undo and try a different construction | K: within 10, fluency within 5. G1: within 20 and whole-ten cargo within 100. G2: bundled hundreds/tens/ones within 1,000 |
| Operation gates | Steer a cart through gates; its cargo changes after each move; inspect the next gate and undo | G3 two-step multiplication with division or subtraction, within 100 |
| Robot power depot | Distribute cells equally, take them back, and inspect every robot's supply | G3 division; G4 includes a remainder and bundles of ten |
| Fraction construction | Place or remove proportional pieces and compare with one whole; the chapter supplies the quilt, garden walkway, lighthouse glass, water channel or copper-foundry setting | G1 halves/fourths; G2 thirds/fourths; G3 fraction equivalence; G4 like-denominator addition/subtraction; G5 unlike-denominator addition/subtraction |
| Sorting depot | Select or drag cargo into named bays; move it again if needed | Shape families, attributes, equations, odd/even and other class-specific sorting |
| Carriage train | Attach carriages in order and unhook to revise | Counting sequences, measurement and ordering |
| River stones / destinations | Move a character to a landing stone or delivery destination | Number lines, fractional positions and existing choice activities |
| Direct scenes | Collect berries, fill firefly homes, balance stones, plant equal rows, light fraction panes, choose coordinate docks | K–5, with grade-owned generators |

The renderer is `runtime/class-play.js`; scene rendering stays in `class-games.js`. Existing clocks, place-value blocks, protractors, volume builders and other manipulatives remain. Some numerical reasoning tasks still use a numeric entry with a visual model; this is not a claim that all 205 generated chapter rounds are separate action games. Every Bunny Hop round is now move-based. A browser speech-synthesis button can read the current mission where supported.

### Curriculum and shared-feature corrections

- K no longer catches moving arithmetic targets. Arithmetic stays within 10; the fluency mission stays within 5. Teen distractors stay in the ten-and-ones model. The shop uses single coins and prices within 5 for K.
- G1 removes the three-digit place-value builder; counting to 120 remains. The original frog's advanced replays are capped at a total of 100.
- G2 Skyrail uses addition/subtraction, not multiplication. Arrays use repeated-addition language. Money word problems use whole cents below 100.
- G3 equivalent-fraction generators restrict denominators to 2, 3, 4, 6 and 8.
- G4 includes equivalent, mixed and like-denominator fraction work. G5 decimal multiplication/division uses decimal operands; unlike-denominator fractions and coordinates remain.
- Fixed an equality generator that could loop indefinitely on a tiny sum, misleading volume-model dimensions, and imprecise triangle-composition wording.
- All 36 class practice routes now draw from that class's audited chapter sources. Old broad concept-trail bands are not used for class practice.
- Each Arena samples only its class, avoids immediate chapter repetition and keeps a separate **session** rating. Ratings select rounds inside the grade; these are not calibrated psychometric scores. The old ungraded misconception-boss Arena remains legacy code and is not the class Arena.
- Story Lab selects four missions from the active class and includes grade/focus in its AI narrative request. Its built-in fallback is labeled.
- Bonus variants: K/G1 lantern flight is a stationary, untimed light game; their delivery game uses simple walking paths; bowling uses lanes. K gets a shape parade. G5 gets coordinate delivery. Memory pairs, rhythm lengths, aiming wind, pop targets and orchestra complexity vary by class.
- Bonus completions, best scores and voyage play records now stay with the class. Coins, cosmetics, badges, camp and keepsakes remain shared deliberately.
- A wrong answer no longer automatically reveals the answer after three attempts. The explicit worked-example button remains, recorded as supported work. Hint/retry support persists when leaving and resuming a mission; it does not spill into the next unseen mission.

### Roaming Hoot

`runtime/roaming-hoot.js` provides the persistent owl on the map, levels, stories and bonus overlays. It travels between peripheral perches, stops on hover/focus/click, supports a pinned position and reduced motion, and opens a keyboard-accessible dialog.

The new `coach` task in `/api/adventure-ai` receives **structured live game state**, not a screenshot: selected grade, activity, goal, objects, current construction/response, recent moves, step number and previous hints. Chapter and Arena requests include a seed/round reference so the server reconstructs the authoritative task. Practice and bonus context comes from the active game/visible controls. Up to four successive hints build on prior hints. Replies are dropped if the active problem changes; closing aborts the request.

`src/ai/adventure/coach.ts` sets grade-specific word limits and checks the AI output for numeric answers, protected answer labels, duplicate hints, links and disallowed text. These guards reduce answer leakage; they are not a formal guarantee about every possible model response. Correctness, awards and progress remain deterministic.

**Disconnected AI is explicitly labeled.** The owl does not substitute authored text and present it as an AI hint. AI can be rechecked from its panel. Browser tests use mocked provider responses and verify the request's grade, changed construction and previous hint. No paid provider call was made; local `/api/adventure-ai` reported AI disabled during this work. Existing server model/provider configuration was preserved.

## Verification and handoff

- `npm run check`: passed typecheck, lint, **38 files / 295 tests** and the license audit, including the Grade 1 frog bound.
- `npm run build`: passed the final production build, TypeScript and static-page generation.
- `npm run smoke:classes`: passed **247 rendered/solved tasks**, all generated chapters and class practice routes, first-run class selection, chapter results/bonuses, checkpoint continuation, legacy save migration, adult class switching and phone layouts.
- `npm run smoke:grade-play`: passed real moves, all six Arenas and all six Story Lab class flows, AI hint history (two mocked coach calls), bonus isolation, direct-entry grade checks, offline labeling and phone screenshots.
- Screenshots: `test-results/classes/` and `test-results/grade-play/` (generated artifacts, not source assets).

The older `smoke:arena`, `smoke:companion` and `smoke:complete` scripts target the old universal Arena, docked companion and moving Fireflies. They are historical compatibility scripts and are not evidence for this new class flow. Use the class and grade-play suites for it.

Preserve the substantial uncommitted work. No commit, push, deployment, dependency install or paid AI request was performed. Before a live demo, connect the server's existing AI configuration and verify actual provider output; speech synthesis also depends on browser/OS voice support. Child usability testing remains valuable—the automated checks do not establish teaching effectiveness or complete standards mastery.
