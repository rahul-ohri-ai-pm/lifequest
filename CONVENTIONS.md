# Conventions — hard rules for changing this codebase

These are non-negotiable. Most protect a permanent, append-only completion log that backs all
XP/stats — a wrong write there can never be cleaned up (there is no delete). When in doubt, stop
and ask the owner instead of improvising.

## Layer boundaries (violations are the #1 way to mess this project up)

1. **`src/engine/` stays pure.** No React, React Native, Expo, or DB imports. No `Date.now()`,
   no `new Date()` with no args, no I/O — current time is always passed in as an argument. Every
   engine function gets unit tests in `src/engine/__tests__/` in the same change.
2. **Game math lives ONLY in the engine.** Never compute XP, levels, streak transitions, badge or
   goal conditions inline in a component, store, or query. If you need new math, add an engine
   function + tests first.
3. **Raw SQL lives ONLY in `src/db/`.** Components and stores call `src/db/queries/*` functions.
4. **Query functions persist first and return the persisted row(s).** Stores may only `set()`
   state from those return values — never from locally constructed objects. This is what enforces
   "SQLite is the source of truth".
5. **Multi-table writes are atomic.** Anything touching `completions` + `character` (later:
   `skills`, `streaks`) goes through one `withExclusiveTransactionAsync`. Never award or reverse
   XP outside a transaction. Keep the `__DEV__` invariant check
   (`character.total_xp === SUM(completions.xp_awarded)`) passing.

## Data rules

6. **No hard delete, anywhere.** Archive is the only removal path for tasks. Completion rows are
   only ever deleted by `undoCompletion` (the §4 undo action), which reverses exactly that row's
   `xp_awarded`.
7. **Never store derived stats.** Aggregations are computed on read from the log. The only
   sanctioned caches are `character.total_xp/level` (and later `skills.total_xp/level`), updated
   inside the same transaction as the completion write.
8. **Migrations are forward-only and immutable once shipped.** New schema change ⇒ new
   `NNNN_description.ts` file registered in `src/db/migrations/index.ts`. NEVER edit
   `0001_init.ts` or any shipped migration. No `down()` functions.
9. **XP rules are spec, not suggestion.** Difficulty XP, the level curve, split-evenly skill XP,
   counted-task threshold award, streak-break-on-miss: all defined in CLAUDE.md §7. Don't
   "improve" them.

## Dates & time (subtle, high-damage area)

10. Day keys are LOCAL: only via `dayKeyFor` / `dayWindow` / `dateFromDayKey` in
    `src/engine/time.ts`. **Never** `toISOString().slice(0, 10)` (UTC shift bug) and **never**
    `+ 86400000` day arithmetic (DST bug) — use `addDays`.
11. Timestamps stored in the DB are full ISO instants; day-bucketing happens at read time via
    `dayWindow`.

## Dependencies & UI

12. **Adding a dependency is a last resort.** The lightweight constraint (CLAUDE.md §3) is
    first-class: no Lottie, no icon fonts, no calendar/date-picker libs, no ORM, no UI kits.
    If truly needed, use `npx expo install <pkg>` (SDK-pinned version) and note it in
    PROGRESS.md's debt section.
13. **Colors/spacing/radii come from `src/constants/theme.ts` tokens only.** Dark theme only.
    Icons are inline SVG components in `src/components/icons.tsx`.
14. TypeScript strict; no `any` (use `unknown` + narrowing). Functional components + hooks only.

## Workflow — before every commit

15. Run, in order, and all must pass:
    ```bash
    npm test              # 48+ engine tests
    npm run typecheck     # tsc --noEmit
    npx expo export --platform android   # catches route/import/bundle errors
    ```
    Delete `dist/` after the export check (it's gitignored, but don't leave it around).
16. Commit per milestone/feature with a descriptive message; push to `origin main`
    (https://github.com/gamedev1991/lifequest). Update [PROGRESS.md](PROGRESS.md) when a
    milestone completes or new debt is created.
17. Never commit: `dist/`, `node_modules/`, `.expo/`, or edits to shipped migrations.
