# LifeQuest

## 1. Project Overview

LifeQuest is a gamified daily task tracker for a single user. Real-life tasks — habits, chores,
workouts, deep work, reading, one-off todos — are logged as completions and converted into
RPG-style progression: XP, character/skill levels, streaks, badges, and goals. **The app is
offline-first and single-user by design**: all data lives in an on-device SQLite database, there
is no account system, no backend, and no network calls of any kind. Every feature must work
correctly on a device that has never touched the internet.

## 2. Goals and Non-Goals

**Goals**
- Fast capture (< 5s from app open to a saved task)
- Correct, satisfying game math (XP, levels, streaks, badges, goals) with zero server dependency
- Data survives app restarts, updates, and device reboots via local SQLite
- A forgiving, non-punishing progression system (see streak rules — a missed day should never feel
  like the game is over)
- **Extremely lightweight**: small bundle size, fast cold start, smooth on low-end Android — this
  is a first-class constraint, not an afterthought (see §3 and §5)

**Non-goals (do not build these)**
- No auth / accounts / login of any kind
- No cloud sync, no backend, no network calls
- No social features (sharing, leaderboards, friends)
- No monetization (IAP, subscriptions, ads)
- No third-party analytics or crash reporting SDKs that phone home

**Future-proofing without building it now**: the DB schema supports a full JSON export/import of
all tables (see §10 Phase 3). This is what a *future* cloud-backup feature would build on top of —
but that feature is explicitly out of scope until the user asks for it.

## 3. Tech Stack

- **React + Vite**, TypeScript strict mode
- **Target: web only** (amended 2026-08-02). The app is an installable PWA and that is the only
  platform. It began as React Native + Expo targeting Android/iOS *and* web; Expo was removed
  entirely so the UI could be built directly on the DOM with Tailwind and Magic UI components,
  which are React-web-only. Android/iOS are no longer targets — see DECISIONS.md D14. This does
  not soften §2: after first load there are still zero network calls, zero accounts, and no server
  holding any data
- **`@sqlite.org/sqlite-wasm`** for persistence — SQLite compiled to WebAssembly, storing to the
  browser's on-device OPFS, with a small hand-rolled numbered-migration system (no ORM — the
  schema is 6-8 tables, not worth the codegen overhead). It runs in a dedicated worker
  (`src/db/sqlite.worker.ts`) because its `opfs-sahpool` VFS needs `createSyncAccessHandle()`,
  which browsers expose only off the main thread. Everything above `src/db/client.ts` is written
  against the `SqlDatabase` interface in `src/db/sqlite.ts` and knows nothing about the driver
- **Zustand** for app state, with SQLite as the source of truth (stores are a cache/projection of
  the DB, never the other way around — every mutation writes to SQLite first, then updates the
  store)
- **React Router** for navigation
- **Tailwind CSS v4** for styling, with the §5 palette declared once as `@theme` tokens in
  `src/index.css`. No `tailwind.config.js` — v4 configures from CSS
- **Magic UI** components, vendored into `src/components/ui/` (the same thing `npx shadcn add`
  does). They are kept close to upstream so a re-pull is a diff, not a merge — project-specific
  changes belong in the components that *use* them. `motion` (framer-motion) is their animation
  dependency and the app's
- **Vitest** for tests. The engine is pure TypeScript, so the suite needs no DOM and no plugins
  (see `vitest.config.ts` for why it is a separate file from `vite.config.ts`)

**Hard rule**: all game-logic math (XP curves, streak transitions, badge conditions, goal
progress) lives in `src/engine/` as pure TypeScript functions — no React imports, no DB calls, no
side effects. Components and stores call into `src/engine/`, never the reverse. This is what makes
the math unit-testable without mounting a single screen.

### Performance / bundle-size discipline

The app must stay extremely lightweight — small download, fast cold start, smooth on a low-end
phone. This is a standing constraint on every dependency and every screen, not a one-time audit:

