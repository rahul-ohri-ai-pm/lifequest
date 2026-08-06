# Architecture (as built)

Four strict layers. Dependencies point downward only — a lower layer never imports from a higher
one. The spec behind this is [CLAUDE.md](CLAUDE.md) §3–§4; this file describes the code as it
exists.

```
src/routes/     UI routes (React Router)     — imports store, components, engine (read-only helpers)
src/store/      Zustand stores               — imports db/queries + engine
src/db/         SQLite client, migrations, queries — imports engine (level math only)
src/engine/     PURE TypeScript game math    — imports NOTHING but src/types. No React/DOM/DB/IO.
```

The 2026-08-02 rewrite swapped the entire UI framework (React Native + Expo → React + Vite +
Tailwind) and the entire SQLite driver, and the bottom two layers did not change: `src/engine/`,
`src/types/`, `src/store/`, and every SQL statement moved across untouched, with all 63 engine
tests passing on the new runner without edits. That is the layering earning its keep.

**Test count is now 138** (engine, plus the icon registry). Every engine function is covered.

## File map

| Path | Responsibility |
|---|---|
| **Engine — pure TypeScript, no imports beyond `src/types`** ||
| `src/engine/tuning.ts` | Difficulty→XP table, level-curve constants. The only place to tune numbers |
| `src/engine/xp.ts` | `xpForDifficulty`, `xpRequiredForLevel`, `levelForTotalXp`, `levelProgress`, `splitSkillXp` |
| `src/engine/time.ts` | `dayKeyFor` (LOCAL date key), `addDays` (DST-safe), `dateFromDayKey`, `dayWindow`, `isScheduledDay` |
| `src/engine/counted.ts` | `xpForCountedLog` — the one-award-per-day threshold rule |
| `src/engine/calendar.ts` | `monthGrid(year, month)` |
| `src/engine/stats.ts` | Aggregations over the log: `lastNDayCounts`, `activeDaysInLast`, `scheduledOutcomes`, `topTasks`, `skillBreakdown`, `rangeSummary`, `weekStrip` |
| `src/engine/streaks.ts` | Streak transitions, **derived** from completion days — `computeHabitStreak`, `computeGlobalStreak`, `isStreakAtRisk`, `mergeLongest` (D29) |
| `src/engine/badges.ts` | The badge catalogue as data (30 rules) + `evaluateBadges` / `newlyUnlocked` / `sortForGallery`. Rules are `measure`/`target` pairs, not predicates (D39) |
| `src/engine/__tests__/` | 132 engine tests. Every engine function is covered; keep it that way |
| **Data layer — the only place raw SQL lives** ||
| `src/db/sqlite.ts` | The `SqlDatabase` interface (4 methods) everything above `db/` is written against. Survived a full driver swap unchanged |
| `src/db/client.ts` | `getDb()` singleton; owns the worker protocol, the single-tab Web Lock, the user-facing startup error, and `probeStorage()` (D41). The ONLY file that knows which SQLite build is in use |
| `src/db/sqlite.worker.ts` | sqlite-wasm + `opfs-sahpool` (worker-only API), pool opened at `initialCapacity: 3` retrying at 1, `foreign_keys` ON, strictly ordered request queue, and the OPFS capability probe |
| `src/db/transaction.ts` | `withWriteTransaction()` / `runSerializedRead()`. The sahpool VFS is single-connection, so exclusivity is rebuilt in JS; the XP invariant rests on this |
| `src/db/storage.ts` | `ensurePersistentStorage()` / `getStorageUsage()` — asks for the durable bucket and reports the honest answer (D43) |
| `src/db/migrations/index.ts` | Runner: applies pending migrations in version order, each in its own transaction |
| `src/db/migrations/0001_init.ts` | Phase 1 schema. SHIPPED — never edit |
| `src/db/migrations/0002_skills.ts` | `skills` + `task_skills`, seeded with the §6 defaults. SHIPPED |
| `src/db/migrations/0003_streaks.ts` | `streaks` + `streak_resets`, with the partial unique indexes that make re-derivation idempotent (D30). SHIPPED |
| `src/db/migrations/0004_merge_exercise.ts` | Merges Exercise into Fitness — merged, not deleted, so the XP survives (D33). SHIPPED |
| `src/db/migrations/0005_skill_status_icons.ts` | `skills.status` + backfilled icon keys, so a renamed category keeps its glyph. SHIPPED |
| `src/db/migrations/0006_badges.ts` | `badge_unlocks` — the unlock only; everything else about a badge is derived (D38). SHIPPED |
| `src/db/queries/tasks.ts` | Task CRUD + archive/unarchive. `NewTask`/`TaskPatch` live here |
| `src/db/queries/completions.ts` | `logCompletion`/`undoCompletion` (atomic XP write paths), day-window reads, dev-only XP-sum invariant |
| `src/db/queries/character.ts` | `getCharacter()` (singleton row, id = 1) |
| `src/db/queries/skills.ts` | Category CRUD. `removeSkill` deletes only an empty category and archives any that holds XP (D33 logic, one level up) |
| `src/db/queries/skips.ts` | `addSkip`/`removeSkip`/`getSkipsForDay` (stats-only, no XP) |
| `src/db/queries/streaks.ts` | `reconcileStreaks` — `MAX(stored, derived)` for the record, `INSERT OR IGNORE` for resets |
| `src/db/queries/badges.ts` | `getBadgeUnlocks` / `recordUnlocks` (`INSERT OR IGNORE`, so a re-evaluation never moves the date) |
| `src/db/queries/settings.ts` | Key/value settings (the capture-chip MRU list) |
| **Stores — projections of the DB, never the other way round** ||
| `src/store/useTaskStore.ts` | tasks + completionsToday + skipsToday; all task mutations, plus `backfillCompletion` (D32) |
| `src/store/useCharacterStore.ts` | character projection; `setFromPersisted` only accepts DB-returned rows |
| `src/store/useSkillStore.ts` | categories, task tags, MRU order, add/edit/remove/restore |
| `src/store/useStreakStore.ts` | Derives every streak from the log on hydrate, reconciles, projects back. Also exposes `activeDays` and `totalCompletions` because the pass already holds them |
| `src/store/useBadgeStore.ts` | Evaluates the catalogue, records new unlocks, and holds the celebration queue |
| `src/store/resync.ts` | `resyncDerived(now, celebrate)` — re-derives streaks **then** badges after every write to the log. Order matters: badge rules read the streak record |
| **UI** ||
| `src/main.tsx` | React root, `BrowserRouter` basename, service-worker registration |
| `src/App.tsx` | Startup gate (open DB → migrate → hydrate → resync), layout, tab bar, route table. Non-initial routes are `React.lazy` |
| `src/routes/Today.tsx` | Today view: schedule filter, fast capture, complete/undo/skip/+1 |
| `src/routes/Calendar.tsx` | Month grid + selected-day list + backfill; accepts `?day=YYYY-MM-DD` |
| `src/routes/Profile.tsx` | Sigil, level, lifetime record strip, badge shelf, category manager, skill radar, storage status |
| `src/routes/Stats.tsx` | Dashboard with the Day/Week/Month/All filter governing every panel |
| `src/routes/Badges.tsx` | The gallery: grouped crests, progress rings, detail sheet |
| `src/routes/TaskDetail.tsx` | Edit form (all fields incl. repeat) + snooze + archive |
| `src/routes/Archived.tsx` | Archived tasks with restore |
| `src/components/` | `FastCapture`, `TaskCard`, `StatusHero`, `SkillChips`, `StorageStatus`, `icons` (UI glyphs), `categoryIcons` (the 30-glyph category library + local keyword search, D40), `charts/` |
| `src/components/system/` | The design-system primitives: `SystemPanel`, `SystemHeading`, `RuneDivider`, `SectionBar`, `Sigil`, `SegmentRing`, `WeekStrip`, `SkillRow`, `SkillRadar`, `CategorySlot`, `CategoryEditor`, `RangeFilter`, `BadgeCrest`, and the four full-screen moments (`BootSequence`, `LevelUpOverlay`, `StreakMoment`, `BadgeMoment`) plus `StartupFailure` |
| `src/components/ui/` | Magic UI primitives vendored from the registry. Kept close to upstream — customise the *callers*, not these (CONVENTIONS 14b) |
| `src/lib/gsap.ts` | Plugin registration + `useGsap` (a `gsap.context` that reverts on unmount — essential under StrictMode) |
| `src/lib/burst.ts` | DOM-level one-shot effects outside React: `ripple`, `flyXp`, `igniteRow` |
| `src/lib/utils.ts` | `cn()` — clsx + tailwind-merge |
| `src/index.css` | Tailwind entry; the §5 palette as `@theme` tokens (single source of truth for color), utilities (`notch`, `shelf`, `glyph-3d`, glows), display font |
| `src/constants/theme.ts` | Color *values* for SVG props and data-driven inline styles. Mirrors `index.css` — keep in sync |
| `src/types/index.ts` | Domain types (camelCase; DB rows are snake_case, mapped in queries) |
| **Build & host** ||
| `index.html` | Document shell: PWA metadata, pre-mount dark background paint |
| `vite.config.ts` | `base` (unconditional — GOTCHAS 22), ES worker format, sqlite-wasm optimizeDeps exclusion |
| `vitest.config.ts` | Test config; separate from `vite.config.ts` on purpose — GOTCHAS 26 |
| `public/sw.js` | Service worker: caches the shell for offline launch. No longer forges COOP/COEP — DECISIONS D23 |
| `public/manifest.webmanifest`, `public/icon-*.png` | PWA install metadata + home-screen icons |
| `scripts/finalize-web-export.mjs` | Post-build: writes `.nojekyll` and `404.html` (SPA fallback) |
| `.github/workflows/deploy-web.yml` | Push to `main` → typecheck + tests + build → publish `dist/` to Pages |

