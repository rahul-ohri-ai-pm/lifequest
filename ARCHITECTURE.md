# Architecture (as built)

Four strict layers. Dependencies point downward only — a lower layer never imports from a higher
one. The spec behind this is [CLAUDE.md](CLAUDE.md) §3–§4; this file describes the code as it
exists.

```
app/            UI routes (Expo Router)      — imports store, components, engine (read-only helpers)
src/store/      Zustand stores               — imports db/queries + engine
src/db/         SQLite client, migrations, queries — imports engine (level math only) + expo-sqlite
src/engine/     PURE TypeScript game math    — imports NOTHING but src/types. No React/Expo/DB/IO.
```

## File map

| Path | Responsibility |
|---|---|
| `src/engine/tuning.ts` | Difficulty→XP table, level-curve constants. The only place to tune numbers |
| `src/engine/xp.ts` | `xpForDifficulty`, `xpRequiredForLevel`, `levelForTotalXp`, `levelProgress` (XP bars) |
| `src/engine/time.ts` | `dayKeyFor` (LOCAL date key), `addDays` (DST-safe), `dateFromDayKey`, `dayWindow` (local day → ISO range), `isScheduledDay` |
| `src/engine/counted.ts` | `xpForCountedLog` — the one-award-per-day threshold rule |
| `src/engine/calendar.ts` | `monthGrid(year, month)` — calendar screen's grid data |
| `src/engine/__tests__/` | 48 tests. Every engine function is covered; keep it that way |
| `src/db/client.ts` | `getDb()` singleton (async API, foreign_keys ON); dev-only `resetDb()` |
| `src/db/migrations/index.ts` | Runner: applies pending migrations in version order, each in its own exclusive transaction |
| `src/db/migrations/0001_init.ts` | Phase 1 schema (tasks, completions, skips, character, settings + indexes). SHIPPED — never edit |
| `src/db/queries/tasks.ts` | Task CRUD + archive/unarchive. `NewTask`/`TaskPatch` input types live here |
| `src/db/queries/completions.ts` | `logCompletion`/`undoCompletion` (atomic XP write paths), day-window reads, `__DEV__` XP-sum invariant |
| `src/db/queries/character.ts` | `getCharacter()` (singleton row, id = 1) |
| `src/db/queries/skips.ts` | `addSkip`/`removeSkip`/`getSkipsForDay` (stats-only, no XP) |
| `src/store/useTaskStore.ts` | tasks + completionsToday + skipsToday; all task mutations |
| `src/store/useCharacterStore.ts` | character projection; `setFromPersisted` only accepts DB-returned rows |
| `app/_layout.tsx` | Startup gate: migrations → store hydration → render. Nothing renders before the DB is ready |
| `app/(tabs)/index.tsx` | Today view: filters habits by schedule, fast capture, complete/undo/skip/+1 |
| `app/(tabs)/calendar.tsx` | Month grid + selected-day task list |
| `app/(tabs)/profile.tsx` | Level, XP bar, link to archived list |
| `app/(tabs)/stats.tsx` | Placeholder (Phase 2 skill dashboard) |
| `app/task/[id].tsx` | Edit form (all fields incl. type-specific) + snooze + archive |
| `app/archived.tsx` | Archived tasks with restore |
| `src/components/` | `FastCapture`, `TaskCard`, `icons` (inline SVG tab icons), `ScreenPlaceholder` |
| `src/constants/theme.ts` | ALL colors/spacing/radii/glow tokens. Never hardcode a color in a screen |
| `src/types/index.ts` | Domain types for all three phases (camelCase; DB rows are snake_case, mapped in queries) |
| `metro.config.js` | Strips expo-router's 956KB default icon font — see GOTCHAS.md |

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

`schema_migrations`, `tasks`, `completions`, `skips`, `character` (singleton), `settings` — the
Phase 1 subset of the target schema in CLAUDE.md §4. Phase 2/3 tables (`skills`, `task_skills`,
`streaks`, `streak_resets`, `badge_unlocks`, `goals`) do NOT exist yet; they arrive with their
features as new migration files.
