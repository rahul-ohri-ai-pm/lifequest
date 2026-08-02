import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { SystemHeading } from './components/system/SystemHeading';
import { LevelUpOverlay } from './components/system/LevelUpOverlay';
import { CalendarIcon, ProfileIcon, StatsIcon, TodayIcon } from './components/icons';
import { getDb } from './db/client';
import { ensurePersistentStorage } from './db/storage';
import { runMigrations } from './db/migrations';
import { useCharacterStore } from './store/useCharacterStore';
import { useSkillStore } from './store/useSkillStore';
import { useTaskStore } from './store/useTaskStore';
import { cn } from './lib/utils';

// Today is the initial route and loads eagerly; everything else is split out so a cold
// start ships only what the first screen needs (§3 bundle discipline).
const Calendar = lazy(() => import('./routes/Calendar'));
const Stats = lazy(() => import('./routes/Stats'));
const Profile = lazy(() => import('./routes/Profile'));
const Archived = lazy(() => import('./routes/Archived'));
const TaskDetail = lazy(() => import('./routes/TaskDetail'));
import Today from './routes/Today';

const TABS = [
  { to: '/', label: 'Today', Icon: TodayIcon },
  { to: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { to: '/stats', label: 'Stats', Icon: StatsIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
] as const;

const TITLES: Record<string, string> = {
  '/': 'Today',
  '/calendar': 'Calendar',
  '/stats': 'Stats',
  '/profile': 'Profile',
  '/archived': 'Archived',
};

// Boot runs exactly once per page, no matter how many times the effect fires. React's
// StrictMode double-invokes effects in development, which started two `runMigrations` passes
// against the same database concurrently: the second read `schema_migrations` before the
// first had committed, decided 0001 was pending, and died on "table tasks already exists".
// `getDb()` was already memoized this way; the migration + hydrate half was not.
let bootPromise: Promise<void> | null = null;

function boot(): Promise<void> {
  bootPromise ??= (async () => {
    // Fired, deliberately not awaited. Ask for durable storage before the first write, but
    // never gate startup on it: browsers that prompt (Firefox) would otherwise leave the app
    // on its spinner until the user answered a dialog. Profile reads the memoized result.
    void ensurePersistentStorage();

    const db = await getDb();
    await runMigrations(db);
    await Promise.all([
      useCharacterStore.getState().hydrate(),
      useTaskStore.getState().hydrate(new Date()),
      useSkillStore.getState().hydrate(),
    ]);
  })().catch((cause: unknown) => {
    bootPromise = null; // let a reload re-attempt rather than caching the failure forever
    throw cause;
  });
  return bootPromise;
}

function Spinner() {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="size-8 animate-spin rounded-full border-2 border-edge border-t-accent" />
    </div>
  );
}

// Ambient depth: two soft radial washes plus a dot grid, all painted once and then left
// alone.
//
// This layer used to be the single most expensive thing in the app. `DotPattern glow`
// animates *every dot individually* — at 22px spacing on a phone that is ~860 simultaneous
// infinite animations, measured, which pushed median frame time to 55ms and tap-to-paint to
// 152ms. The two drifting washes added two more infinite animations and two full-viewport
// composited layers on top of that.
//
// So the grid is now a single CSS background instead of ~860 animated SVG nodes, and the
// washes are static. The drift was a 42-second cycle nobody could perceive anyway; §3 makes
// "smooth on a low-end phone" a first-class constraint, and an imperceptible animation is a
// pure cost. The vendored DotPattern component is untouched (CONVENTIONS 14b) — this simply
// no longer uses it here.
function Ambience() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -left-1/4 -top-1/3 size-[120vmax] rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgb(76 141 255 / 0.16) 0%, transparent 62%)' }}
      />
      <div
        className="absolute -bottom-1/2 -right-1/3 size-[110vmax] rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, rgb(139 92 246 / 0.16) 0%, transparent 62%)' }}
      />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle at center, var(--color-accent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(60vw circle at 50% 0%, #000, transparent)',
          WebkitMaskImage: 'radial-gradient(60vw circle at 50% 0%, #000, transparent)',
        }}
      />
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const { pathname } = location;

  useEffect(() => {
    void boot().then(
      () => setReady(true),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e))
    );
  }, []);

  if (error) {
    return (
      <div className="grid h-dvh place-items-center bg-bg p-6">
        <p className="max-w-sm text-center text-fg">Failed to start: {error}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-bg">
        <Spinner />
      </div>
    );
  }

  const title = TITLES[pathname] ?? 'Quest';

  return (
    <div className="relative flex h-dvh flex-col bg-bg">
      <Ambience />

      {/* Lives at the shell level so a level-up lands wherever the user happens to be —
          completing a quest from Today and from a task's detail screen both count. */}
      <LevelUpOverlay />

      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="shrink-0 border-b border-edge bg-bg-alt px-4 py-3">
          {/* animateKey re-runs the blur-in per screen, so the title resolves like a system
              readout on every navigation rather than only on first mount. */}
          <SystemHeading as="h1" size="lg" animateKey={pathname}>
            {title}
          </SystemHeading>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          {/* The motion reference cross-fades between sections with a touch of depth rather
              than sliding. `mode="wait"` keeps the two screens from overlapping mid-scroll. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              className="flex flex-1 flex-col"
              // Opacity + a hair of scale only. Animating `filter: blur()` across a
              // full-screen element re-rasterizes the whole route on every frame — it was
              // costing far more than the depth cue was worth on a phone.
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Suspense fallback={<Spinner />}>
                <Routes location={location}>
                  <Route path="/" element={<Today />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/archived" element={<Archived />} />
                  <Route path="/task/:id" element={<TaskDetail />} />
                  <Route path="*" element={<Today />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="shrink-0 border-t border-edge bg-bg-alt pb-[env(safe-area-inset-bottom)]">
          <ul className="flex">
            {TABS.map(({ to, label, Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'relative flex flex-col items-center gap-1 py-2 font-display text-[11px] uppercase tracking-[0.12em] transition-colors',
                      isActive ? 'text-accent' : 'text-muted hover:text-fg'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* The active tab is marked the way the reference marks a selected
                          system window — a lit rail and bracket ticks, not a colour swap. */}
                      {isActive && (
                        <motion.span
                          layoutId="tab-rail"
                          className="absolute inset-x-3 top-0 h-px bg-accent"
                          style={{ boxShadow: '0 0 8px var(--color-accent)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                      <Icon className={isActive ? 'text-glow' : undefined} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
