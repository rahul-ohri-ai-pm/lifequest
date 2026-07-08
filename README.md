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

## Quick start

```bash
npm install                  # .npmrc already sets legacy-peer-deps (required — see GOTCHAS.md)
npx expo start               # dev server; scan QR with Expo Go on the same Wi-Fi
npm test                     # jest (engine unit tests — must stay green)
npm run typecheck            # tsc --noEmit (must stay clean)
npm run lint                 # eslint
npx expo export --platform android   # bundle check; delete dist/ afterwards
```

## Status

Phase 1 (MVP) is code-complete: all three task types, complete/undo/skip/snooze/archive, XP +
character level, calendar view, dark glow-panel UI. Phase 2 (skills, streaks, badges) is next.
See [PROGRESS.md](PROGRESS.md).
