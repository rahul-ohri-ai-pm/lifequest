# LifeQuest — A Product Case Study

*A step-by-step dev log of building a gamified habit tracker as a solo PM directing AI agents —
written to showcase product-management decisions, not code. Source material for LinkedIn posts.*

**The product**: LifeQuest turns real-life tasks (habits, chores, workouts, reading) into
RPG-style progression — XP, levels, streaks, badges. Offline-first, single-user, private by
design: no accounts, no cloud, no tracking. Android app built with React Native + Expo + SQLite.

**The PM setup**: One product owner (me), zero human engineers. All code written by AI agents
under a written product spec, with the PM making every scope, sequencing, and trade-off call.
This case study logs those calls and what drove them.

---

## Step 0 — The spec before a single line of code

**What happened**: Wrote a full product spec (CLAUDE.md) before development: goals, explicit
non-goals, tech constraints, complete data schema, XP/streak math with worked tables, visual
direction, and a 3-phase roadmap each with a testable Definition of Done.

**PM decisions & why**:
- **Non-goals as first-class spec** — no auth, no cloud, no social, no monetization, no
  analytics. Every future "wouldn't it be cool if" gets tested against this list. Scope creep
  dies at the spec.
- **"Extremely lightweight" as a requirement, not a vibe** — small install, fast cold start,
  budget-Android-friendly. Written as a standing constraint on *every* dependency decision, which
  later paid off measurably (see Step 4).
- **A forgiving game economy** — streak breaks are recorded, never punished with paywalls or
  guilt mechanics. Product values encoded in the rules themselves.
- **Definition of Done per phase** — behavioral, user-visible statements ("survives a full app
  restart"), not engineering checklists. DoD phrasing later settled an architecture debate.

**Skills shown**: product vision, requirement writing, scope control, success criteria.

---

## Step 1 — Making AI argue before making it build

**What happened**: Before execution, spawned two engineering agents with opposing philosophies —
a "ship-fast vertical slices" pragmatist and a "foundations-first" architect — and had them debate
the build plan against the same spec. Synthesized the winner myself.

**The insight the debate surfaced**: this app's completion log is append-forever (no delete, by
design) — a wrong XP row written in week one can *never* be cleaned up. That tilted the first
week toward the architect (build + exhaustively test the math and data layer first), and
everything after toward the pragmatist (every milestone ships something runnable).

**PM decisions & why**:
- **Structured disagreement as a de-risking tool.** Two adversarial experts surfaced the
  "irreversible data" risk in hours, cheaper than discovering it in month two.
- **Hybrid verdict, explicitly reasoned**: "B wins the first week, A wins everything after" —
  and the reasoning was written down so nobody relitigates it later.
- Both agents *independently agreed* on 6 technical decisions (transaction strategy, date
  handling, no calendar library…) — convergence from opposite priors is strong evidence; those
  became locked decisions (DECISIONS.md).

**Skills shown**: decision facilitation, risk identification, technical judgment without writing
code, documenting the "why".

---

## Step 2 — Phase 1 execution: 10 milestones, each one demoable

**What happened**: M0 (scaffold) → M1 (game math, 48 unit tests, golden-tested against the spec's
own XP table) → M2 (data layer with atomic XP transactions + a dev-mode integrity tripwire) →
M3 ("golden slice": create → complete → XP → survives restart) → M4–M8 (undo, habits+skip,
counted tasks, edit+snooze, calendar) → M9 (hardening). Every milestone ended green
(tests/typecheck/build) and committed to GitHub.

**PM decisions & why**:
- **The riskiest 20% got built first and tested hardest** — XP ledger integrity, timezone-safe
  day bucketing, undo-exactness. UI screens are cheap to fix; corrupted user data isn't.
- **Milestone = demoable unit**, not engineering task. "M5: habits + skip" is a sentence a user
  understands.
- **Mid-build bundle audit**: noticed the navigation library silently shipping a 956KB icon font
  we never used. Stripped it (−1MB install size) and replaced with hand-drawn SVG icons — the
  Step-0 lightweight constraint, enforced in practice.

**Feedback loop note**: I gave a standing instruction to minimize cost/verbosity during
execution — treating AI spend like any other burn rate. Efficiency is a PM concern too.

**Skills shown**: milestone design, risk-first sequencing, quality gates, cost discipline.