- No heavy animation libraries (no Lottie, no `three.js`/skia-heavy effects). All "gamified" motion
  — level-up flashes, progress bar fills, badge unlocks — is built with `motion` driving simple
  transforms/opacity/glow, not asset playback. **Two** animation dependencies, and no more:
  `motion` (~33 KB gz, arrived with Magic UI and is what every vendored primitive in
  `src/components/ui/` is built on) and `gsap` (~41 KB gz with the Flip, SplitText and DrawSVG
  plugins, added 2026-08-02 on the owner's call — see DECISIONS D28). GSAP earns its place on
  three effects that are impractical otherwise: Flip for shared-element morphs, SplitText for
  per-character reveals, DrawSVG for borders that draw themselves on. Nothing else may join
  them, and neither is a licence to animate more — see the standing rule below.
- No custom illustrated art assets (see §5 — vector/glow-panel art direction only). Icons are
  inline SVG components, not an icon-font package or a sprite sheet.
- Before adding any new dependency, check its bundle size. Prefer zero-dependency or
  already-included solutions over pulling in a new package for a small feature.
- **Nothing animates at rest.** Every effect must be a transient timeline that ends. An
  infinite animation behind the app is a permanent tax on every interaction: `DotPattern glow`
  put ~860 of them on screen at once and took tap-to-paint from 30ms to 152ms (GOTCHAS 32).
  Check `document.getAnimations().length` on Today before shipping any ambient effect — at
  rest it should be 0, or 1 for the sigil ring.
- Routes that aren't the initial one (Calendar, Stats, Profile, Badges, Archived, task detail) are
  `React.lazy`-loaded in `src/App.tsx` so each becomes its own chunk — don't collapse them into
  one eagerly-loaded bundle.
- Fonts: at most one display font (for headers/numbers) plus the system font for body text — load
  only the specific weights actually used, never a whole family, and import the **subset-specific**
  `@fontsource` entrypoint (`latin-400.css`, not `400.css`, which also drags in devanagari — see
  GOTCHAS).
- The SQLite wasm binary (~406 KB gzipped) is the single biggest asset and is irreducible; it is
  also the entire persistence layer. Keep it out of the critical path — it loads in the worker, so
  it must never be pulled into the main bundle.

## 4. Architecture

### Directory layout

```
index.html                    # document shell (PWA metadata, pre-mount background paint)
vite.config.ts                # base path, worker format, sqlite-wasm dep handling
vitest.config.ts              # test config — separate on purpose, see the file
src/
  main.tsx                   # React root, router, service-worker registration
  App.tsx                    # boot gate (open DB → migrate → hydrate → resync), layout, tab bar, routes
  index.css                  # Tailwind entry + §5 palette as @theme tokens + utilities + display font

  routes/                    # one file per screen (screens only — no game logic)
    Today.tsx                # Today view — week strip, status hero, quest log, fast capture
    Calendar.tsx             # month/agenda view + backfill; accepts ?day=YYYY-MM-DD
    Stats.tsx                # skill dashboard with Day/Week/Month/All filters
    Profile.tsx              # character, lifetime record, badge shelf, category manager, radar
    Badges.tsx               # the badge gallery (Phase 2)
    Archived.tsx             # archived quests, restore
    TaskDetail.tsx           # task detail / edit

  engine/                    # PURE TypeScript. No React or DOM imports. Fully unit-tested.
    tuning.ts                # difficulty->XP table, level-curve constants
    xp.ts                    # xpForDifficulty, xpRequiredForLevel, levelForTotalXp, splitSkillXp
    time.ts                  # local day keys, DST-safe day arithmetic, schedule matching
    counted.ts               # the one-award-per-day threshold rule
    calendar.ts              # monthGrid
    stats.ts                 # pure aggregations over completion rows (incl. weekStrip)
    streaks.ts               # streak transitions, derived from the log
    badges.ts                # declarative badge catalogue + evaluator
    goals.ts                 # goal progress calculators (Phase 3 — not built)
    __tests__/

  db/
    sqlite.ts                # the SqlDatabase interface everything above db/ is written against
    client.ts                # owns the worker protocol, the single-tab lock, and probeStorage()
    sqlite.worker.ts         # sqlite-wasm + opfs-sahpool, serialized queue, OPFS capability probe
    transaction.ts           # write-exclusivity rebuilt in JS (the sahpool VFS is single-connection)
    storage.ts               # durable-storage request + usage reporting
    migrations/
      0001_init.ts           # tasks, completions, skips, character, settings
      0002_skills.ts         # skills, task_skills + the §6 defaults
      0003_streaks.ts        # streaks, streak_resets
      0004_merge_exercise.ts # Exercise merged into Fitness (merged, not deleted)
      0005_skill_status_icons.ts  # skills.status + icon keys
      0006_badges.ts         # badge_unlocks
      index.ts               # migration runner (reads schema_migrations, applies pending, in order)
    queries/                 # thin, typed query functions — one file per table
      tasks.ts  completions.ts  character.ts  skills.ts
      skips.ts  streaks.ts  badges.ts  settings.ts

  store/                     # Zustand stores. Read/write through db/queries, never raw SQL.
    useTaskStore.ts  useCharacterStore.ts  useSkillStore.ts
    useStreakStore.ts  useBadgeStore.ts
    resync.ts                # re-derives streaks then badges after every write to the log

  components/                # Presentational + light-stateful components
    system/                  # the design-system primitives and the full-screen moments
    charts/                  # dashboard chart components
    ui/                      # vendored Magic UI primitives — kept close to upstream
    icons.tsx                # UI glyphs (nav, verbs, streak, bolt)
    categoryIcons.tsx        # the category glyph library + local keyword search
  lib/
    gsap.ts                  # plugin registration + useGsap (context that reverts on unmount)
    burst.ts                 # one-shot DOM effects outside React (ripple, flyXp, igniteRow)
    utils.ts                 # cn() — the shadcn/Magic UI class-merge helper
  types/
    index.ts                 # Task, Completion, Difficulty, Character, SkillDef, etc.
  constants/
    theme.ts                 # color *values* for SVG/inline use; classes live in index.css

public/                       # copied verbatim into dist/
  sw.js                       # offline shell cache (§2)
  manifest.webmanifest        # PWA install metadata
  icon-*.png
scripts/
  finalize-web-export.mjs     # .nojekyll + 404.html for GitHub Pages
tsconfig.json
package.json
CLAUDE.md
```

### Task actions & views

Full CRUD plus the usual task-tracker verbs — every task, regardless of type, supports:

- **Create** — fast-capture form (title + difficulty required, everything else optional), under 5s
- **Edit** — change any field, including type-specific fields (schedule, target count)
- **Complete** — logs a `completions` row, awards XP (§7)
- **Undo complete** — remove the most recent completion for today if logged by mistake (deletes the
  `completions` row and reverses the XP it awarded)
- **Skip** — for a habit's scheduled day: explicitly mark as intentionally not doing it today.
  Logged distinctly from a silent miss so stats can tell "chose to skip" apart from "forgot," but
  still breaks the streak the same way a miss does (§7)
- **Snooze** — reschedule `due_at`/`reminder_at` forward without touching completion history
- **Archive** — soft-remove: hidden from active lists (Today, Calendar), excluded from streak/badge
  evaluation going forward, but its completion history is kept forever for stats
- **Unarchive** — restore an archived task back to active
- **No hard delete.** There is no permanent-delete action anywhere in the app — archive is the only
  removal path, so completion history behind XP/streaks/badges/stats can never be silently
  corrupted. (If this turns out to be too restrictive in practice, revisit — but it's the default.)

Two views onto tasks, both reading the same `tasks`/`completions` tables:
- **Today / list view** (`app/(tabs)/index.tsx`) — active tasks relevant to today, fast capture
- **Calendar view** (`app/(tabs)/calendar.tsx`, Phase 1) — month/agenda grid showing scheduled
  habits and due dates per day, past and future; tapping a day shows that day's tasks. This is
  distinct from the Phase 3 GitHub-style *heatmap* (§10), which visualizes completion density over
  time rather than letting you browse/manage by date.

### Migration convention

- Files live in `src/db/migrations/`, named `NNNN_description.ts` (4-digit, zero-padded,
  monotonically increasing — e.g. `0001_init.ts`, `0002_skills_and_streaks.ts`).
- Each file exports a single `up(db: SqlDatabase): Promise<void>`. No `down()` — migrations are
  **forward-only**. For a single-user local app, the
  recovery path for a bad migration is the JSON export/import (Phase 3), not schema rollback.
- A `schema_migrations(version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)` table tracks what
  has been applied. On app start, the runner in `db/migrations/index.ts` applies every migration
  whose version is greater than `MAX(version)`, in order, each inside its own transaction.
- Every schema change — including column additions — gets its own migration file. Never edit a
  migration that has already shipped.

### Core DB schema (target end-state; tables are introduced by phase — see §10)

```sql
-- Phase 1
CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id           TEXT PRIMARY KEY,             -- uuid
  title        TEXT NOT NULL,
  notes        TEXT,
  type         TEXT NOT NULL CHECK (type IN ('todo','habit','counted')),
  difficulty   TEXT NOT NULL CHECK (difficulty IN ('trivial','easy','medium','hard','epic')),
  schedule_json TEXT,                        -- habit only: {"freq":"daily"} | {"freq":"custom","days":[1,3,5]}
  target_count  INTEGER,                     -- counted only: e.g. 8 (glasses of water)
  due_at        TEXT,                        -- ISO datetime, optional
  reminder_at   TEXT,                        -- ISO datetime, optional
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE completions (
  id             TEXT PRIMARY KEY,
  task_id        TEXT NOT NULL REFERENCES tasks(id),
  completed_at   TEXT NOT NULL,               -- ISO datetime — source of truth for all stats
  progress_count INTEGER,                     -- counted tasks only: amount logged this entry
  xp_awarded     INTEGER NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE skips (                           -- explicit "chose not to do it today" log (§4 Skip)
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id),
  day        TEXT NOT NULL,                     -- local dayKey YYYY-MM-DD
  created_at TEXT NOT NULL,
  UNIQUE (task_id, day)
);
-- Skips live in their own table (not zero-XP completion rows) so completions keeps meaning
-- "things done" and stats aggregations never need filter clauses. Skips are stats-only:
-- the Phase 2 streak engine reads completions alone, since a skip breaks a streak exactly
-- like a miss (§7). Skip is only offered for habits on their scheduled days.

CREATE TABLE character (
  id         INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
  total_xp   INTEGER NOT NULL DEFAULT 0,
  level      INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Phase 2
CREATE TABLE skills (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  icon       TEXT,                          -- a key into the icon library, not a path (see §6)
  color      TEXT,
  total_xp   INTEGER NOT NULL DEFAULT 0,
  level      INTEGER NOT NULL DEFAULT 1,
  status     TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'archived' (added by 0005)
  created_at TEXT NOT NULL
);
-- Removing a category archives it whenever it holds XP or tagged tasks, and hard-deletes it only
-- when it holds neither. Same reason as §4's no-hard-delete rule for tasks: tidying a list must
-- never destroy XP the user earned. Archived categories leave every picker but stay readable, so
-- a quest tagged with a retired category still renders.

CREATE TABLE task_skills (                    -- many-to-many
  task_id  TEXT NOT NULL REFERENCES tasks(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  PRIMARY KEY (task_id, skill_id)
);

CREATE TABLE streaks (
  id               TEXT PRIMARY KEY,
  task_id          TEXT,                      -- NULL = the global "active day" streak
  current_streak   INTEGER NOT NULL DEFAULT 0,
  longest_streak   INTEGER NOT NULL DEFAULT 0,
  reset_count      INTEGER NOT NULL DEFAULT 0, -- lifetime count of times this streak has broken
  last_active_date TEXT,
  updated_at       TEXT NOT NULL
);

CREATE TABLE streak_resets (                  -- one row per break, for stats/history
  id                  TEXT PRIMARY KEY,
  streak_id           TEXT NOT NULL REFERENCES streaks(id),
  broken_streak_length INTEGER NOT NULL,      -- how long the streak was before it broke
  reset_at            TEXT NOT NULL
);

CREATE TABLE badge_unlocks (                  -- badge catalog itself lives in src/engine/badges.ts
  badge_key   TEXT PRIMARY KEY,               -- matches the `key` in the badges.ts rule array
  unlocked_at TEXT NOT NULL
);
-- Only the unlock is stored. Progress, tier and whether a badge still qualifies are all derived
-- on read; what cannot be derived is that it was *earned*, because unlocking is a one-way door —
-- undoing today's completion must never revoke a badge won in March.

-- Phase 3
CREATE TABLE goals (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('skill_level','aggregate_count','streak_length','completion_count')),
  target_json  TEXT NOT NULL,                 -- e.g. {"skillId":"...","level":10}
  progress     REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  bonus_xp     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  completed_at TEXT
);
```

**Rule: never store derived stats.** The stats screen, heatmap, badge conditions, and goal
progress are all computed on read from `completions` / `streaks` / `streak_resets`. If a number
can be derived from the log, it is derived, not cached in a column (the `total_xp`/`level` columns
on `character`/`skills` are the one deliberate exception — they're cheap running totals updated
transactionally alongside each completion insert, not independently-maintained derived state).

## 5. Design & Visual Style

**Direction**: anime "system window" aesthetic, inspired by *Solo Leveling*'s in-game status/quest
UI — dark background, glowing blue/purple panels and borders, sharp sci-fi typography. **Vector/
glow-panel only** (no custom illustrated art, no character art, no icon-font packages) — this is
the art-direction choice that keeps the anime look compatible with the "extremely lightweight"
goal (§2, §3): everything is code-drawn (gradients, borders, shadows/glow, inline SVG icons), so
there's no growing image/asset budget as the app grows.

- **Theme**: dark-only. No light mode. One theme to design, build, and maintain is itself a
  lightweight-friendly choice, and a dark UI is core to the reference aesthetic.
- **Palette** (starting point, refine visually once screens exist):
  - Background: near-black navy (`#0A0E17` / `#0D1220`)
  - Panel surface: dark slate blue (`#131A2B`), with a `1px` glow border in the accent color
  - Primary accent (XP bars, active states, links): electric blue (`#4C8DFF`)
  - Secondary accent (level-up moments, epic-tier highlights): violet (`#8B5CF6`)
  - Rarity/difficulty accent ramp (Trivial→Epic), echoing RPG item-rarity coloring:
    Trivial = gray (`#6B7280`), Easy = green (`#34D399`), Medium = blue (`#4C8DFF`),
    Hard = violet (`#8B5CF6`), Epic = gold (`#F5B942`)
  - Text: off-white (`#E6E9F2`) primary, muted slate (`#8A93A8`) secondary
- **Typography**: one display font for headers, numbers, and level-up moments (a geometric sci-fi
  face — e.g. Orbitron or Rajdhani; load only Regular + Bold, nothing else), system font
  (San Francisco / Roboto) for body text and everything read at length. Never bundle a full font
  family for one weight used once.
- **Motion**: glow pulses, XP-bar fills, and number count-ups via `motion` and CSS transitions —
  no Lottie, no bundled video/gif. Keep effects short (~200-400ms) and skippable. The Magic UI
  primitives in `src/components/ui/` are the vocabulary: `BorderBeam` for the one element that is
  *the* moment, `NumberTicker` for XP count-ups, `BlurFade` for list entry, `ShineBorder` for
  panel edges, `DotPattern` for the ambient background. If everything glows equally, nothing
  reads as emphasised — that is a design rule, not a performance one.
- **Iconography**: a small set of inline SVG icons (skills, difficulty tiers, badge locked/unlocked
  state), styled with the same glow/stroke treatment as panels — not a third-party icon-font
  library pulling in glyphs you'll never use.

## 6. Default Skills

Shipped at first launch (user can rename/add/remove any of these at any time): **Diet, Career,
Reading, Exercise, Gaming, Fitness, Social, Stock Trading**.

## 7. XP, Leveling, and Streak Rules

### Difficulty → XP (tunable constants, `src/engine/tuning.ts`)

| Difficulty | XP  |
|------------|-----|
| Trivial    | 5   |
| Easy       | 10  |
| Medium     | 25  |
| Hard       | 50  |
| Epic       | 100 |

### Level curve (character and every skill use the same formula, independent XP pools)

Polynomial growth, chosen for a smooth ramp without the "wall" feel of classic exponential RPG
curves — a daily-habit app shouldn't make level 40 take a year.

```ts
// Cumulative total XP required to REACH `level` (from level 1)
function xpRequiredForLevel(level: number): number {
  return Math.round((100 * Math.pow(level, 1.5)) / 10) * 10;
}

function levelForTotalXp(totalXp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= totalXp) level++;
  return level;
}
```

First 10 levels (cumulative XP / XP needed for that step):

| Level | Cumulative XP | XP for this level |
|-------|---------------|--------------------|
| 1     | 100           | —                  |
| 2     | 280           | 180                |
| 3     | 520           | 240                |
| 4     | 800           | 280                |
| 5     | 1120          | 320                |
| 6     | 1470          | 350                |
| 7     | 1850          | 380                |
| 8     | 2260          | 410                |
| 9     | 2700          | 440                |
| 10    | 3160          | 460                |

Leveling up (character or skill) triggers a celebration animation (Phase 3 polish).

### XP distribution rules

- Completing a task awards `DIFFICULTY_XP[task.difficulty]` XP.
- **Character total_xp always receives the full task XP**, regardless of how many skills the task
  is tagged with.
- **Skill XP is split evenly across all tagged skills**: each tagged skill receives
  `Math.round(taskXp / tagCount)` XP. A 25 XP task tagged with 2 skills gives ~13/12 XP to each.
  An untagged task (Phase 1, before skills exist) only affects character XP.
- Default skill set is listed in §6.

### Counted-task rules

- Counted tasks are **daily-reset**: while active, the task appears every day and progress starts
  at 0 each day (e.g. today's glasses of water don't carry over).
- Each `+n` logged writes a `completions` row with `progress_count = n` and `xp_awarded = 0`. The
  row whose cumulative sum for the day first reaches `target_count` carries the **full difficulty
  XP** — one integral award, one celebration beat. Logging past the target awards nothing further.
- **Target edits never retro-adjust**: whether a row awards XP is decided at log time against the
  target at that moment. Undo stays trivial — deleting a row reverses exactly its `xp_awarded`.

### Streak rules

- Two kinds of streak: **per-habit** (consecutive completions on that habit's scheduled days) and
  one **global "active day" streak** (any day with ≥1 completion of anything counts as active).
- **No streak freezes / grace mechanic.** Missing a scheduled day breaks the streak outright:
  `current_streak` resets to 0 and `reset_count` increments by 1. A row is written to
  `streak_resets` recording how long the streak was before it broke, so stats/history can show
  reset events over time (this is the deliberately-chosen alternative to freezes — the user wants
  breaks to be visible and counted, not silently forgiven).
- `longest_streak` is a running max and is never decremented.

## 8. Coding Conventions

- TypeScript strict mode, no `any` (use `unknown` + narrowing if a type is genuinely unknown).
- Functional components only, hooks for state/effects.
- `src/engine/` — zero React/DOM/browser imports, 100% pure functions, 100% covered by unit tests
  under `src/engine/__tests__/`. If a function needs `Date.now()` or similar, pass it in as an
  argument rather than calling it internally — keeps the function deterministic and testable.
- No game-logic math (XP, levels, streak transitions, badge/goal conditions) inside components or
  stores — components call `src/engine/` functions and render the result.
- Migrations: `NNNN_description.ts`, forward-only, one logical schema change per file (see §4).
- DB access goes through `src/db/queries/*` — no raw SQL in components or stores.

## 9. Commands

```bash
npm run dev                 # Vite dev server (also aliased as `npm run web`)
npm run build:web           # production build into dist/ (deployed to GitHub Pages)
npm run serve:web           # serve the built dist/ locally
npm test                    # vitest — engine unit tests
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
```

The dev server and the preview server both serve from **`/lifequest/`**, not `/` — `base` in
`vite.config.ts` is deliberately unconditional so the router basename, service-worker scope, and
asset URLs behave identically in dev, preview, and production.

**Resetting the dev database**: `resetDb()` in `src/db/client.ts` drops all tables so migrations
re-run from scratch. The data itself lives in OPFS under the `lifequest-pool` directory; clearing
site data in DevTools (Application → Storage) is the other supported reset.

## 10. Phased Roadmap

### Phase 1 — MVP
Tasks (todo / habit / counted) + completions + XP + overall character level + basic stats +
calendar view. No skills, no streaks, no badges, no goals yet.

**Definition of done**: I can create all three task types and use every action in §4 Task Actions
(create, edit, complete, undo complete, skip, snooze, archive, unarchive — no hard delete); the
calendar view shows scheduled/due tasks per day and lets me browse past and future; character XP
and level update immediately on completion; and all of it survives a full app restart (kill and
relaunch, not just backgrounding). The dark/glow-panel visual style (§5) is applied throughout, not
just on one screen.

### Phase 2 — Skills, Streaks, Badges, Skill Dashboard — ✅ **complete (2026-08-03)**
Skill tagging on tasks, skill XP/leveling (split-evenly rule, §7), per-habit and global streaks
with reset tracking (no freezes, §7), badge engine (`src/engine/badges.ts`) with ~25 badges
including hidden ones, badge gallery screen, and a **skill dashboard** (`app/(tabs)/stats.tsx`)
showing per-skill level/XP/completions with date filters (day/week/month/all-time).

**Definition of done**: tagging a task with skills correctly splits XP across them and levels the
right skills; missing a scheduled habit day visibly breaks its streak and increments its reset
count; at least the launch badge set unlocks correctly and shows in the gallery with locked/hidden
states working; the skill dashboard shows correct per-skill stats and the date filter changes what
range they're computed over.

### Phase 3 — Goals, Full Stats, Polish — *next*

**Recommended order**: JSON export/import first. OPFS is still the only copy of the data, and a
durable-storage grant the browser can refuse or revoke is not a backup — it is the one Phase 3 item
that protects everything already built.

Goals (skill-level targets, aggregate counts, streak-length, completion-count) with progress bars
and bonus XP + badge on completion; full stats screen (completions over time, XP per skill, streak
history, best day/week, completion rate by weekday, GitHub-style heatmap); local notifications for
reminders; level-up celebration animations; JSON export/import of the full DB.

**Definition of done**: I can set and complete a goal of each type and see the bonus XP/badge land;
the stats screen and heatmap reflect real completion history with no derived-data drift; a JSON
export followed by import on a fresh install reproduces identical state.
