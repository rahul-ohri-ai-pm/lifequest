# LifeQuest

Offline-first, single-user gamified task tracker — an installable PWA (React + Vite, TypeScript
strict, SQLite-on-WebAssembly, Zustand, React Router, Tailwind v4, Magic UI). Real-life tasks earn
XP, levels, streaks, and badges. No backend, no accounts, no network calls — everything lives in
on-device SQLite.

**Phase 1 and Phase 2 are complete**: all three task types with the full verb set, XP and character
levels, a calendar with backfill, editable categories with split XP, derived streaks, a 30-badge
engine with its gallery, and a filtered skill dashboard. Phase 3 is next — see
[PROGRESS.md](PROGRESS.md).

## For any AI agent / developer working on this repo — read in this order

| File | What it is | Read when |
|---|---|---|
| [CLAUDE.md](CLAUDE.md) | **The product spec** — features, schema, XP/streak rules, design system, phased roadmap. The source of truth for *what* to build | Always, first |
| [CONVENTIONS.md](CONVENTIONS.md) | **Hard rules** for changing code — layer boundaries, migration rules, date handling, verification workflow. Violating these corrupts data or breaks the build | Always, before editing anything |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the code is actually structured — layers, data flow of every mutation, file map | Before touching more than one file |
| [GOTCHAS.md](GOTCHAS.md) | Environment traps that already bit us once (Vite base path, worker-only OPFS, font subsets, warm-`dist/` builds). Do not "fix" these | Before touching package.json, configs, or tests |
| [DECISIONS.md](DECISIONS.md) | Why things are the way they are. Do not undo these without the owner asking | Before proposing refactors |
| [PLAN.md](PLAN.md) | Milestone plan (M0–M9 + Phases 2–3) | When starting new feature work |
| [PROGRESS.md](PROGRESS.md) | What's done, what's next, known debt. **Update it when you complete a milestone** | Start and end of every work session |
| [CASESTUDY.md](CASESTUDY.md) | PM-facing dev log: decisions, rationale, owner feedback per step. **Append after every milestone / feedback round** | After milestones and owner feedback |

## Quick start

```bash
npm install
npm run dev                  # Vite dev server at http://localhost:5173/lifequest/
npm test                     # vitest — 138 tests, must stay green
npm run typecheck            # tsc --noEmit (must stay clean)
npm run lint                 # eslint
rm -rf dist && npm run build:web   # production build (also writes .nojekyll + 404.html)
npm run serve:web            # serve the built dist/ locally
```

`rm -rf dist` before a build you intend to verify or ship: a build over a warm `dist/` can produce
a different artifact from identical source, so the bundle you tested may not be the one you ship
(GOTCHAS 39).

Note the **`/lifequest/`** path in dev — `base` in `vite.config.ts` is unconditional so dev,
preview, and production agree on asset URLs, the router basename, and the service-worker scope.
Serving from `/` in dev hid a blank-page failure once (GOTCHAS 22).

## How it runs

The app installs to a phone's home screen like a native app — no APK, no sideloading, no laptop in
the loop. SQLite holds all the data, compiled to WebAssembly and writing to the browser's private
on-device filesystem (OPFS), so the app is offline-first with zero network calls after first load.
SQLite runs in a dedicated worker (`src/db/sqlite.worker.ts`) because its `opfs-sahpool` VFS needs
an API browsers only expose off the main thread.

### 👉 Live app: **https://gamedev1991.github.io/lifequest/**

Open it on the phone once and use "Add to Home Screen".

**Deploying**: pushing to `main` runs `.github/workflows/deploy-web.yml`, which typechecks, runs the
tests, builds, and publishes `dist/` to GitHub Pages. The workflow also accepts a manual
`workflow_dispatch` run (Actions → Deploy web app → Run workflow) when you need to re-publish
without a new commit.

**One-time setup — already done for this repo (2026-07-30), documented in case it's ever reset or
the project is forked**: repo **Settings → Pages → Source → GitHub Actions**. Until that's done the
workflow fails at `configure-pages` with `Get Pages site failed … Not Found`, and it must be done by
hand — creating a Pages site needs repo-admin rights, while `GITHUB_TOKEN`'s `pages: write` only
covers deploying to a site that already exists. (`enablement: true` on `configure-pages` was tried
and fails with "Resource not accessible by integration".) Note that Pages on a **private** repo
requires a paid plan (Pro/Team) — on the free plan, either make the repo public or host the same
`dist/` somewhere else (Netlify/Cloudflare Pages, where `public/_headers` already supplies the
required headers).

If the site is ever hosted somewhere other than `/lifequest/`, change `base` in `vite.config.ts` to
match (`'/'` for a root domain).

**Why there's a service worker** (`public/sw.js`): purely to cache the app shell so an installed
PWA keeps launching with the radio off (§2). It used to also forge COOP/COEP headers, because the
old expo-sqlite web build reached its worker over `SharedArrayBuffer` and needed cross-origin
isolation that GitHub Pages cannot provide. The `opfs-sahpool` VFS needs no isolation, so that
workaround is gone — don't reintroduce the headers. The app still **cannot run over plain
`http://`** or in a private window, because OPFS itself requires a secure context.

## Status

**Phase 1 (MVP)** — complete: all three task types, complete/undo/skip/snooze/archive (no delete
anywhere), XP + character level, calendar view, dark glow-panel UI.
**Phase 1.5–1.6** — stats dashboard, simplified capture, categories with split XP, and the
installable PWA, live since 2026-07-30.
**Phase 1.7** (2026-08-02) — Expo removed entirely, UI rebuilt on React + Vite + Tailwind + Magic
UI; Android/iOS dropped as targets (DECISIONS D20).
**Phase 1.11–1.12** — touch latency fixed (862 idle animations → 0), then a full GSAP revamp.
**Phase 2** — complete 2026-08-03: derived streaks, editable categories with a local icon library,
a 30-badge engine + gallery with progress rings, and the skill dashboard.

**Phase 3 is next**, starting with **JSON export/import** — OPFS holds the only copy of the data,
and a durable-storage grant the browser can refuse is not a backup.

### Known open question: iOS Safari

A second user hit a hard startup failure on iPhone Safari (2026-08-03) — OPFS refused to open with
an error that names no cause. iOS was scoped out earlier because the owner has no iOS device; that
premise changed when the link was shared. **There is no WebKit in the build environment**, so
nothing iOS-specific has been verified on the platform it targets. What shipped: a smaller
sync-access-handle pool, one retry, and a failure screen that runs an OPFS probe *on the device*
and reports which step fails. Whether iOS becomes supported is an open owner decision — see
DECISIONS D41.

## Troubleshooting a startup failure

If the app shows **"Can't open your data"**, in order of likelihood: it's a private/incognito tab
(on-device storage is off there), another tab already holds the database (only one at a time), or
the device is out of storage. Tap **Try again** first — the underlying error is often transient.
If it persists, tap **Diagnose**, then **Copy report**: that runs the real OPFS sequence and names
the step that failed, which is worth far more than a screenshot of the message.