## Data flow — every mutation follows the same shape

**Rule: SQLite is the source of truth. Stores are a projection.** Every store action awaits a
query function, which persists first and returns the canonical persisted row(s); the store then
`set()`s only from that return value. If the DB write throws, the store never changes. No store
action constructs domain objects locally.

Example — completing a task:

```
TaskCard onPress
  → useTaskStore.completeTask(task, new Date())      # `new Date()` is created at the action boundary
    → xpForDifficulty(task.difficulty)               # engine computes XP (stores never do math themselves)
    → completionQueries.logCompletion(taskId, xp, null, now)
        withExclusiveTransactionAsync:               # atomic:
          INSERT completion row
          UPDATE character total_xp (+xp), level (engine levelForTotalXp)
        __DEV__: assert total_xp === SUM(xp_awarded) # throws if the ledger ever drifts
        returns { completion, character }            # persisted rows, re-read inside the txn
    → set({ completionsToday: [...prev, completion] })
    → useCharacterStore.setFromPersisted(character)
  → resyncDerived(now)                                # streaks first, then badges (order matters)
    → useStreakStore.hydrate(tasks, now)              # re-walks the log; finds breaks, repairs
    → useBadgeStore.evaluate(tasks, now, celebrate)   # re-evaluates 30 rules, records new unlocks
```

