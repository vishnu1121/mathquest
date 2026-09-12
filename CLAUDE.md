@AGENTS.md

# MathQuest

Adaptive K–5 math adventure (Addition Forest MVP) for the Nerdy AI Hackathon. The product spec and hackathon rules live in `docs/`.

## Commands
- `npm run dev`: local app at http://localhost:3000
- `npm run check`: typecheck, lint, unit tests and license audit. Run before every commit.
- `npm test`: Vitest unit tests

## Architecture rules
- `src/engine/` is pure TypeScript: no React, no network, no AI, and no direct `Date.now()` or `Math.random()` (inject a clock and the seeded RNG). It owns correctness, scoring, mastery and progression. Every module has a test file next to it.
- `src/game/` is the React UI. Components render engine state; they never compute math or mastery themselves.
- `src/ai/` is optional at runtime. Claude may only reword hints, judge explanations and write stories or notes. Every AI output is validated by code and has a deterministic fallback.
- Characters: Hoot the Owl helps. Pip the sprite is a learner who makes code-generated mistakes. Never swap their roles.

## Hard constraints (hackathon rules)
- No GPL, LGPL, AGPL or SSPL dependencies; MPL, EPL and CDDL need review. `npm run audit:licenses` must pass.
- No Tailwind (its lightningcss dependency is MPL-2.0). Never use `next/image`; `sharp` is replaced by `vendor/sharp-stub`.
- No biometrics, camera, emotion inference or real child data. Learner state stays in browser storage.
- System fonts only; no third-party font, image or audio files.

## Design system
- Tokens live in `src/app/globals.css` ("Sunny Forest" palette). Style through tokens and CSS Modules only.
- Right and wrong are never shown by color alone: always icon plus words (plus sound). Touch targets are at least 48px. Respect reduced motion.
