# Conventions — hard rules for changing this codebase

These are non-negotiable. Most protect a permanent, append-only completion log that backs all
XP/stats — a wrong write there can never be cleaned up (there is no delete). When in doubt, stop
and ask the owner instead of improvising.

## Layer boundaries (violations are the #1 way to mess this project up)

1. **`src/engine/` stays pure.** No React, DOM, browser, or DB imports. No `Date.now()`,
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
   `skills`, `streaks`) goes through one `withWriteTransaction()` from `src/db/transaction.ts` —
   never `db.withExclusiveTransactionAsync` directly (it throws on web) and never
   `db.withTransactionAsync` (atomic but interleavable, which breaks the invariant below). Never
   award or reverse XP outside a transaction. Keep the `__DEV__` invariant check
   (`character.total_xp === SUM(completions.xp_awarded)`) passing.
6. **A zustand selector must return a stable reference.** Never call a store method that builds an
   object or array inside a selector — subscribe to raw state and `useMemo` the derivation. Zustand
   v5 does no equality check, so a fresh reference per render is an infinite re-render loop.

## Data rules

7. **No hard delete of anything that carries history.** Archive is the only removal path for
   tasks. Completion rows are only ever deleted by `undoCompletion` (the §4 undo action), which
   reverses exactly that row's `xp_awarded`. **One bounded exception**: `removeSkill` hard-deletes
   a category that holds *no* XP and *no* tagged tasks, because there is nothing there to lose and
   typos should not be permanent — it archives in every other case. If you add a delete path,
   the test is not "is this convenient" but "can this destroy a row the user earned".
8. **Never store derived stats.** Aggregations are computed on read from the log. Three
   sanctioned exceptions, and no more: `character.total_xp/level` and `skills.total_xp/level`
   (running totals written inside the same transaction as the completion); `streaks.longest_streak`
   and `reset_count` (records that re-derivation would erase, since undoing today would wipe a
   record set in March); and `badge_unlocks` (the unlock itself, for the same reason). Each is
   there because the value **cannot be re-derived**, not because deriving it was slow.
8b. **Derived state must be re-derived after every write to the log.** Streaks and badges count
   nothing up on completion — they are recomputed from `completions`. Call `resyncDerived()` from
   `src/store/resync.ts`; it runs streaks *then* badges, because badge rules read the streak
   record. Boot passes `celebrate: false`.
9. **Migrations are forward-only and immutable once shipped.** New schema change ⇒ new
   `NNNN_description.ts` file registered in `src/db/migrations/index.ts`. NEVER edit
   `0001_init.ts` or any shipped migration. No `down()` functions.
10. **XP rules are spec, not suggestion.** Difficulty XP, the level curve, split-evenly skill XP,
   counted-task threshold award, streak-break-on-miss: all defined in CLAUDE.md §7. Don't
   "improve" them.

## Dates & time (subtle, high-damage area)

11. Day keys are LOCAL: only via `dayKeyFor` / `dayWindow` / `dateFromDayKey` in
    `src/engine/time.ts`. **Never** `toISOString().slice(0, 10)` (UTC shift bug) and **never**
    `+ 86400000` day arithmetic (DST bug) — use `addDays`.
12. Timestamps stored in the DB are full ISO instants; day-bucketing happens at read time via
    `dayWindow`.

## Dependencies & UI

13. **Adding a dependency is a last resort.** The lightweight constraint (CLAUDE.md §3) is
    first-class: no Lottie, no icon fonts, no calendar/date-picker libs, no ORM, no component
    kits beyond the vendored Magic UI primitives. There are exactly **two** animation
    dependencies — `motion` (what the vendored Magic UI primitives are built on) and `gsap`
    (DECISIONS D28) — and nothing else may join them. If a package is truly needed, check its
    gzipped size first and note it in PROGRESS.md's debt section.
13b. **Every animation must end.** Nothing may animate at rest: no infinite CSS keyframes and
    no `repeat: -1` timelines behind the app. This is not a style preference — it is the rule
    that was violated to the tune of 862 simultaneous animations and a 5× slower tap
    (GOTCHAS 32-33). GSAP timelines are transient by default; keep it that way. Check
    `document.getAnimations().length` on arrival at a screen, not just on first paint.
13c. **CSS filters go on the `<svg>` root, never on a path inside it.** A filter on a child
    element establishes its own filter region, which Chromium rasterises as a visible rectangle
    behind the shape — and it is one filter pass per element (GOTCHAS 36).
14. **Colors come from the `@theme` tokens in `src/index.css`** — reach them through Tailwind
    classes (`bg-panel`, `text-accent`, `border-edge`). `src/constants/theme.ts` holds the same
    palette as *values*, for SVG props and data-driven inline styles only; keep the two in sync.
    Dark theme only. Icons are inline SVG components in `src/components/icons.tsx`.
14b. **Magic UI components in `src/components/ui/` stay close to upstream.** They were vendored
    from the registry (what `npx shadcn add` does). Customise the components that *use* them;
    edit a vendored file only when upstream genuinely doesn't support the need, and say so in a
    comment at the top — a future re-pull should be a diff, not a merge.
15. TypeScript strict; no `any` (use `unknown` + narrowing). Functional components + hooks only.

## Workflow — before every commit

16. Run, in order, and all must pass:
    ```bash
    npm test              # 138 tests (engine + the icon registry)
    npm run typecheck     # tsc --noEmit
    npm run lint          # eslint
    rm -rf dist && npm run build:web   # the shipped channel — catches route/import/bundle errors
    ```
    **`rm -rf dist` is not optional.** A build over a warm `dist/` can produce a different artifact
    from the same source, which means the bundle you browser-tested may not be the bundle you ship,
    and a byte-comparison against the live site can report a false mismatch (GOTCHAS 39).
    Then **actually load it in a browser**. Changes to `src/db/`, the stores, or `src/App.tsx`
    especially: the browser catches render loops, blank-page boots, and worker failures that
    neither the unit tests nor the bundler will — that is how GOTCHAS 12–13 and 22–24 were all
    found. A green build is not evidence the app starts. Check the build output too: a font or
    asset regression is only visible in the emitted `dist/assets/` list (GOTCHAS 25).
17. Commit per milestone/feature with a descriptive message; push to `origin main`
    (https://github.com/gamedev1991/lifequest). Update [PROGRESS.md](PROGRESS.md) when a
    milestone completes or new debt is created.
17b. **Work directly on `main` — no feature or session branches** (owner instruction, 2026-07-30).
    Single-user repo with no review gate, so a branch adds a merge step and buys nothing. The
    safety net is rule 16 (a commit must be green before it's pushed), not branch isolation.
    Pushing to `main` publishes: it triggers the Pages deploy, so a bad commit reaches the phone.
18. Never commit: `dist/`, `node_modules/`, or edits to shipped migrations.
