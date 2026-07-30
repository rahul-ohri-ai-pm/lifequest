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

11b. **`eslint` is pinned to 9.x, NOT 10.** The repo originally pinned `^10.6.0`, under which
    `npm run lint` crashes outright inside `eslint-plugin-react`'s version detection (not a lint
    error — a stack trace). `expo lint` corrects the pin to 9.x on its own; that's the working
    combination for the SDK 57 tree. Don't "upgrade" it back.

## Web / PWA target (added with the web build)

12. **`withExclusiveTransactionAsync` does not exist on web — never call it directly.** expo-sqlite
    throws outright: the web build is one worker behind one connection. Use
    `withWriteTransaction()` from `src/db/transaction.ts`, which uses the real exclusive
    transaction on native and a serialized promise chain on web. Do NOT "fix" a web transaction
    error by switching to `withTransactionAsync` — that silently drops the non-interleaving
    guarantee the XP invariant (#7) depends on.

13. **A zustand selector must never return a freshly-built object or array.**
    `useSkillStore((s) => s.orderedSkills())` built a new array per render; zustand v5 has no
    built-in equality check, so React saw a new snapshot every time → infinite re-render loop
    (React error #185, which only surfaced on web). Subscribe to raw state and `useMemo` the
    derivation, as `FastCapture` does with `orderSkillsByMru`.

14. **`public/sw.js` is load-bearing, not an optimization.** SQLite-wasm needs
    `SharedArrayBuffer`, which the browser only grants a cross-origin-isolated page, which needs
    COOP/COEP *response headers* that GitHub Pages cannot set. The service worker supplies them
    (and caches the shell for offline). Consequences: the app cannot run over plain HTTP or in a
    private window where workers are blocked, and the very first visit reloads once by design —
    that's the worker taking control. `src/db/client.ts` explains this in the failure message.

15. **`web.output` must stay `"static"`.** Under `"single"`, Expo ignores `app/+html.tsx` and emits
    its own barebones template — you silently lose the manifest link, the worker registration, and
    the dark no-flash background.

16. **`wasm` is added to `metro.config.js` `assetExts` for expo-sqlite.** Without it the SQLite
    worker's `import ... from './wa-sqlite.wasm'` fails to resolve. Harmless on native.

17. **GitHub Pages needs `.nojekyll`, or the whole app 404s.** Jekyll refuses to serve paths
    starting with an underscore and every bundle lives under `_expo/static/`.
    `scripts/finalize-web-export.mjs` writes it (plus `404.html` for dynamic-route deep links) —
    it runs as part of `npm run build:web`, so don't call `expo export` alone for a deploy.

18. **Pages must be enabled by hand; the workflow can never do it.** Settings → Pages → Source →
    GitHub Actions. Done for this repo on 2026-07-30, but if `configure-pages` ever fails with
    `Get Pages site failed … Not Found`, that switch is off — do **not** "fix" it by adding
    `enablement: true` (tried; fails with "Resource not accessible by integration", because
    creating a site needs repo-admin and `GITHUB_TOKEN` only has deploy rights). Re-flip the
    switch and re-run; no code change will help.

## Agent session environment (Claude Code on the web)

19. **`curl https://api.github.com/...` does not work — use the GitHub MCP tools.** The session
    proxy answers direct GitHub API calls with **HTTP 403** and a JSON body reading "GitHub access
    is not enabled for this session," *even for this public repo*. This is nastier than a plain
    failure: a poll loop like `until [ "$(curl … | grep status)" = '"status": "completed"' ]` will
    spin forever against the 403 body and looks exactly like "the job is still running." It cost a
    session once. Read CI state via `actions_list` / `actions_get` / `get_job_logs`, and never
    build a wait loop on top of raw `curl` to GitHub. Plain `curl` to the *published site*
    (`gamedev1991.github.io`) is fine — that's how the deploy was verified.
