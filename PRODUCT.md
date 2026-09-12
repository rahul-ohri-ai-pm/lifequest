# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** One individual managing their own tasks and progression offline. Operating context: personal device (phone, tablet), private, no network dependency. Success: fast capture, correct game math, satisfying progression without punishment. The user owns the data entirely; no accounts, no backend, no sharing.

## Product Purpose

LifeQuest converts real-life work into RPG-style progression. Tasks—habits, chores, workouts, deep work, reading, todos—are logged as completions and converted into XP, character/skill levels, streaks, badges, and eventually goals. The progression system is forgiving (no hard streaks, no punishing curves) and offline-first (SQLite on-device via WebAssembly, zero network calls after first load). Success: the user feels rewarded for work, sees patterns in their own behavior, and keeps using it.

## Positioning

Offline-first gamified task tracker with no accounts, no backend, no network dependency, and no social features. All data lives in on-device SQLite. The game math is derived from a log (streaks and badges are recomputed, never incremented), so retroactive edits to past days genuinely repair broken streaks and unlock badges without special code paths. The UI is a installable PWA, fast on low-end phones, and visually cohesive.

## Operating Context

Primary workflow:
1. Fast capture: open the app, create/log a task in < 5s, close.
2. Today view: see current quests and completions, visual streak/level status, one-tap complete/undo/skip.
3. Calendar: browse history, see completed vs. missed days as visual markers, edit past-day status directly and see streaks repair.
4. Profile: character/level, lifetime record, skill radar, category management, badge shelf.
5. Stats: dashboard with per-skill metrics and completion history, filterable by time range.

The app must work entirely offline after first install. OPFS holds the only copy of the data; a manual JSON export/import (Profile → Storage) is the backup path (Phase 3, done 2026-09-12).

## Capabilities and Constraints

**Definite:**
- All three task types: todo (one-off, optional due date), habit (recurring on a schedule), counted (daily-reset progress toward a target, e.g. 8 glasses of water).
- Verbs: create, edit, complete, undo complete, skip, snooze, archive, unarchive. No hard delete.
- XP and levels: character and per-skill, independent pools, same polynomial curve.
- Streaks: per-habit (consecutive scheduled days) and global ("active day" = any day with ≥1 completion). No freezes; a miss breaks the streak.
- Badges: 30 declarative rules, progress rings, gallery with locked/hidden states, unlock moments.
- Categories (skills): user-managed, renaming/adding/removing, split XP evenly across tagged tasks.
- Calendar: month view with visual markers (completed = filled blue, missed = red outline, planned = grey outline), day list editing for past/present days, picker for retroactive logging.
- JSON export/import: full-database backup and wholesale restore (Profile → Storage), with a confirm step and field-level validation on import.

**Explicitly undecided (Phase 3+):**
- Goals: skill-level targets, aggregate counts, streak-length, completion-count.
- Full stats screen and heatmap: completion density over time, best day/week, completion rate by weekday.
- Local notifications for reminders.

**Technical constraints:**
- Web only (PWA, no native wrappers or separate apps for iOS/Android).
- Lightweight: bundle size, fast cold start, smooth on low-end Android are first-class constraints.
- No heavy animation libraries (no Lottie, no three.js). Motion budget: `motion` (~33 KB) + `gsap` (~41 KB, for three effects: Flip, SplitText, DrawSVG). At rest: 0–1 animations only.
- No custom illustrated art; vector/glow-panel aesthetic only.
- One display font (geometric sci-fi, e.g. Orbitron) for headers; system font for body text.
- Fonts: load only specific weights used, never entire families.
- Dark theme only. No light mode.
- WCAG AA minimum for text contrast (4.5:1 normal, 3.0:1 UI); AAA for critical UI.

## Brand Commitments

**Aesthetic:** Anime "system window" look inspired by *Solo Leveling* in-game UI. Dark background, glowing blue/purple panels/borders, sharp sci-fi typography. Vector and glow only (no custom art, no illustrated characters).

**Tone:** Forgiving, non-punishing. Streaks break but reset counts are tracked (visible, not hidden). Skips are distinct from misses. Missed days show as alerts but never as failure shame.

**Terminology:** "quests" not "tasks" in some UI contexts (e.g. "quest row," "active quests") to reinforce the RPG language. "Streak" not "habit chain." "Badge" not "achievement." Consistent with the *Solo Leveling* reference.

## Evidence on Hand

- **CLAUDE.md** (checked in): full product spec, phased roadmap (Phases 1–3), XP/level/streak rules, design direction, and architecture.
- **DECISIONS.md**: 53 architectural and design decisions with rationale. D53 mandates MCP discipline (only github and Claude_Code_Remote MCPs in use for this project).
- **ARCHITECTURE.md**: four strict layers (routes → store → db/queries → engine), data flow, current schema (6 tables, Phases 1–2 complete, Phase 3 schema defined).
- **CONVENTIONS.md**: hard rules for migrations, date handling, verification workflow, layer boundaries.
- **PROGRESS.md**: what's done (Phase 2 complete), what's next (Phase 3), known debt.
- **GOTCHAS.md**: environment traps (Vite base path, OPFS single-connection, font subsets, build-over-warm-dist artifact).
- **Code**: 157 unit tests (all engine, 100% covered). React + Vite + TypeScript strict. Zustand stores. SQLite in a worker via `@sqlite.org/sqlite-wasm` + `opfs-sahpool` VFS.
- **Live app**: https://gamedev1991.github.io/lifequest/ (deployed from main → GitHub Pages).

**Absent assets:**
- No existing PRODUCT.md, DESIGN.md, or design tokens documentation (brand world exists in code/CLAUDE.md only).
- No figma/mocks/comp imagery.
- No user research, interviews, or testing data (single owner, no external feedback loop yet).

## Product Principles

1. **Offline-first by default.** No accounts, no backend, no network calls post-install. Data lives on-device in SQLite. Future backup/export is user-driven, not cloud-sync.
2. **Derived, not incremented.** Streaks and badges are recomputed from the completion log on every write, so retroactive edits to history genuinely repair broken streaks and unlock badges.
3. **Forgiving progression.** No punishing curves, no grace-period mechanics that hide breaks. Streaks reset visibly, but reset counts are tracked so history is never erased. A missed day is a fact, not a shame.
4. **Lightweight by design.** Every dependency, every animation, every asset is audited for bundle size and performance. Low-end phones come first. Smooth at zero idle animations.
5. **Consistent visual language.** One dark theme, one display font, vector/glow aesthetic only. Details matter (spacing, contrast, state colors) but consistency beats novelty. The Solo Leveling reference is binding.

## Accessibility & Inclusion

**WCAG AA minimum (4.5:1 text contrast, 3.0:1 UI components).** Dark theme only means no forced light-mode burden. Buttons and interactive elements use consistent, discoverable states (borders, fills, text labels). Skipped and missed days are distinguished by color and text label, not color alone (CVD-safe; ΔE ≥ 18 from reserved tokens). No tiny fonts or touch targets under 7×7 px. Reduced-motion respected (GSAP context honors `prefers-reduced-motion`). Screen-reader support on key elements (aria-labels, roles, checked state).

No accessibility research or testing with users yet; current implementation follows platform patterns and WCAG guidance only.
