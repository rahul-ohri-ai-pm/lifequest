import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { DotPattern } from './components/ui/dot-pattern';
import { CalendarIcon, ProfileIcon, StatsIcon, TodayIcon } from './components/icons';
import { getDb } from './db/client';
import { runMigrations } from './db/migrations';
import { useCharacterStore } from './store/useCharacterStore';
import { useSkillStore } from './store/useSkillStore';
import { useTaskStore } from './store/useTaskStore';
import { cn } from './lib/utils';
import { text } from './constants/theme';
import Today from './routes/Today';

// Today is the initial route and loads eagerly; everything else is split out so a cold
// start ships only what the first screen needs (§3 bundle discipline).
const Calendar = lazy(() => import('./routes/Calendar'));
const Stats = lazy(() => import('./routes/Stats'));
const Profile = lazy(() => import('./routes/Profile'));
const Archived = lazy(() => import('./routes/Archived'));
const TaskDetail = lazy(() => import('./routes/TaskDetail'));

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

function Spinner() {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="size-8 animate-spin rounded-full border-2 border-edge border-t-accent" />
    </div>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    void (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await Promise.all([
          useCharacterStore.getState().hydrate(),
          useTaskStore.getState().hydrate(new Date()),
          useSkillStore.getState().hydrate(),
        ]);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
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
      {/* Ambient grid behind the panels — code-drawn, so it costs no asset budget (§5). */}
      <DotPattern
        width={22}
        height={22}
        cr={0.7}
        glow
        className="fixed inset-0 text-accent/15 [mask-image:radial-gradient(60vw_circle_at_50%_0%,#fff,transparent)]"
      />

      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="shrink-0 border-b border-edge bg-bg-alt px-4 py-3">
          <h1 className={text.screenTitle}>{title}</h1>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          <Suspense fallback={<Spinner />}>
            <Routes>
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

        <nav className="shrink-0 border-t border-panel bg-bg-alt pb-[env(safe-area-inset-bottom)]">
          <ul className="flex">
            {TABS.map(({ to, label, Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 py-2 text-[11px] transition-colors',
                      isActive ? 'text-accent' : 'text-muted hover:text-fg'
                    )
                  }
                >
                  <Icon />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
