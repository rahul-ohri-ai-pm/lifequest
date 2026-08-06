# LifeQuest — Execution Plan

> **Historical record + forward plan.** Milestones M0–M9 and Phases 1.5/1.6 were executed on the
> Expo/React Native stack that was removed on 2026-08-02 (DECISIONS D20). They are kept because the
> *sequencing* argument still holds and the decisions still bind — but where they name a platform
> API, read the "Settled technical decisions" table below for what is actually in use. Current
> status always lives in [PROGRESS.md](PROGRESS.md).

Synthesized from a two-agent architecture debate (2026-07-09): foundation-first for the engine/data
core (the append-forever completions log must never receive wrong rows), vertical slices for
everything after (every migration ships with the UI that reads it; app runnable at every milestone).
Spec: [CLAUDE.md](CLAUDE.md). Progress: [PROGRESS.md](PROGRESS.md).

## Settled technical decisions

| Decision | Choice |
|---|---|
| SQLite API | `@sqlite.org/sqlite-wasm` on the `opfs-sahpool` VFS in a dedicated worker, behind the 4-method `SqlDatabase` interface. *(Was expo-sqlite until 2026-08-02, D20/D22.)* Write-exclusivity is rebuilt in JS by `src/db/transaction.ts` — the VFS is single-connection |
| Atomicity | `logCompletion` = completion insert + character XP update in one exclusive transaction; `undoCompletion` is its exact inverse. Dev-mode invariant: `character.total_xp === SUM(completions.xp_awarded)` |
| UUIDs | `crypto.randomUUID()` (the platform API; `expo-crypto` went with Expo) |
| Day keys | Local `YYYY-MM-DD` from date components (never `toISOString()`); day arithmetic via calendar constructors (DST-safe) |
| Calendar | Hand-rolled: pure `monthGrid()` in engine + 7-column Pressable grid. No calendar library |
| Zustand | Write-to-DB-first enforced structurally: queries return persisted rows; stores only `set()` from those return values |
| Migrations | Forward-only, one logical change per file, immutable once shipped. `0001`–`0006` applied; `goals` is the only table still unbuilt |
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

## Phase 1.5 — owner feedback round 1 (2026-07-11, approved)

From first on-device use + PM/UX agent debate. Decisions: difficulty picker hidden (default
Medium, edit-screen only — column/engine untouched); type picker replaced by orthogonal
Repeat/Target toggles (schedule valid on any type, no table rebuild); skills pulled forward
(MRU one-tap chips, optional, split-XP kept); stats built in two passes so v1 needs no migration.

- **N1 — Standalone APK**: local build toolchain (JDK 17 + Android SDK), `expo prebuild` +
  `gradlew assembleRelease`, installable without Expo Go. Repeatable for every future release
- **N2 — Stats dashboard v1** (no migrations): today hero strip, 14-day completion bars,
  active-days tiles, completion-rate panel (skips distinct), top-tasks panel built on generic
  `{label,value,color}[]` so categories slot in later
- **N3 — Capture rework** (no migrations): remove type picker + difficulty chips; Repeat toggle
  (weekday row) + Target toggle (stepper); counted tasks can have schedules
- **N4 — Skills/categories**: `0002` migration, 8 defaults, MRU capture chips, split-XP,
  per-skill levels
- **N5 — Stats v1.5**: per-category XP/completions panel + day/week/month/all-time filter

Spec amendments to CLAUDE.md: §7 (default difficulty), §4 (capture form, orthogonal
schedule/target), §10 (resequencing). Streaks/badges remain Phase 2.

## Phase 1.6 — owner feedback round 2 (2026-07-29): "the APK doesn't work, make it a web app"

Distribution jumped the queue again. The self-built APK never ran on the owner's device, and every
iteration cost a laptop plus a 93MB sideload. The web build reaches the same phone through a URL and
installs to the home screen, so the feedback loop stops depending on a toolchain.

- **W1 — Web app / installable PWA**: `react-native-web` runtime, `expo-sqlite` on WebAssembly +
  OPFS, service worker for cross-origin isolation *and* offline caching, PWA manifest + icons,
  `output: "static"` export with `app/+html.tsx`, GitHub Pages deploy workflow. Shipped with two
  shared-code fixes surfaced by the browser: web has no exclusive SQLite transactions
  (`src/db/transaction.ts` now owns that difference) and a zustand selector was rebuilding an array
  every render (infinite loop under React 19)

Nothing in `src/engine/` changed — the game math was already platform-free, which is what made this
a distribution task rather than a rewrite. *(At the time, native stayed supported alongside web.
That ended on 2026-08-02: Expo was removed entirely and web became the only target — D20.)*

## Phase 2 — ✅ complete (2026-08-03)

The engine-before-UI pattern held for all four, and each one's math was tested against synthetic
logs before a pixel of it was drawn.

1. ✅ `streaks.ts` table-tested (schedule × completion × skip permutations, both DST transitions)
   **before** streak UI. Derived from the log, never incremented (D29)
2. ✅ Skill tagging + split-XP shipped earlier than planned, in N4 (`0002_skills`); streak
   persistence landed separately in `0003_streaks`
3. ✅ Badge engine tested against synthetic logs → gallery. **30 badges**, six hidden, rules as
   `measure`/`target` data rather than predicates (D39)
4. ✅ Skill dashboard with Day/Week/Month/All filters governing every panel

## Phase 3 — next

Ordering changed from the original list. **Export/import moves to the front**: OPFS holds the only
copy of the data and a durable-storage grant can be refused or revoked, so it is the item that
protects everything already built rather than adding to it.

1. **JSON export/import** + round-trip test (export → fresh install → import → identical state).
   Measured at ~425 KB / 47 KB gzipped for a realistic year, so size is no reason to delay it
2. `goals.ts` engine + goals UI (4 goal types, bonus XP + badge)
3. Full stats screen + GitHub-style heatmap (pure reads over completions)
4. Local notifications — the **Web Notifications + Service Worker** APIs, not `expo-notifications`
   (Expo is gone). Reminders only, and note that this is the first feature to need a permission
   prompt
5. ~~Level-up celebration animations (reanimated)~~ — **done early**, on GSAP, in Phase 1.12

## Open platform question

**iOS Safari.** Scoped out on 2026-08-02 (the owner owns no iOS device), then a second user hit a
hard startup failure there on 2026-08-03. There is no WebKit in the build environment, so nothing
iOS-specific can be verified here. Mitigations and an on-device OPFS probe shipped; whether iOS
becomes a supported platform is an open owner decision with a real cost attached (D41).
