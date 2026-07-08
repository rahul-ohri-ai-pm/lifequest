# Gotchas — environment traps. Do NOT "fix" these.

Each of these looks like a mistake or an outdated setting. It isn't. Every one was hit and solved
during initial development; undoing them re-breaks the project.

1. **`jest` is pinned to 29.x, NOT 30.** `jest-expo@57` targets Jest 29 internals; jest 30 fails
   every suite with `this._moduleMocker.clearMocksOnScope is not a function`. `@types/jest` is
   pinned to 29 to match. Do not upgrade either until jest-expo supports 30.
   `@react-native/jest-preset` is an explicit devDependency because jest-expo requires it as a
   peer.

2. **`.npmrc` contains `legacy-peer-deps=true` — required.** The Expo SDK 57 dependency tree has
   an unavoidable conflict (react-dom@19.2.7 wants react@^19.2.7; Expo pins react@19.2.3, and
   expo-router pulls react-dom via its web deps). Removing the flag makes most `npm install`
   commands fail with ERESOLVE. Revisit only on an SDK upgrade.

3. **`metro.config.js` maps `@expo-google-fonts/material-symbols` to an empty module — keep it.**
   expo-router's default tab icons statically require a 956KB font. We provide our own SVG
   `tabBarIcon` on every tab, so the stub is never exercised at runtime and saves ~1MB of install
   size. Consequences: (a) never remove the stub while custom icons exist; (b) every new tab MUST
   set a `tabBarIcon` (a default icon would render blank).

4. **`tsconfig.json` has `"types": ["jest"]`.** Without it, `tsc` can't see jest globals
   (`describe`/`it`/`expect`) and typecheck fails on every test file. Don't remove; add to the
   array rather than replacing it if another global type package is ever needed.

5. **`package.json` `"main": "expo-router/entry"`.** There is deliberately no `App.tsx` or
   `index.ts` — Expo Router owns the entry point and the `app/` directory defines all routes.
   Don't scaffold an App.tsx.

6. **expo-sqlite: async API only, and `withExclusiveTransactionAsync` for the XP write paths.**
   Plain `withTransactionAsync` allows other statements to interleave; the completion+character
   write must be exclusive. Inside a transaction callback, use the `txn` parameter, not a fresh
   `getDb()` call.

7. **The `__DEV__` XP invariant in `src/db/queries/completions.ts` throws on purpose.** If you
   ever see `XP invariant violated`, a write path has a bug — fix the write path; never delete or
   soften the check.

8. **Windows dev machine.** Git prints `LF will be replaced by CRLF` warnings on every commit —
   harmless, ignore them. Shell is PowerShell 5.1: no `&&` chaining (use `;` or `if ($?)`).

9. **This is Expo SDK 57 / RN 0.86 / React 19.2 (Jan 2026 era).** APIs changed vs older Expo
   versions an LLM may remember — e.g. `Tabs` `sceneStyle` option, expo-sqlite's
   `openDatabaseAsync` API. When unsure, check https://docs.expo.dev/versions/v57.0.0/ rather
   than assuming from training data.

10. **`npx expo export` writes a `dist/` folder** — it's only a build-verification artifact.
    Gitignored; delete it after checking output.

11. **Dev database reset**: there is no UI reset button yet (planned Settings item). During
    development, use `resetDb()` from `src/db/client.ts` or clear the Expo Go app data. Never
    hand-delete the SQLite file on a real device.