**Why the resync is a separate step and not part of the write.** Streaks and badges are *derived*,
never incremented (D29) — nothing counts up when a quest is completed, so every write to the log
has to be followed by a re-derivation or the screen is stale until the next cold start. Boot calls
it with `celebrate: false`, which records unlocks without queueing a takeover; inferring that
instead of passing it cost the user their first badge (PROGRESS P7).

Variants:
- **Undo** deletes a specific completion row and subtracts exactly its `xp_awarded` — same
  transaction shape, exact inverse.
- **Counted +1**: store sums today's `progressCount` for the task from `completionsToday`, engine
  `xpForCountedLog(prior, n, target, difficulty)` decides XP (full XP only on the entry that first
  reaches target), then the same `logCompletion` path with `progressCount` set.
- **Skip/unskip** writes/deletes a `skips` row (own table, never a completion; no XP involved).
- **Archive** is a status flip on `tasks` — history rows are never touched. There is no delete
  path anywhere, by design.

## Time handling

`completed_at` stores full ISO instants (UTC via `toISOString()`). All day-bucketing happens at
read time in LOCAL time through `src/engine/time.ts`: `dayWindow(date)` converts a local calendar
day to an ISO range for SQL `BETWEEN`-style queries; `dayKeyFor(date)` produces the local
`YYYY-MM-DD` key used by `skips.day` and schedule matching. Never derive a day key any other way.

