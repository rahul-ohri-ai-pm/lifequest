import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { SystemHeading } from './components/system/SystemHeading';
import { LevelUpOverlay } from './components/system/LevelUpOverlay';
import { BootSequence } from './components/system/BootSequence';
import { CalendarIcon, ProfileIcon, StatsIcon, TodayIcon } from './components/icons';
import { getDb } from './db/client';
import { ensurePersistentStorage } from './db/storage';
import { runMigrations } from './db/migrations';
import { useCharacterStore } from './store/useCharacterStore';
import { useSkillStore } from './store/useSkillStore';
import { useTaskStore } from './store/useTaskStore';
import { gsap, useGsap } from './lib/gsap';
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
    // on its spinner until the user answered. Profile reads the memoized result.
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
// 152ms (GOTCHAS 32). Nothing here animates at rest any more; the grid is one CSS background
// instead of ~860 SVG nodes, and every effect in the app is now a transient GSAP timeline
// that ends.
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

// The tab rail's lit segment slides between tabs instead of appearing under the new one.
// Measured from the live DOM rather than computed from an index, so it stays correct if the
// tab set or the label widths ever change.
function TabRail({ pathname }: { pathname: string }) {
  const nav = useRef<HTMLElement | null>(null);
  const rail = useRef<HTMLSpanElement | null>(null);

  // Index rather than a DOM query: the rail must also settle somewhere sensible on routes
  // that aren't tabs at all (a task detail, Archived), where no tab is active.
  const activeIndex = TABS.findIndex(({ to }) => (to === '/' ? pathname === '/' : pathname.startsWith(to)));

  useGsap(
    nav,
    () => {
      const item = nav.current?.querySelectorAll<HTMLElement>('li')[activeIndex];
      if (!rail.current) return;
      if (!item) {
        gsap.to(rail.current, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.to(rail.current, {
        x: item.offsetLeft,
        width: item.offsetWidth,
        opacity: 1,
        duration: 0.42,
        ease: 'power3.out',
      });
    },
    [activeIndex]
  );

  return (
    <nav
      ref={nav}
      className="relative shrink-0 border-t border-edge bg-bg-alt pb-[env(safe-area-inset-bottom)]"
    >
      <span
        ref={rail}
        className="pointer-events-none absolute left-0 top-0 h-px bg-accent"
        style={{ boxShadow: '0 0 10px 1px var(--color-accent)' }}
        aria-hidden
      />
      <ul className="flex">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 py-2.5 font-display text-[10px] uppercase tracking-[0.16em] transition-colors duration-200',
                  isActive ? 'text-accent' : 'text-muted hover:text-fg'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'text-glow' : undefined} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const { pathname } = location;
  const main = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void boot().then(
      () => setReady(true),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e))
    );
  }, []);

  // Screens arrive as a HUD panel powering on: a quick vertical unfold plus a lift, rather
  // than a cross-fade. Transform + opacity only, so it stays cheap.
  useGsap(
    main,
    () => {
      if (!ready) return;
      gsap.fromTo(
        main.current,
        { opacity: 0, y: 10, scaleY: 0.985 },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.34, ease: 'power3.out', clearProps: 'transform' }
      );
    },
    [pathname, ready]
  );

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
      <BootSequence />

      {/* Lives at the shell level so a level-up lands wherever the user happens to be —
          completing a quest from Today and from a task's detail screen both count. */}
      <LevelUpOverlay />

      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="relative shrink-0 px-4 pb-2 pt-3">
          <div className="flex items-end justify-between gap-3">
            <SystemHeading as="h1" size="lg" animateKey={pathname}>
              {title}
            </SystemHeading>
            <span className="pb-1 font-display text-[10px] uppercase tracking-[0.3em] text-muted">
              System
            </span>
          </div>
          <span className="mt-2 block h-px w-full bg-linear-to-r from-accent/70 via-accent/20 to-transparent" />
        </header>

        <main ref={main} className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
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
        </main>

        <TabRail pathname={pathname} />
      </div>
    </div>
  );
}
