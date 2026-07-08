# Decision log

Why things are the way they are. These were deliberate choices (several from a two-architect
design debate on 2026-07-09, recorded in [PLAN.md](PLAN.md)) — don't reverse them in passing.
If one truly needs revisiting, ask the owner first.

| # | Decision | Why |
|---|---|---|
| D1 | **Foundation-first core, vertical slices after** — engine + data layer built and tested before any screen; every later migration ships together with the UI that reads it | The completions log is append-forever (no hard delete): wrong rows written early can never be cleaned up. Once the core was proven, runnable milestones beat big-bang phases |
| D2 | **expo-sqlite async API + `withExclusiveTransactionAsync` for XP writes** | Completion insert and character XP/level update must be atomic; the exclusive variant prevents statement interleaving |
| D3 | **UUIDs via `expo-crypto` `randomUUID()`** | Already in the Expo SDK — zero added install size, no `uuid` package or Hermes polyfill risk |
| D4 | **Local-time day keys, computed only in `src/engine/time.ts`** | `toISOString().slice(0,10)` shifts late-evening completions to the wrong day (UTC bug); ms-based day math breaks on DST. Centralizing makes the bug class un-writable |
| D5 | **Hand-rolled calendar (pure `monthGrid` + Pressable grid)** | `react-native-calendars` adds real bundle weight and fights the glow theme; a month grid is ~40 lines of tested pure code |
| D6 | **Migration 0001 contains ONLY Phase 1 tables** | Migrations are forward-only and immutable once shipped; guessing Phase 2/3 shapes early would freeze mistakes. Phase 2/3 tables arrive with their features, informed by tested engine code |
| D7 | **Stores may only `set()` from rows returned by query functions** | Structurally enforces write-to-DB-first (CLAUDE.md §3) — you cannot update UI state that wasn't persisted |
| D8 | **XP computed by callers (store→engine), passed into `logCompletion`** | Keeps queries thin and mechanical; all game math stays in the unit-tested engine |
| D9 | **Skips in their own table, not zero-XP completions** | `completions` keeps meaning "things done"; stats never need filter clauses; streak engine (Phase 2) reads completions alone (spec §4) |
| D10 | **`__DEV__` invariant: `character.total_xp === SUM(xp_awarded)` after every write** | The one derived-cache exception in the spec gets a tripwire so drift is caught at the write that caused it |
| D11 | **Due dates as YYYY-MM-DD text input + snooze as +1d/+1w buttons; no datepicker dependency** | Meets the §4 snooze requirement (push forward without touching history) at zero dependency cost. Revisit only if the owner wants a picker |
| D12 | **Default expo-router tab icon font stubbed via metro config; inline SVG icons instead** | ~1MB install-size saving; spec mandates inline SVG iconography and forbids icon-font packages (§5) |
| D13 | **Undo = delete a specific completion row and subtract exactly its `xp_awarded`** | Log-time XP decisions (esp. counted tasks) make undo trivially exact; no recomputation, no retro-adjust on target edits (§7) |
| D14 | **`.npmrc` legacy-peer-deps; jest pinned to 29** | Not choices — forced by the Expo SDK 57 ecosystem (see GOTCHAS.md 1–2). Revisit on SDK upgrade |
