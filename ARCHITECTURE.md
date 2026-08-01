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

## File map

| Path | Responsibility |
|---|---|
| `src/engine/tuning.ts` | Difficulty→XP table, level-curve constants. The only place to tune numbers |
| `src/engine/xp.ts` | `xpForDifficulty`, `xpRequiredForLevel`, `levelForTotalXp`, `levelProgress` (XP bars) |
| `src/engine/time.ts` | `dayKeyFor` (LOCAL date key), `addDays` (DST-safe), `dateFromDayKey`, `dayWindow` (local day → ISO range), `isScheduledDay` |
| `src/engine/counted.ts` | `xpForCountedLog` — the one-award-per-day threshold rule |
| `src/engine/calendar.ts` | `monthGrid(year, month)` — calendar screen's grid data |
| `src/engine/__tests__/` | 63 tests. Every engine function is covered; keep it that way |
| `src/db/sqlite.ts` | The `SqlDatabase` interface (4 methods) everything above `db/` is written against. Survived a full driver swap unchanged |
| `src/db/client.ts` | `getDb()` singleton; owns the worker request/response protocol and the user-facing "could not open the database" error. The ONLY file that knows which SQLite build is in use |
| `src/db/sqlite.worker.ts` | sqlite-wasm + `opfs-sahpool` VFS (worker-only API), `foreign_keys` ON, strictly ordered request queue |
| `src/db/transaction.ts` | `withWriteTransaction()` / `runSerializedRead()` — serialized promise chain. The sahpool VFS is single-connection, so exclusivity is rebuilt in JS; this is what the XP invariant rests on |
| `src/db/migrations/index.ts` | Runner: applies pending migrations in version order, each in its own exclusive transaction |
| `src/db/migrations/0001_init.ts` | Phase 1 schema (tasks, completions, skips, character, settings + indexes). SHIPPED — never edit |
| `src/db/queries/tasks.ts` | Task CRUD + archive/unarchive. `NewTask`/`TaskPatch` input types live here |
| `src/db/queries/completions.ts` | `logCompletion`/`undoCompletion` (atomic XP write paths), day-window reads, dev-only XP-sum invariant (`import.meta.env.DEV`) |
| `src/db/queries/character.ts` | `getCharacter()` (singleton row, id = 1) |
| `src/db/queries/skips.ts` | `addSkip`/`removeSkip`/`getSkipsForDay` (stats-only, no XP) |
| `src/store/useTaskStore.ts` | tasks + completionsToday + skipsToday; all task mutations |
| `src/store/useCharacterStore.ts` | character projection; `setFromPersisted` only accepts DB-returned rows |
| `src/main.tsx` | React root, `BrowserRouter` basename, service-worker registration |
| `src/App.tsx` | Startup gate (open DB → migrate → hydrate stores → render), layout, tab bar, route table. Nothing renders before the DB is ready. Non-initial routes are `React.lazy` |
| `src/routes/Today.tsx` | Today view: filters habits by schedule, fast capture, complete/undo/skip/+1 |
| `src/routes/Calendar.tsx` | Month grid + selected-day task list |
| `src/routes/Profile.tsx` | Level, XP bar, link to archived list |
| `src/routes/Stats.tsx` | Stats dashboard: hero tiles, 14-day chart, follow-through, per-category and top-quest bars |
| `src/routes/TaskDetail.tsx` | Edit form (all fields incl. type-specific) + snooze + archive |
| `src/routes/Archived.tsx` | Archived tasks with restore |
| `src/components/` | `FastCapture`, `TaskCard`, `TodayHeader`, `SkillChips`, `StatPanel`, `icons` (inline SVG) |
| `src/components/ui/` | Magic UI primitives vendored from the registry (`BorderBeam`, `NumberTicker`, `BlurFade`, `ShineBorder`, `DotPattern`, `AnimatedCircularProgressBar`). Kept close to upstream — customise the *callers*, not these |
| `src/lib/utils.ts` | `cn()` — clsx + tailwind-merge, the shadcn/Magic UI class-merge helper |
| `src/index.css` | Tailwind entry; the §5 palette as `@theme` tokens (single source of truth for color) + the display font |
| `src/constants/theme.ts` | Color *values* for the cases a class can't cover: SVG props, gauge colors, data-driven inline styles. Mirrors `index.css` — keep in sync |
| `src/types/index.ts` | Domain types for all three phases (camelCase; DB rows are snake_case, mapped in queries) |
| `index.html` | Document shell: PWA metadata, pre-mount dark background paint (no white flash) |
| `vite.config.ts` | `base` (unconditional — GOTCHAS 22), ES worker format, sqlite-wasm optimizeDeps exclusion |
| `vitest.config.ts` | Test config; separate from `vite.config.ts` on purpose — GOTCHAS 26 |
| `public/sw.js` | Service worker: caches the shell for offline launch. No longer forges COOP/COEP — see DECISIONS D23 |
| `public/manifest.webmanifest`, `public/icon-*.png` | PWA install metadata + home-screen icons |
| `scripts/finalize-web-export.mjs` | Post-build: writes `.nojekyll` and `404.html` (SPA fallback for deep links) |
| `.github/workflows/deploy-web.yml` | Push to `main` → typecheck + tests + build → publish `dist/` to GitHub Pages |

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
```

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

`schema_migrations`, `tasks`, `completions`, `skips`, `character` (singleton), `settings` (migration
`0001_init`), plus `skills` and `task_skills` (migration `0002_skills`, shipped with categories in
N4). The remaining Phase 2/3 tables (`streaks`, `streak_resets`, `badge_unlocks`, `goals`) do NOT
exist yet; they arrive with their features as new migration files.

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

**Three seams keep the platform swappable**, and all three were proven by this rewrite:
`src/engine/` (pure math, zero framework imports), `src/db/sqlite.ts` (a 4-method interface every
query is written against), and `src/store/` (talks only to query functions). Changing the UI
framework and the database driver at once touched none of them.
