# LifeQuest

Offline-first, single-user gamified task tracker (React Native + Expo SDK 57, TypeScript strict,
expo-sqlite, Zustand, Expo Router). Real-life tasks earn XP, levels, streaks, and badges. No
backend, no accounts, no network calls — everything lives in on-device SQLite.

## For any AI agent / developer working on this repo — read in this order

| File | What it is | Read when |
|---|---|---|
| [CLAUDE.md](CLAUDE.md) | **The product spec** — features, schema, XP/streak rules, design system, phased roadmap. The source of truth for *what* to build | Always, first |
| [CONVENTIONS.md](CONVENTIONS.md) | **Hard rules** for changing code — layer boundaries, migration rules, date handling, verification workflow. Violating these corrupts data or breaks the build | Always, before editing anything |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the code is actually structured — layers, data flow of every mutation, file map | Before touching more than one file |
| [GOTCHAS.md](GOTCHAS.md) | Environment traps that already bit us once (version pins, metro stub, npm flags). Do not "fix" these | Before touching package.json, configs, or tests |
| [DECISIONS.md](DECISIONS.md) | Why things are the way they are. Do not undo these without the owner asking | Before proposing refactors |
| [PLAN.md](PLAN.md) | Milestone plan (M0–M9 + Phases 2–3) | When starting new feature work |
| [PROGRESS.md](PROGRESS.md) | What's done, what's next, known debt. **Update it when you complete a milestone** | Start and end of every work session |
| [CASESTUDY.md](CASESTUDY.md) | PM-facing dev log: decisions, rationale, owner feedback per step. **Append after every milestone / feedback round** | After milestones and owner feedback |

## Quick start

```bash
npm install                  # .npmrc already sets legacy-peer-deps (required — see GOTCHAS.md)
npx expo start               # dev server; scan QR with Expo Go on the same Wi-Fi
npm run web                  # run in a browser (see "Running it as a web app" below)
npm test                     # jest (engine unit tests — must stay green)
npm run typecheck            # tsc --noEmit (must stay clean)
npm run lint                 # eslint
npx expo export --platform android   # bundle check; delete dist/ afterwards
```

## Running it as a web app (the primary way to use LifeQuest)

The same codebase runs in a mobile browser and installs to the phone's home screen like a native
app — no APK, no sideloading, no laptop in the loop. SQLite still holds all the data; on web it runs
as WebAssembly against the browser's private on-device filesystem (OPFS), so the app remains
offline-first with zero network calls after first load.

```bash
npm run web          # dev server, opens at http://localhost:8081/lifequest
npm run build:web    # production build into dist/ (also writes .nojekyll + 404.html)
npm run serve:web    # serve the built dist/ locally
```

**Deploying**: pushing to `main` runs `.github/workflows/deploy-web.yml`, which typechecks, runs the
tests, builds, and publishes `dist/` to GitHub Pages. One-time setup: repo **Settings → Pages →
Source → GitHub Actions**. The app then lives at `https://<user>.github.io/lifequest/` — open it on
the phone once and use "Add to Home Screen".

If the site is ever hosted somewhere other than `/lifequest/`, change `expo.experiments.baseUrl` in
`app.json` to match (`""` for a root domain).

**Why there's a service worker** (`public/sw.js`): SQLite-on-WebAssembly needs `SharedArrayBuffer`,
which browsers only grant a cross-origin-isolated page, which requires COOP/COEP response headers —
and GitHub Pages can't set headers. The worker re-serves same-origin responses with those headers,
and caches the app shell so it launches offline. Two consequences worth knowing: **the first visit
reloads itself once** (that's the worker taking control — by design), and the app **cannot run over
plain `http://`** or in a private window where service workers are blocked. See GOTCHAS.md 12–17.

## Building the standalone APK (local, no Expo account)

One-time machine setup is already done on the dev PC (JDK 17 via winget; Android SDK cmdline-tools
at `%LOCALAPPDATA%\Android\Sdk`; `JAVA_HOME`/`ANDROID_HOME` set; licenses accepted). To build:

```bash
npx expo prebuild --platform android --no-install   # regenerates android/ (gitignored) if absent
cd android; .\gradlew.bat assembleRelease           # APK: android/app/build/outputs/apk/release/app-release.apk
```

Sideload: copy the APK to the phone, tap it, allow "install unknown apps" for the file manager.
Note: the default build packages all 4 CPU ABIs (~93MB). For a phone-only build add
`-PreactNativeArchitectures=arm64-v8a` to the gradlew command (~30MB).

## Status

Phase 1 (MVP) is code-complete: all three task types, complete/undo/skip/snooze/archive, XP +
character level, calendar view, dark glow-panel UI. Phase 1.5 added the stats dashboard, the
simplified capture form, and categories with split XP. Phase 1.6 made it an installable web app —
now the primary way it's used. Phase 2 (streaks, badges, skill dashboard) is next.
See [PROGRESS.md](PROGRESS.md).