---

## Step 3 — Documentation as a management system

**What happened**: Created a doc set aimed at *future AI sessions and collaborators*: README
(reading order), ARCHITECTURE (how it's actually built), CONVENTIONS (hard rules), GOTCHAS
(environment traps — "do not fix these"), DECISIONS (14 logged decisions with rationale),
PLAN/PROGRESS (roadmap + live status).

**PM decision & why**: AI agents are a workforce with amnesia — every session starts cold.
Institutional knowledge has to live in artifacts, not heads. GOTCHAS.md exists specifically
because "helpful" fixes (upgrading a pinned library, deleting a weird config) are how projects
regress. This is onboarding docs, written for a team of one thousand potential future hires.

**Skills shown**: knowledge management, process design, working *on* the system not just in it.

---

## Step 4 — First real usage: the roadmap meets the user

**What happened**: Installed the app on my own phone and used it. Within minutes, four pieces of
feedback (verbatim):

1. *"There's no way to set the category of a task"* — categories/skills were planned for Phase 2.
2. *"The stats dashboard is the most important part"* — it was a placeholder scheduled last.
3. *"I don't need difficulty tags"* — the 5-level difficulty picker was pure friction, even
   though difficulty drove the entire XP economy.
4. *"A counted task can be a habit also"* — the task-type system (todo|habit|counted) forced a
   false choice; "8 glasses of water on Mon/Wed/Fri" was unrepresentable.

Plus two sharp non-feature questions: *why a mobile app rather than web?* and *where does my data
actually live?* — both answered from the spec's own reasoning (offline-first pocket capture; data
in app-private storage, zero permissions requested because zero are needed).

**PM decisions & why**:
- **Ran a PM-vs-UX agent debate on the feedback** rather than reflexively building. UX argued
  "the user's mental model IS the spec"; PM argued for data-integrity guardrails and scope
  control. They agreed on solutions and disagreed only on sequencing — which told me exactly
  where the real decision sat.
- **Difficulty: hide, don't delete.** The user rejected the *picker*, not big rewards. Default
  everything to Medium, keep the 5-tier system in the edit screen for opt-in. Zero migrations,
  zero engine risk, complaint solved. Distinguishing what users say from what they mean is the
  job.
- **Task types: dissolve in the UI, not the database.** Replace the type picker with two
  orthogonal toggles (Repeat / Count-to-target). The schema already supported it — the UI was
  imposing a taxonomy the data never required.
- **Stats got resequenced to the front**, but split in two: v1 ships immediately on existing
  data (zero new tables), the per-category view lands right after skills do — with panels built
  generic so v1 isn't throwaway. Both agents' concerns satisfied by phasing, not compromise.
- **Roadmap integrity kept**: this became a named "Phase 1.5" with spec amendments listed and
  owner-approved — feedback absorbed *through* process, not by abandoning it.

**Skills shown**: user research on your own product, feedback triage, saying "yes, differently",
re-prioritization with reasoning, phasing as a conflict-resolution tool.

---

## Step 5 — Distribution reality check: "I want an APK, now"

**What happened**: The app ran through Expo Go (a development container needing the dev PC).
Owner call: real product = an installable APK with zero development dependencies. Re-prioritized
it as N1, ahead of all features.

**PM decisions & why**:
- **Distribution beats features.** An app you can't carry in your pocket isn't a product; the
  next feedback loops are only as good as the install experience.
- **Build locally, not via cloud service** — a one-time ~3GB toolchain install bought permanent,
  free, offline release capability with no account dependencies. Chose long-term autonomy over
  short-term convenience, consciously.
- Result: 93MB installable APK, later slimmable to ~30MB (single CPU architecture) — the
  lightweight constraint again giving a measurable lever.

**Skills shown**: knowing when ops beats features, build-vs-buy reasoning, removing platform
dependencies.

---

## Step 6 — Shipping the feedback round in one wave (N2–N5)

**What happened**: The entire Phase 1.5 plan shipped in a single day: stats dashboard v1 (on
existing data, zero migrations), capture rework (type picker and difficulty chips gone, replaced
by two optional toggles), categories with one-tap MRU-ordered chips and split-XP, and the
per-category stats view with 7d/30d/All filters. Each landed as its own verified, committed
milestone; a fresh APK went to the user's phone the same day. Test count grew 48 → 63.

