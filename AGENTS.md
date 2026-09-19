<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MathQuest

Current implementation: read [docs/GRADE_GAMEPLAY_REVIEW.md](docs/GRADE_GAMEPLAY_REVIEW.md) and the top of PROJECT_STATE first. The owner wants visual, move-based games at each grade, not arithmetic worksheets. Roaming Hoot and the `coach` AI task are implemented; live AI remains dependent on server configuration. Use `smoke:classes` and `smoke:grade-play` for the new flows. The older universal Arena/docked-companion smoke scripts describe the historical implementation.

Start with [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md), especially **Read first: latest owner direction and Claude handoff**. It records the eight-chapter adventure (`/`), the classic MVP (`/classic`), architecture, saves, verification and current priorities for the 2026-09-18 deadline. Project rules and commands are in [CLAUDE.md](CLAUDE.md).

The owner wants AI to become an active main gameplay feature. The new “Teach Pip, Save the Isles” concept was suggested but not understood or selected; it is not implemented. Do not confuse it with the existing three authored Teach Pip explanation activities. [docs/AI_PLAYBOOK.md](docs/AI_PLAYBOOK.md) separates current features from the three unselected proposals. Preserve the substantial uncommitted work from both agents.
