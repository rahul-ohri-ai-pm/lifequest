# LifeQuest — Development Progress

Plan: [PLAN.md](PLAN.md). Update this file at every milestone commit.

## Phase 1

| Milestone | Status | Commit | Notes |
|---|---|---|---|
| M0 — Scaffold | ✅ Done (2026-07-09) | `1c06f37` | Expo SDK 57, router 4-tab dark shell, theme tokens, all-phase types. Typecheck + Android bundle verified |
| M1 — Engine core + tests | ✅ Done (2026-07-09) | `868ae35` | 46 tests passing: XP golden table, dayKey/DST, counted-award rule, monthGrid |
| M2 — Data layer | ✅ Done (2026-07-09) | | SQLite client, migration runner, `0001_init` (Phase 1 tables + indexes + CHECKs), typed queries, atomic logCompletion/undoCompletion, `__DEV__` XP-sum invariant |
| M3 — Golden slice | ✅ Done (2026-07-09) | | Startup gate (migrate→hydrate→render), Today fast capture + complete, profile level/XP bar. ⚠ Restart-survival needs on-device check |
| M4 — Undo + archive | ✅ Done (2026-07-09) | `a5b251e` | Undo latest completion, task detail screen, archived list w/ restore (Profile link) |
| M5 — Habits + skip | ✅ Done (2026-07-09) | `1b640f1` | Type selector + weekday schedule picker, Today filters habits by schedule, skip/unskip |
| M6 — Counted tasks | ✅ Done (2026-07-09) | `ce11b97` | +1 progress logging, x/y display, threshold entry carries full XP, undo reverses per-row |
| M7 — Edit + snooze | ✅ Done (2026-07-09) | `00f7934` | Full edit form (all type-specific fields), snooze +1d/+1w, updateTask schedule-null fix |
| M8 — Calendar screen | ✅ Done (2026-07-09) | `e857e3a` | Hand-rolled month grid, activity dots, day tap → scheduled/due list w/ completed marks |
| M9 — Hardening | ✅ Done (2026-07-09) | | Inline SVG tab icons, 956KB icon-font stripped via metro stub. ⚠ On-device pass pending (restart survival, cold start) |

## Phase 2

| Item | Status |
|---|---|
| Streak engine (tested) | ⬜ |
| Skills migration + tagging + split XP | ⬜ |
| Badge engine + gallery | ⬜ |
| Skill dashboard | ⬜ |

## Phase 3

| Item | Status |
|---|---|
| Goals engine + UI | ⬜ |
| Full stats + heatmap | ⬜ |
| Local notifications | ⬜ |
| Level-up animations | ⬜ |
| JSON export/import | ⬜ |

## Known issues / tech debt

- ~~expo-router default tabs bundle a 956KB Material Symbols font~~ — fixed in M9 (metro.config.js resolves the package to an empty module; custom SVG tabBarIcons everywhere)
- `.npmrc` uses `legacy-peer-deps` (react-dom peer conflict in Expo SDK 57 tree) — revisit on SDK upgrade
- jest pinned to 29.x for jest-expo 57 compatibility