**PM decisions & why**:
- **Sequencing honored the promise**: stats (the user's #1) shipped *first*, before the data
  model work, exactly as the debate synthesis committed. The generic panel design paid off — the
  category view slotted into the dashboard with no rework.
- **The user's four complaints were closed with only ONE schema migration** (skills). Difficulty
  removal and the counted×habit fix were UI-layer changes because earlier data-model decisions
  (nullable orthogonal columns, log-time XP) had left room. Good schema design is what makes
  future feedback cheap.
- **Release cadence as a feature**: same-day feedback→shipped-APK loop. For a single-user
  product, iteration speed *is* the moat.

**Skills shown**: commitment follow-through, migration cost control, release management.

---

## Step 7 — "The APK doesn't work. Let's make it a web application."

**What happened**: The standalone APK shipped in N1 (Step 5) — the milestone justified by "an app
that needs my laptop isn't a product" — didn't run on the owner's phone. Rather than debug an
Android build chain for a single-user app, the product pivoted distribution channels entirely: the
same codebase now ships as an installable web app (PWA) served from GitHub Pages. Verified
end-to-end in a real browser at phone viewport: 13/13 checks, including 25 XP awarded for a medium
task, data surviving a full reload, and the app launching with the network switched off.

**PM decisions & why**:
- **Fix the channel, not the artifact.** The APK was a means to "use it on my phone without a
  laptop." A URL delivers that better: two taps to install, self-updating, nothing to sideload, no
  "allow unknown apps," no 93MB transfer. Debugging the APK would have restored a worse channel.
- **The architecture is what made this a two-hour pivot instead of a rewrite.** `src/engine/` is
  pure TypeScript with no React or platform imports (a §3 rule from day one), so 100% of the game
  math moved to the browser untouched. Not one line of XP, level, or calendar logic changed.
- **The hard part was one hidden constraint, found early.** SQLite-in-the-browser needs
  `SharedArrayBuffer`, which needs security headers that GitHub Pages cannot send. Options were: pay
  for a host that can set headers, or replace the storage layer on web. Both were rejected — a
  70-line service worker supplies the headers itself, keeping hosting free *and* keeping one data
  layer (a second storage backend would have forked the thing the app's correctness rests on).
- **Two real bugs surfaced, and were fixed rather than papered over.** Web has no exclusive SQLite
  transaction, and the tempting fix (a plain transaction) would have silently dropped the guarantee
  the XP invariant depends on — so exclusivity was rebuilt explicitly for web instead. A second bug,
  a store selector rebuilding an array on every render, was an infinite re-render loop that had been
  latent in the native build all along. **New platforms are cheap audits.**
- **Verification was scripted, not eyeballed.** A browser drove the real UI — capture, complete,
  reload, offline, deep link — because "it looks fine on my machine" is what produced a broken APK.

**Skills shown**: separating the goal from the artifact, choosing constraints over convenience,
using architecture dividends, refusing correctness shortcuts under schedule pressure.

---

## Step 8 — The last mile was a permission, not a bug (2026-07-30)

**What happened**: The web app was built, tested, and browser-verified on 2026-07-29 — and still
wasn't reachable. Three consecutive deploy runs failed. Every run passed install, typecheck, 63
tests, and the production build, then died at the same step: `configure-pages`. The repo had no
GitHub Pages site, and the workflow's own token could not create one — `pages: write` covers
*deploying to* an existing site, not *creating* one, which needs repo-admin rights. The fix was a
human clicking one dropdown in Settings. Once that was done, run #4 went green end to end and the
app went live at **https://gamedev1991.github.io/lifequest/**.

**PM decisions & why**:
- **Recognizing an unfixable-by-me blocker is a skill, and the failure mode is thrash.** Run #2
  attempted `enablement: true` — asking the workflow to create the site itself. It failed on
  permissions. The correct next move was to stop coding, write the manual step into the README and
  the workflow file, and hand the owner a 15-second task. Attempt #3 was already one attempt too
  many; a fourth "clever" workaround would have burned a session against a permission boundary that
  no code change can cross.
- **"Verified" and "shipped" are different claims, and conflating them is how you lose trust.**
  Step 7 closed with a genuine 13/13 browser pass, which made the work *feel* done. It wasn't: the
  user still couldn't open it. The status line was corrected to say built-and-verified but not yet
  reachable — and even now, "live" is not "confirmed on his phone." iOS Safari differs from headless
  Chromium on OPFS and service-worker lifetime, so PROGRESS.md carries an explicit open item until
  a quest survives a real close-and-reopen on the actual device.
- **A monitor that can't distinguish failure from silence is worse than no monitor.** While waiting
  on run #4, the poll loop watching CI used `curl` against the GitHub API — which this session's
  proxy answers with HTTP 403, not run data. The loop compared an error body against "completed,"
  never matched, and would have hung until timeout reporting nothing. The run had in fact succeeded
  minutes earlier. The bug wasn't the 403; it was writing a wait condition whose failure looks
  identical to "still working." Logged as GOTCHAS #19, with the rule: never build a CI wait loop on
  a call you haven't confirmed returns real data.

**Skills shown**: knowing when to escalate to a human instead of engineering around a permission,
holding the line between "it works" and "they have it," designing status checks that fail loudly.

---

## Step 9 — "Remove Expo, use Tailwind + framer-motion so we can use Magic UI as is" (2026-08-02)

**The ask.** The owner asked whether the Magic UI component library was installed. It was available
as an MCP server but unusable: Magic UI is React-DOM + Tailwind + framer-motion, and LifeQuest was
React Native. The response laid out that gap plainly rather than hand-waving it. The owner's reply
was to remove the obstacle: drop Expo, adopt the web stack, use the components as-is.

**The concern, stated once, then executed.** This was a full UI rewrite, it dropped Android/iOS
entirely, and framer-motion cut against the "extremely lightweight" rule in the spec. All of that
was said in three sentences up front — and then the work was done in full, because the tradeoff was
the owner's to make and they'd already made it. Three decisions that genuinely changed the shape of
the work were put to them as choices (persistence layer, build tool, whether native was really
dead); everything else was a judgment call taken without a meeting.

**What the rewrite actually cost — and what it didn't.** This is the interesting part. Of ~3,600
lines, the UI layer (~1,100 lines) was rewritten and **the correctness-critical code moved
untouched**: `src/engine/` (all the XP, level, streak, and stats math), `src/types/`, the Zustand
stores, and every SQL statement. All 63 engine tests passed on a completely different test runner
with zero edits.

That wasn't luck. The spec's §3 hard rule — *all game math lives in `src/engine/` as pure
TypeScript, no framework imports, no DB calls* — was written in the very first document, before any
code existed, and its stated justification back then was "this is what makes the math unit-testable
without mounting a screen." The rewrite revealed a second payoff nobody had planned for: a rule
written for testability turned out to be a rule about **portability**. The framework became a
detail you could throw away.

The database got the same treatment on the fly: a 4-method `SqlDatabase` interface was extracted so
`db/queries/*` and `db/migrations/*` kept compiling across a total driver swap (expo-sqlite →
`@sqlite.org/sqlite-wasm`). One file knows what the database actually is.

**A workaround that deleted itself.** The old build needed a hand-rolled service worker to forge
COOP/COEP headers, because SQLite-on-wasm reached its worker over `SharedArrayBuffer` and GitHub
Pages cannot set headers (Step 7's cleverest hack). Switching to the `opfs-sahpool` VFS removed the
requirement entirely — no isolation, no headers, no workaround. Fifty lines of ingenuity deleted by
picking a different primitive. Worth remembering the next time a clever fix feels satisfying.

**Verification found four real traps.** A green build proves nothing about whether an app starts.
Loading it in a real headless browser caught, in order: a blank page with a *silent* console
(conditional `base` path → the SPA fallback served HTML where a module was expected); "Missing
required OPFS APIs" despite OPFS being present (the sahpool VFS is worker-only); an infinite
loading spinner (a rejected init promise seeded into the worker's request queue, so failures
produced silence instead of an error); and 262 KB of devanagari font files for a UI that renders
only latin. Three of the four failed *silently* — none would have been caught by tests, types, or
the bundler. The end-to-end check that mattered was the dull one: create a quest, complete it,
reload the page, confirm the XP came back.

**The honest cost.** Existing on-device data does not carry over — the two SQLite builds lay out
OPFS incompatibly. That's a real, unrecoverable loss for anyone running the old version, it was
flagged before a line was written rather than discovered afterward, and it moves the Phase 3 JSON
export/import up the priority list. A backup feature is worth most before you need it.

## Running feedback log (owner → product, chronological)

| When | Feedback / instruction | Product response |
|---|---|---|
| Project start | Full spec with non-goals, lightweight constraint, forgiving-game values | CLAUDE.md — the contract everything else tests against |
| Pre-build | "Two agents debate the plan first" | Architecture locked via adversarial review (Step 1) |
| Early dev | "Set up GitHub before building" | Version control + remote backup from commit 1 |
| Early dev | "Minimize token spend" | Standing efficiency instruction, saved to persistent memory |
| Mid-dev | "Plan + progress files" | PLAN.md / PROGRESS.md — roadmap and status as living artifacts |
| Post-Phase-1 | "Docs so any LLM can work safely" | 5-doc management system (Step 3) |
| First usage | 4 feature feedbacks + 2 trust questions (Step 4) | Phase 1.5 resequencing, spec amendments |
| First usage | "I want an APK now, not Expo" | Local build toolchain, N1 shipped same day |
| Post-APK | "Maintain a case-study file for PM storytelling" | This document |
| 2026-07-29 | "The APK doesn't work. Let's make it a web application" | Pivoted distribution to an installable PWA on GitHub Pages; W1 shipped and browser-verified same day (Step 7) |
| 2026-07-30 | "Always work on main branch" | Dropped the session-branch workflow — single-user repo, no review gate, branches were ceremony |
| 2026-07-30 | "Re-run deploy but don't end up in a loop — last time you ended up in a loop" | Owner enabled Pages; one manual run went green and the app is live. The no-loop instruction was itself a process fix — see Step 8 |
| 2026-08-02 | "Is magicuidesign installed?" | Answered with the real blocker rather than a yes/no: available as an MCP server, unusable against React Native primitives |
| 2026-08-02 | "Let's remove Expo code and use Tailwind + framer-motion so that we can use Magic UI as is" | Full web rewrite (Step 9). Concern stated once, three shape-changing choices put to the owner, then delivered end-to-end. Engine, types, stores, and all SQL survived unchanged; 63/63 tests green on a new runner |

---

## LinkedIn post seeds

1. **"I made two AIs argue for an hour before letting either write code."** Adversarial planning
   as a PM de-risking tool; convergence-from-opposite-priors as decision evidence.
2. **"My user rejected a feature the whole economy depended on. We shipped his ask without
   touching the economy."** Hide-don't-delete; hearing the complaint behind the complaint.
3. **"The most dangerous feedback is the kind you agree with."** Stats-first resequencing — how
   phasing let both the user's urgency and the data-model dependency win.
4. **"Docs are how you manage a team with amnesia."** Running AI agents like a workforce:
   conventions, gotchas, decision logs.
5. **"An app that needs my laptop isn't a product."** Why distribution jumped the feature queue.
6. **"Write your non-goals first."** The unbuilt features that kept this project shippable.
7. **"My user said the app didn't work. I deleted the app, not the bug."** Fixing the distribution
   channel instead of the artifact — and why "an APK" was never actually the requirement.
8. **"Porting to a new platform is the cheapest code review you'll ever get."** A browser found an
   infinite render loop that had been sitting in the shipped Android build for weeks.
9. **"Three green builds and the user still couldn't open it."** Why "verified" isn't "shipped,"
   and how to tell a blocker you can engineer around from one you have to escalate.
10. **"My status check couldn't tell 'failed' from 'still running.'"** Silence is not success —
    a short lesson in designing monitors that fail loudly.
11. **"I threw away the entire UI framework and 63 tests passed without a single edit."** A purity
    rule written for testability turned out to be a rule about portability.
12. **"My cleverest hack deleted itself."** The service worker that forged COOP/COEP headers was
    the proudest fix of the project — and picking a different storage primitive made all fifty
    lines unnecessary.
13. **"Three of the four bugs failed silently."** Green tests, clean types, successful build,
    blank page. Why "it compiles" and "it runs" are unrelated claims.

---

*Maintenance note: append a new Step section after every major milestone or owner-feedback
round — capture the decision, the why, and the verbatim feedback while fresh.*
