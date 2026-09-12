# MathQuest

An adaptive K–5 math adventure where a child's progress through the world reflects what they have actually mastered. Built for the Nerdy AI Hackathon (Prompt 01: K–5 Math Game).

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm run check   # typecheck, lint, unit tests, license audit
```

## Project layout

```
docs/          product spec, hackathon rules, license report
scripts/       license audit
src/app/       Next.js routes, layout and design tokens
src/engine/    pure TypeScript learning engine (math, mastery, adaptivity) with unit tests
src/game/      React screens and components
src/ai/        optional Claude features with deterministic fallbacks
src/lib/       browser storage and shared helpers
vendor/        sharp stub (keeps LGPL binaries out of the tree)
```
