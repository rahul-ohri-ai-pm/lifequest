# LifeQuest — Execution Plan

Synthesized from a two-agent architecture debate (2026-07-09): foundation-first for the engine/data
core (the append-forever completions log must never receive wrong rows), vertical slices for
everything after (every migration ships with the UI that reads it; app runnable at every milestone).
Spec: [CLAUDE.md](CLAUDE.md). Progress: [PROGRESS.md](PROGRESS.md).

## Settled technical decisions

| Decision | Choice |
|---|---|
| SQLite API | Async (`openDatabaseAsync`/`runAsync`); `withExclusiveTransactionAsync` for XP write paths |
| Atomicity | `logCompletion` = completion insert + character XP update in one exclusive transaction; `undoCompletion` is its exact inverse. Dev-mode invariant: `character.total_xp === SUM(completions.xp_awarded)` |
| UUIDs | `expo-crypto` `Crypto.randomUUID()` |
| Day keys | Local `YYYY-MM-DD` from date components (never `toISOString()`); day arithmetic via calendar constructors (DST-safe) |
| Calendar | Hand-rolled: pure `monthGrid()` in engine + 7-column Pressable grid. No calendar library |
| Zustand | Write-to-DB-first enforced structurally: queries return persisted rows; stores only `set()` from those return values |
| Migrations | `0001_init` = Phase 1 tables only (incl. `skips`, indexes, CHECK constraints). Phase 2/3 tables in later migrations, shipped with their UI |
| Fonts | Rajdhani Regular + Bold only, loaded at first styled screen |

## Phase 1 milestones

- **M0 — Scaffold**: Expo SDK 57 + TS strict, Jest, router 4-tab dark shell, theme/glow tokens, all-phase types
- **M1 — Engine core + tests**: tuning/xp (golden §7 table), time (dayKey, DST-safe), counted-award rule, monthGrid
- **M2 — Data layer**: db client, migration runner, `0001_init`, typed queries, transactional logCompletion/undoCompletion, XP-sum invariant in `__DEV__`
- **M3 — Golden slice**: hydration-gated root layout, Today screen, fast capture (todos), complete → XP → profile level; survives kill + relaunch
- **M4 — Undo + archive/unarchive**: exact XP reversal in the running app
- **M5 — Habits + skip**: `schedule_json` into Today, skip action on scheduled days
- **M6 — Counted tasks**: daily reset UI over tested award logic
- **M7 — Edit + snooze**: full field editing; due/reminder stored (notifications = Phase 3)
- **M8 — Calendar screen**: monthGrid rendered with glow styling; tap day → that day's tasks
- **M9 — Hardening**: restart-survival audit, glow polish everywhere, cold-start/bundle measurement, drop expo-router's default 956KB tab-icon font (replace with inline SVG icons)

## Phase 2 (repeat M1→M3 pattern per feature)

1. `streaks.ts` table-tested (schedule × completion × skip permutations) **before** streak UI
2. `0002_skills_and_streaks` migration + skill tagging UI + split-XP rule
3. Badge engine tested against synthetic logs → badge gallery (~25 badges, hidden states)
4. Skill dashboard in stats tab with date filters

## Phase 3

1. `goals.ts` engine + goals UI (4 goal types, bonus XP + badge)
2. Full stats screen + GitHub-style heatmap (pure reads over completions)
3. Local notifications (expo-notifications, reminders only)
4. Level-up celebration animations (reanimated)
5. JSON export/import + round-trip test (export → fresh install → import → identical state)
