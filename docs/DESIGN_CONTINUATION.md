# Explorer's storybook continuation

**Historical design record, not the current handoff.** This describes the 2026-09-13 three-chapter pass. The current product has eight chapters, eight bonus games, two regions, Story Lab and Adults; the final stylesheet is `frontier.css`. Start with [PROJECT_STATE.md](PROJECT_STATE.md) for the latest implementation, verification and owner feedback, and [AI_PLAYBOOK.md](AI_PLAYBOOK.md) for the unselected active-AI proposals. Details below describe this earlier pass only.

2026-09-13. This pass continues the existing Claude Code adventure; it does not replace the classic MVP or its engine.

## What changed and why

The old cover and map relied on enlarged emoji, multiple competing surface styles, and several locked destinations. The new cover has an original SVG landscape and owl, an immediately visible start action, and a consistent paper/forest palette. The map explains the next step, shows the three actual chapters, and makes the Great Lantern's restoration visible. Mini-games retain their own visual personalities.

The learning additions expose the math already inside the mechanics: Frog Hop shows the current number as tens and ones, and Firefly Tens shows a ten-frame. Children can use these models while thinking instead of relying only on verbal hints. River difficulty responds to repeated overshoots, and replay numbers come from the existing pure TypeScript generator. The journal names actions the child has actually taken, rather than overstating mastery from a short adventure.

Firefly connections are serialized so rapid input cannot fill the same lantern slot twice. Its combo counts consecutive correct connections, removing the previous 3.5-second window. A partner pair is kept available; calm mode arranges stationary numbers in two rows. Wrong connections show the difference from ten.

The second pass connects all three chapters to a local learner model. Guided work, hints and retries stay distinct from independent answers; timing does not affect this evidence. The shared policy adjusts river replay levels and Guardian practice after a pattern of answers. Generated shields always have a valid regrouping pair, and the original story examples remain available for a first visit. A native block-helper dialog makes the Guardian target and the chosen card visible as tens and ones. The grown-ups journal shows a bounded practice snapshot rather than a mastery certificate.

Two unsuccessful firefly connections make the numbers stay still for that visit. Guardian controls disable while a spell resolves, and its riddle bubbles respect reduced motion. Screenshot review fixed the last chapter overlapping the mobile map heading; keyboard checks cover both the block dialog and the journal disclosure.

## Files to start with

- `src/adventure/runtime/art.js`: original SVG illustrations and theme variants.
- `src/adventure/styles/storybook.css`: final design layer and responsive layouts.
- `src/adventure/runtime/ux.js`: cover, journey card, lantern progress, journal and certificate.
- `src/adventure/riverLearning.ts`: bounded river progression and engine adapter.
- `src/adventure/learning.ts` and `runtime/learning.js`: validated save restoration, evidence and chapter-specific tutor decisions.
- `src/adventure/runtime/guardian.js`: generated spells and the tens-and-ones helper.
- `src/adventure/runtime/fireflies.js`: ten-frame, sequential connections and calm mode.
- `src/adventure/runtime/accessibility.js`: focus containment for full-screen dialogs.
- `scripts/adventure-complete.mjs`: later chapter browser regression test.
- `scripts/adventure-learning.mjs`: retries, helper focus, simpler follow-up spells, journal, old saves and persistence.

## Authorship and assets

The illustrations are source SVG authored in the repository with Codex assistance; they are not downloaded or generated raster assets. The UI uses system fonts and existing OS emoji. Audio remains synthesized with Web Audio. This continuation adds no third-party package, font, image, audio file or external service. Existing dependency licenses are recorded in `THIRD_PARTY_LICENSES.md`; the eventual submission disclosure must describe both the earlier Claude Code assistance and this Codex continuation.

## Follow-up work

- Extend the connected learner model with broader evidence across representations, placement and interleaved review. The journal reports practice, not curriculum-wide mastery.
- Tune difficulty with adult proxy playtests across different reading and math levels.
- Verify real AI responses and latency with the owner's authorization for paid calls.
- Scope the legacy styles and give runtime modules an explicit mount/unmount lifecycle before adding client navigation or more worlds.
- Finish submission disclosures, record the demonstration, and deploy through the owner's account.
