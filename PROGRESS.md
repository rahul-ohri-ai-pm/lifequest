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

~~Still open from the design pass (deliberately out of U1's scope): the capture panel occupies a third of the first screen with 8 category chips always expanded; Profile is ~85% empty; Stats opens with four zero-value panels, an empty 14-day chart, and a black bar in the TODAY panel that reads as a render glitch.~~ **All three closed by Phase 1.9 D1/D2** — the capture panel folds, Profile carries the sigil/stat-block/radar, and the "render glitch" turned out to be an unbordered progress track. Stats still opens with zero-value panels on a fresh install (that is honest, not a bug) and remains the natural home for the `dataviz` skill.

## Phase 1.8 (owner instruction — "remove Expo, use Tailwind + framer-motion so we can use Magic UI as is")

| Milestone | Status | Notes |
|---|---|---|
| X1 — De-Expo rewrite | ✅ Done (2026-08-02) | Expo removed entirely; React + Vite + Tailwind v4 + React Router + Magic UI, web-only (DECISIONS D20–D24). **`src/engine/`, `src/types/`, `src/store/` and every SQL statement moved unchanged** — all 63 engine tests passed on the new runner (Vitest) with no edits, which is the §3 purity rule paying for itself. Driver swapped from expo-sqlite to `@sqlite.org/sqlite-wasm` behind a new 4-method `SqlDatabase` interface, so `db/queries/*` and `db/migrations/*` compiled untouched. SQLite now runs in a dedicated worker on the `opfs-sahpool` VFS, which needs no cross-origin isolation — the COOP/COEP service-worker workaround is deleted. Verified in headless Chrome end-to-end: boot → migrations → 8 default skills → create quest → complete (XP 0→25) → **reload → task and XP both persisted**. Four traps found and recorded on the way (GOTCHAS 22–28) |

| X2 — Ship it | ✅ Done (2026-08-02) | React Router 8 to clear a high-severity advisory that didn't apply but had no patched 7.x (DECISIONS D25); `npm audit` clean. Stale `.expo/` and `android/` deleted (1.7 GB). Merged to `main`, deployed, and **verified against the live site**, not just locally: create → complete → reload with XP persisted at 25, all five routes, card navigation, hard deep-link load through the 404.html fallback, two-tab lock message, and a **cold launch with the network cut off**. Live bundle hash matches the locally verified build. Zero console errors throughout |

**Bundle**: initial JS ~410 KB raw / ~135 KB gzipped across five chunks, plus the SQLite wasm
(865 KB / 406 KB gz) loaded in the worker and cached. Five routes are separately code-split
(0.9–7.3 KB each). Catching `@fontsource/rajdhani/400.css` pulling the devanagari subset saved
262 KB of never-rendered font files.

## Phase 1.9 (owner instruction — "make it look like *this*", with two reference images)

| Milestone | Status | Notes |
|---|---|---|
| D1 — System-window redesign | ✅ Done (2026-08-02) | Two Pinterest references — a *Solo Leveling* quest-system poster (look) and the Kamui landing page (motion). Both were **read, not guessed at**: the poster pulled at full 1536×2752, the 13.8s motion clip decoded and sampled at 1.5fps, because the pin titles alone would have produced a generic "anime UI" brief. Three owner calls recorded as DECISIONS D26: keep §5's blue primary (the poster is violet — structure adopted, palette rejected), take the "permanent XP loss / hardcore" panel as **visuals only** (it contradicts §2, so it reports unclaimed quests and deducts nothing), and port the motion *vocabulary* rather than the scroll choreography (the reference is a desktop marketing site; its section transitions would sit in front of the <5s capture goal). New `src/components/system/` primitives — `SystemPanel` (chamfered frame, gradient edge, corner brackets), `RuneDivider`, `SystemHeading` (blur + tracking-in), `StatBar`, `SkillRadar`, `Sigil`, `LevelUpOverlay` — all inline SVG/CSS, no new dependency (D27). Applied across all six screens: quest rows now carry a type mark, an inline progress bar and a `+13 CAREER` reward tag computed from the engine's existing `splitSkillXp`; Profile went from ~85% empty to sigil + stat block + radar; TaskDetail opens on a 3D Y-flip; routes cross-fade with depth |
| D2 — Fixes found on the way | ✅ Done (2026-08-02) | Three real problems surfaced while building, each fixed rather than worked around: **(1) the dev server could not boot at all** — StrictMode double-invokes effects, so two `runMigrations` passes raced and the second died on "table tasks already exists" (`getDb()` was memoized, the migrate+hydrate half was not; now behind a module-level `bootPromise`). Dev-only, which is why it survived: production builds don't double-invoke. **(2)** The capture form's eight always-expanded category chips filled the top third of Today before a single quest was visible — options now fold until the field is touched, capture itself unchanged at type-and-Add. **(3)** The Stats "TODAY" panel's black-on-black progress bar — carried in this file as a suspected render glitch since Phase 1.7 — was an unbordered track on a near-black panel; it has a border now |

**Verification**: 63/63 engine tests pass **unchanged** (the check that this stayed presentation-only
— `src/engine/` was not touched), plus typecheck, lint and a production build. Then driven in
headless Chromium against the **built** bundle, not just the dev server: boot → migrations → create
three quest types → complete → **reload with data and XP persisted** → all five routes → task detail
→ level-up overlay at the 280-XP threshold. `prefers-reduced-motion: reduce` confirmed to still the
ambient layers and resolve headings instantly. Bundle measured against a `git worktree` build of the
previous commit rather than against the number written here: initial load **426.3 KB raw / 135.8 KB
gz vs 419.6 / 136.9 before** — flat, and marginally smaller gzipped. CSS +1.8 KB gz. Five routes
still separately code-split; fonts still latin-subset only.

**Shipped**: merged to `main` (fast-forward, `fad37fa`) and deployed — run 30721611537 green,
live at https://gamedev1991.github.io/lifequest/. Verified by hashing **all 21 deployed files**
against `dist/` (21/21 identical, including the wasm, service worker and manifest), then re-running
the full browser harness against `vite preview` serving those exact bytes. The re-run mattered: a
one-line `startValue` fix landed *after* the first harness pass, so the build that shipped was not
the build originally tested. (Tailwind v4 does also scan Markdown — verified by probe — but only
bites when the prose names a utility the app doesn't already use, which is why the docs commit
itself built byte-identical. GOTCHAS 30.) Driving a browser at the live URL is not possible from an agent session — Chromium's
CONNECT through the session proxy is reset while `curl` succeeds (GOTCHAS 31).

## Phase 1.10 (owner: "let's fix storage")

| Milestone | Status | Notes |
|---|---|---|
| D3 — Durable storage request + honest reporting | ✅ Done (2026-08-02) | `src/db/storage.ts` calls `navigator.storage.persist()` once per page load, fired from `boot()` but **deliberately not awaited** — Firefox prompts, and awaiting it would hold the app on its spinner behind a dialog. The grant is never ours to make (Chrome infers from engagement, Safari grants on home-screen install), so the outcome is *shown* rather than assumed: Profile renders `persisted` / `best-effort` / `unsupported` from the memoized result, with the at-risk case getting the only alert treatment. Verified in a browser, including the failure path — headless Chromium refuses the grant, and the panel correctly reads "STORAGE EVICTABLE" with the home-screen advice. The success path could not be exercised headlessly and remains unconfirmed on a real device |

**A question worth recording**: the owner asked whether a JSON export would still be sane once it
holds a year of data. Measured against the real schema rather than guessed — a realistic 5
completions/day for a year is **425 KB of JSON, 47 KB gzipped**; ten years of heavy use (20/day) is
15 MB / 1.6 MB gz. A year of history is roughly *half the size of the SQLite wasm binary the app
already ships*, so JSON stays the export format (as CLAUDE.md §10 planned). Revisit only past
~50 MB, where `JSON.stringify` over the whole DB starts to matter on a low-end phone. Also worth
being clear: **JSON is the backup format, not the storage engine** — storage is SQLite in OPFS.

## Phase 1.11 (owner feedback from real device use)

| Milestone | Status | Notes |
|---|---|---|
| D4 — Repeatability is editable | ✅ Done (2026-08-02) | Owner: *"unable to edit repeatability of a quest."* Correct — the edit screen had **no Repeat toggle at all**, so a todo could never become repeating and a habit could never stop; the weekday row only appeared for tasks that were *already* habits, and only chose which days. A straight §4 violation ("Edit — change any field"). The toggle now mirrors the capture form, and the type follows from it (counted stays counted — a schedule is orthogonal there, Phase 1.5). Needed a data-layer fix too: `TaskPatch` had no `type` field and the `UPDATE` never wrote the column. Verified todo → habit → todo with a **page reload after each step**, so it proves the DB write rather than React state |
| D5 — Touch latency | ✅ Done (2026-08-02) | Owner: *"touch response is slow."* Measured rather than guessed, at 4× CPU throttling on a phone viewport: **862 infinite animations running at rest**, because `DotPattern glow` animates every dot individually (GOTCHAS 32). Median frame 54.9ms, p90 116ms, tap-to-paint 152ms. Fixes: ambient grid became one CSS background instead of ~860 animated SVG nodes; the two drifting washes made static (a 42-second cycle nobody can perceive is pure cost); `BorderBeam` removed from every task card and from the capture panel (GOTCHAS 33); `backdrop-filter` dropped from header and nav; animated `blur()` removed from route transitions and headings. **Result: 862 → 0 animations at rest, median frame 16.5ms, tap-to-paint 30ms** — a locked 60fps and a 5× faster tap, with the design unchanged to the eye |

## Phase 1.12 (owner instruction — "fully revamp the visual design and layout, awards level, use gsap")

| Milestone | Status | Notes |
|---|---|---|
| D6 — GSAP revamp | ✅ Done (2026-08-02) | Owner: *"it's still not leaving me awestruck."* GSAP added (core + Flip + SplitText + DrawSVG) against §3's own "one animation dependency" rule — the conflict was surfaced with measured sizes and the owner made the call (DECISIONS D28). **Layout rebuilt, not re-skinned**: `StatusHero` replaces `TodayHeader` with a sigil, a big level readout and a **segmented** 20-cell XP rail (a continuous bar reads as a loading indicator; discrete cells read as a game resource and give the completion effect something to land on); capture collapsed to a single command-prompt line; a `SectionBar` gives the screen a spine; quest rows enlarged with a prominent reward chip. **New moments**: a boot sequence (seam of light → window unfolds → per-character title → scanline → iris out, once per session via sessionStorage, tap to skip); an XP shard that arcs from the cleared quest into the status rail, which flinches when it lands; the row igniting; a level-up with shockwave, radial sparks, decaying shake and the sigil slamming in |
| D7 — Two bugs the revamp exposed | ✅ Done (2026-08-02) | **(1) Every screen's title read "TODAY".** SplitText replaces the text node with a span per character — DOM React thinks it owns. On navigation React committed the new title first and the layout-effect cleanup ran `split.revert()` *after*, restoring the previous text permanently. Fixed by re-keying the heading so React mounts a fresh node instead of patching a split one; verified across all five routes. **(2)** GSAP logged "target not found" on every boot — a new character has zero filled XP cells, so the entrance animated an empty array. Guarded; console is clean |

**Verification**: 63/63 engine tests unchanged, typecheck, lint, production build. In-browser:
boot sequence captured frame by frame, full regression (create three quest types → complete →
reload with data persisted → all five routes → detail → level-up), titles asserted per route,
reduced-motion confirmed (boot skipped entirely rather than flashed). **Performance held at the
line drawn in Phase 1.11**: 1 animation at rest (the sigil ring — one small transform), median
frame 16.7ms, tap-to-paint 30.8ms under 4× CPU throttling — statistically identical to before
GSAP, because every new effect is a transient timeline rather than an idle loop. Bundle: initial
JS 122.1 → 163.0 KB gz (+40.9), the predicted GSAP cost, now the app's largest single
non-essential weight and recorded as such.

## Phase 2

| Item | Status |
|---|---|
| Streak engine (tested) | ✅ Done (2026-08-02) — see Phase 2 notes below. Original scoping note kept for the record: Needs migration `0003` (`streaks`, `streak_resets`) + `src/engine/streaks.ts`. Highest-risk math since Phase 1: transitions interact with local-time day keys and DST (D4), with per-habit schedules, and with skip-vs-miss (§7 treats them the same for streaks but they are separate tables). The hard part is **retroactive detection** — miss three days without opening the app and the breaks must still be found and recorded on next launch, so the engine has to derive state from the completions log rather than from "what happened since last time I ran" |
| Skills migration + tagging + split XP | ✅ Pulled forward into Phase 1.5 (N4 `919b5c7`): `0002` migration, 8 defaults, split XP in the completion transactions, MRU chips |
| Badge engine + gallery | ⬜ |
| Skill dashboard | ⬜ — partially covered by the N5 by-category panel; the full per-skill dashboard with day/week/month/all-time filters is still open |

### Phase 2 progress

| Milestone | Status | Notes |
|---|---|---|
| P1 — Streaks | ✅ Done (2026-08-02) | `src/engine/streaks.ts` + migration `0003` + `useStreakStore`. **Derived, not incremented** (DECISIONS D29): every launch walks from each habit's creation day to today and finds the breaks, so four days away is discovered on return rather than missed by a counter. §7 honoured exactly — no freezes, a skip breaks it like a miss (so the engine reads completions alone and never touches the skips table), and `longest` never decreases. **20 new engine tests, 83 total**, covering retroactive multi-day absence, custom Mon/Wed/Fri schedules, both DST transitions, and the rule that an unfinished *today* is pending rather than a break. UI: global day-streak with best/reset counts in the status HUD, per-habit streak on quest rows |

**The upgrade path was tested, not assumed.** Migration `0003` was verified by building the
previous commit, seeding a database through its UI, then loading the new build against the *same
OPFS origin and browser profile* — i.e. the exact path the owner's phone takes. Quest and XP
survived, streaks appeared, no exceptions. A fresh-install test would have proved nothing about
this. (It also caught a stale `dist/` on the first attempt, which would have silently tested the
old build against itself — GOTCHAS 30 again, third time this session.)

**Still open in Phase 2**: badge engine + gallery, and the full per-skill dashboard with
day/week/month/all-time filters.

## Phase 3

| Item | Status |
|---|---|
| Goals engine + UI | ⬜ |
| Full stats + heatmap | ⬜ |
| Local notifications | ⬜ |
| Level-up animations | ✅ Pulled forward into Phase 1.12 (D6): shockwave, radial sparks, decaying shake, sigil slam-in |
| JSON export/import | ⬜ |

## Known issues / tech debt

- **Existing on-device data does not survive the X1 rewrite.** expo-sqlite's web build and the
  sahpool VFS lay out OPFS incompatibly, so the deployed app starts empty for anyone who used the
  old one. Nothing can be done retroactively — the Phase 3 JSON export/import is the recovery
  story, and this is an argument for building it sooner (GOTCHAS 28)
- Vendored Magic UI components are a manual-update path: there is no lockfile pinning them, so
  upstream fixes have to be re-pulled deliberately. The lint config exempts `src/components/ui/**`
  from two rules to keep them diffable against upstream
- No automated browser regression test in CI. The X1 end-to-end pass was a local scripted headless
  Chrome run over CDP; the deploy workflow gates on typecheck + tests + lint + build only. Now that
  web is the *only* channel, this is the most valuable piece of missing coverage
- **The live site has not been confirmed on the owner's real phone yet.** All passes have been
  headless Chromium. Not done until a quest survives a real close-and-reopen on the device.
  **iOS Safari is explicitly not a concern** (owner confirmed 2026-08-02 that they own no iOS
  device): the app is single-user by design (§2), so "browser support" collapses to one browser on
  one phone. Don't spend effort on WebKit-specific OPFS quota, service-worker lifetime, or
  home-screen storage-scoping differences — earlier notes here overstated that risk by reasoning
  about a general audience this product does not have
- **Browser eviction is now requested against, but cannot be guaranteed.** OPFS is the only copy of
  every quest, completion and XP row (§2: no cloud, deliberately). `src/db/storage.ts` asks for
  durable storage at boot (D3 below), but the grant is the browser's call, not ours — Chrome
  decides from engagement signals, Firefox prompts, Safari grants on home-screen install. Profile
  reports the real outcome instead of assuming success. Clearing site data still wipes everything
  regardless. **This remains the strongest argument for pulling the Phase 3 JSON export/import
  forward** — a request the browser may refuse is not a backup, and export/import is the only one a
  no-server app can have. Measured: a realistic year of history is ~425 KB of JSON (47 KB gzipped),
  so file size is no reason to delay it
- `sqlite3-worker1.js` and `sqlite3-opfs-async-proxy.js` (~243 KB combined) are emitted into
  `dist/` because the sqlite-wasm entrypoint references them, but the sahpool path never loads
  them. Dead weight on disk, not on the wire — not worth patching the package to strip