## Current DB schema

Applied migrations `0001`–`0006`:

| Table | Migration | Notes |
|---|---|---|
| `schema_migrations` | 0001 | Runner bookkeeping |
| `tasks` | 0001 | `status` is `active`/`archived` — there is no delete path |
| `completions` | 0001 | Append-forever log. Every stat, streak and badge is derived from it |
| `skips` | 0001 | Own table, so `completions` keeps meaning "things done" |
| `character` | 0001 | Singleton (`id = 1`). `total_xp`/`level` are the one sanctioned cache |
| `settings` | 0001 | Key/value; currently the capture-chip MRU |
| `skills` | 0002, +`status` in 0005 | `icon` holds a key into the category icon library, not a path |
| `task_skills` | 0002 | Many-to-many |
| `streaks` | 0003 | Stores only what cannot be re-derived: `longest_streak`, `reset_count` (D30) |
| `streak_resets` | 0003 | `UNIQUE(streak_id, day)` — what makes re-deriving history idempotent |
| `badge_unlocks` | 0006 | `badge_key` + `unlocked_at`, nothing else. The catalogue is code (D38) |

Still unbuilt: `goals` (Phase 3). It arrives with its feature, as a new migration file.

## Platform

Web only, as of 2026-08-02 (DECISIONS D20). One installable PWA; Android/iOS are no longer targets
and no React Native code remains. See README for build/deploy.

**Where the data lives**: SQLite compiled to WebAssembly, in a dedicated worker
(`src/db/sqlite.worker.ts`), persisting to the browser's OPFS via the `opfs-sahpool` VFS. That VFS
is single-connection, so `src/db/transaction.ts` rebuilds write-exclusivity in JS with a promise
chain — that chain is what the `character.total_xp === SUM(xp_awarded)` invariant rests on.

**What the host must provide**: nothing but static files and HTTPS. `opfs-sahpool` needs no
cross-origin isolation, so no COOP/COEP headers are required and `public/sw.js` no longer forges
any. The app still cannot run over plain HTTP or in a private window, because OPFS requires a
secure context.

**Known unverified surface: iOS Safari.** A second user hit a hard startup failure there on
2026-08-03 (`UnknownError`, no cause named). There is **no WebKit in the build environment**, so
nothing iOS-specific has been verified on the platform it targets. Two safe mitigations shipped —
a smaller sync-access-handle pool and one retry — and the failure screen now runs an OPFS probe on
the device and reports which step fails (D41). Whether iOS is a supported platform is an open
owner decision; do not assume either answer.

**Three seams keep the platform swappable**, and all three were proven by this rewrite:
`src/engine/` (pure math, zero framework imports), `src/db/sqlite.ts` (a 4-method interface every
query is written against), and `src/store/` (talks only to query functions). Changing the UI
framework and the database driver at once touched none of them.
