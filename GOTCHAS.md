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

20. **Rajdhani is for headers, numbers, and level-ups only — never tab bar labels.** Its
    ascent/descent is taller than the system font, and the Expo Router tab bar has a fixed label
    box: setting `tabBarLabelStyle.fontFamily` to the display face clips the bottom off every
    label ("Today", "Calendar", …). An explicit `lineHeight` does not reliably rescue it. This
    also happens to be what §5 says — system font for anything read at length. Same caution
    applies to any other fixed-height control before reaching for `type.display`.

21. **Fonts load behind the startup gate, and a font failure must not block boot.**
    `app/_layout.tsx` waits on `!ready || !(fontsLoaded || fontError)` — note the `fontError`
    branch. Gating on `fontsLoaded` alone would leave the app spinning forever on a device where
    the face fails to fetch; a missing display font makes LifeQuest plainer, not broken.

## Web rewrite — React + Vite + Tailwind + Magic UI (2026-08-02)

Several gotchas in the section above described the Expo web build and no longer apply; the
cross-origin-isolation ones in particular are gone with the VFS change (DECISIONS D23).

22. **`base` in `vite.config.ts` must not be conditional on the command.** With
    `base: command === 'build' ? '/lifequest/' : '/'`, `vite preview` serves the site at `/` but
    the *built* `index.html` asks for `/lifequest/assets/index-*.js`. Vite's SPA fallback answers
    those with `index.html`, so the browser receives HTML where it expected a module — and fails
    **silently**: no console error, no network error, just `#root` empty forever. If the app boots
    to a blank page with a silent console, check what the script tag actually resolved to before
    suspecting your code.

23. **`opfs-sahpool` only works inside a Worker.** It fails with `Missing required OPFS APIs.` on
    the main thread even though `navigator.storage.getDirectory` is present and
    `window.isSecureContext` is true — the missing piece is
    `FileSystemFileHandle.prototype.createSyncAccessHandle`, which browsers expose only off the
    main thread. The error names the symptom, not the cause; don't go hunting for a headers or
    origin problem.

24. **Never seed a worker's request queue with `ready.then(…)`.** In `src/db/sqlite.worker.ts` the
    chain starts as `Promise.resolve()` and `await ready` happens *inside* each request's `try`.
    Seeding the chain with the init promise looks equivalent and is not: if the pool fails to
    open, the seed is rejected, every later `.then` is skipped, no response is ever posted, and
    the app hangs on its loading spinner with nothing in the console. Failure to open the database
    has to arrive as a reply, not as silence. (This is why `client.ts` also puts the underlying
    cause into the user-visible error string — on a phone there is no console to check.)

25. **Import the subset-specific `@fontsource` entrypoint.** `@fontsource/rajdhani/400.css` pulls
    every subset the family ships, which added ~262 KB of devanagari font files the UI never
    renders. `@fontsource/rajdhani/latin-400.css` is the correct import. Check `dist/assets/`
    after any font change — the waste is invisible until you read the build output.

26. **Vitest bundles its own copy of Vite, so its config lives in `vitest.config.ts`.** Putting a
    `test` block in `vite.config.ts` and importing `defineConfig` from `vitest/config` makes
    `tsc` fail on the config file itself: vitest's Vite is rollup-based, the project's Vite 8 is
    rolldown-based, and `Plugin` is structurally incompatible between them. Two files, no
    workaround needed.

27. **`vite preview` does not survive `dist/` being emptied.** `vite build` clears the output
    directory, and a preview server started beforehand then answers with `ERR_FAILED` while
    `curl` against the same URL still returns 200 (different connection handling). Restart
    preview after every rebuild rather than debugging a phantom app failure.

28. **OPFS data does not carry over from the old expo-sqlite build.** expo-sqlite's web build and
    the sahpool VFS lay out OPFS completely differently — sahpool stores an opaque pool of files
    under `.lifequest-pool`, not a readable `lifequest.db`. A device that used the old deployment
    starts empty on the new one. There is no migration path short of the Phase 3 JSON
    export/import, which is why that feature is the recovery story for anything like this.

29. **Only one tab can hold the database, and `navigator.locks` is how we say so.** The
    `opfs-sahpool` VFS takes exclusive sync access handles, so a second tab doesn't queue — it
    fails, and if both load at once *both* can fail. `claimSingleInstance()` in
    `src/db/client.ts` claims a Web Lock first purely so the message can name the real cause
    instead of blaming private mode and HTTPS. **Watch the shape of that function**:
    `navigator.locks.request()` resolves only after its callback's promise settles, so the
    callback resolves an *outer* promise to let startup continue and then returns a
    never-settling promise to keep holding the lock. Awaiting `request()` directly, with a
    callback that holds forever, hangs startup forever — the app sits on its spinner having
    successfully taken the lock. That bug was written and caught in the same session; it only
    showed up with two tabs open.

## Agent session environment (Claude Code on the web)

19. **`curl https://api.github.com/...` does not work — use the GitHub MCP tools.** The session
    proxy answers direct GitHub API calls with **HTTP 403** and a JSON body reading "GitHub access
    is not enabled for this session," *even for this public repo*. This is nastier than a plain
    failure: a poll loop like `until [ "$(curl … | grep status)" = '"status": "completed"' ]` will
    spin forever against the 403 body and looks exactly like "the job is still running." It cost a
    session once. Read CI state via `actions_list` / `actions_get` / `get_job_logs`, and never
    build a wait loop on top of raw `curl` to GitHub. Plain `curl` to the *published site*
    (`gamedev1991.github.io`) is fine — that's how the deploy was verified.
