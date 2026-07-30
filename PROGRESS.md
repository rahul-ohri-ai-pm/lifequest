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

## Phase 1.5 (owner feedback round 1 — see PLAN.md)

| Milestone | Status | Notes |
|---|---|---|
| N1 — Standalone APK | ✅ Done (2026-07-11) | Local toolchain (JDK 17 + SDK 36), `LifeQuest.apk` on Desktop (93MB universal; arm64-only ≈30MB). Build steps in README |
| N2 — Stats dashboard v1 | ✅ Done (2026-07-11) `d956d43` | Today hero, 14-day chart, active days, habit follow-through %, top quests; 57 tests total |
| N3 — Capture rework (no type/difficulty pickers) | ✅ Done (2026-07-11) `4074b15` | Repeat/Target toggles, difficulty defaults medium (edit-screen only), schedule orthogonal everywhere |
| N4 — Skills/categories + split XP | ✅ Done (2026-07-11) `919b5c7` | 0002 migration, 8 defaults, split XP in completion transactions, MRU chips on capture + edit |
| N5 — Stats v1.5 (per-category + date filters) | ✅ Done (2026-07-11) | By-category panel (skill level/XP/count), 7d/30d/All filter on category + top-quests panels; 63 tests |

## Phase 1.6 (owner feedback round 2 — "the APK doesn't work, make it a web app")

| Milestone | Status | Notes |
|---|---|---|
| W1 — Web app / installable PWA | ✅ Done (2026-07-29) | Same codebase runs in the browser: SQLite via WebAssembly + OPFS, service worker supplying cross-origin isolation + offline cache, PWA manifest/icons (installs to home screen), GitHub Pages deploy workflow. Verified in a real browser end-to-end — 13/13 checks (see below). Two shared-code bugs fixed on the way: no exclusive transactions on web (`src/db/transaction.ts`), and an infinite-re-render zustand selector |
| W2 — Live deploy | ✅ Done (2026-07-30) | **https://gamedev1991.github.io/lifequest/** — run #4 (`workflow_dispatch` on `main`) green through `configure-pages` → `deploy-pages`. Runs #1–#3 all failed on the same wall: the repo had no Pages site, and the workflow cannot create one (`GITHUB_TOKEN`'s `pages: write` deploys to an existing site; creating one needs repo-admin). Unblocked by the owner enabling Settings → Pages → Source → GitHub Actions. Root, `manifest.webmanifest`, `sw.js`, `404.html` all serve 200 |

W1 verification (headless Chromium at phone viewport, served like GitHub Pages — subpath, no
COOP/COEP headers): service worker takes control → page cross-origin isolated → SQLite-wasm opens
→ migrations run → capture a quest → complete it → 25 XP awarded (§7 medium) → survives a full
reload (OPFS) → launches with the network off → hard load of `/task/<uuid>` resolves → no page
errors. All four tabs render with the glow-panel style intact.

## Phase 1.7 (owner feedback round 3 — "honestly? the UI/UX sucks")

| Milestone | Status | Notes |
|---|---|---|
| U1 — Design foundations | ✅ Done (2026-07-30) | Diagnosed against real screenshots of the live app, not from memory. Four fixes: (1) **the display font was never shipped** — `fonts.ts` named Rajdhani but `assets/fonts/` didn't exist and `fontFamily` appeared nowhere, so everything rendered in system Helvetica; now loaded via `@expo-google-fonts/rajdhani`, two weights only; (2) `TaskCard` rebuilt — category-colored spine for scannability, metadata shown only when it says something (every row printed an identical "Medium · 25 XP"), 40pt complete target that fills and glows, ghost buttons replacing underlined pseudo-links; (3) `TodayHeader` puts level + XP bar on Today so completing a quest visibly moves something; (4) calendar dots now mean completion (filled) vs planned (hollow) — they previously marked "has a scheduled task", which put an identical dot on every square of every month, forever |

Still open from the design pass (deliberately out of U1's scope): the capture panel occupies a third of the first screen with 8 category chips always expanded; Profile is ~85% empty; Stats opens with four zero-value panels, an empty 14-day chart, and a black bar in the TODAY panel that reads as a render glitch. The Stats rebuild is the natural home for the `dataviz` skill.

## Phase 2

| Item | Status |
|---|---|
| Streak engine (tested) | ⬜ — next up |
| Skills migration + tagging + split XP | ✅ Pulled forward into Phase 1.5 (N4 `919b5c7`): `0002` migration, 8 defaults, split XP in the completion transactions, MRU chips |
| Badge engine + gallery | ⬜ |
| Skill dashboard | ⬜ — partially covered by the N5 by-category panel; the full per-skill dashboard with day/week/month/all-time filters is still open |

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
- Web entry bundle is 1.3MB (plus a 621KB SQLite wasm, fetched once and cached). Fine over HTTPS with a service worker, but it's the number to watch against the §3 lightweight rule — Phase 2/3 screens should keep leaning on Expo Router's per-route splitting
- The web build has no automated regression test in CI yet: the browser end-to-end pass was run locally (scripted Playwright). The deploy workflow gates on typecheck + jest only. Worth adding if the web app becomes the only channel
- **The live site has not been confirmed on the owner's real phone yet.** The 13/13 pass was headless Chromium; iOS Safari differs on OPFS quota, service-worker lifetime, and home-screen-launch storage scoping. Not done until a quest survives a real close-and-reopen on the device
- `.npmrc` uses `legacy-peer-deps` (react-dom peer conflict in Expo SDK 57 tree) — revisit on SDK upgrade
- jest pinned to 29.x for jest-expo 57 compatibility
