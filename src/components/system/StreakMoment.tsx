import { useEffect, useRef, useState } from 'react';
import { SystemPanel } from './SystemPanel';
import { StreakIcon, CheckIcon } from '../icons';
import { useStreakStore } from '../../store/useStreakStore';
import { gsap, useGsap, prefersReducedMotion } from '../../lib/gsap';
import { addDays, dayKeyFor } from '../../engine/time';

// The streak-extended takeover, structured after the reference: the flame ignites, the number
// ticks from yesterday's count to today's, "day streak" lands under it, and a Su–Sa week strip
// fills in showing which days are already banked.
//
// Taken from the reference: the beats and the week strip. Not taken: the flat cartoon look —
// this is drawn in the system-window language like everything else, so it reads as part of the
// app rather than a borrowed screen.
//
// Fires when the global day-streak actually advances, and at most once per day: the trigger is
// a dayKey written to localStorage, so completing five quests today celebrates once, and a
// reload does not replay it.

const SEEN_KEY = 'lifequest_streak_day';
const DISMISS_MS = 3600;

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakMoment() {
  const global = useStreakStore((s) => s.global);
  const root = useRef<HTMLDivElement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const current = global?.state.current ?? 0;
  const lastActive = global?.state.lastActiveDay ?? null;
  const today = dayKeyFor(new Date());

  // Read once, at mount, and never again.
  //
  // Reading localStorage during every render would be self-defeating: the effect below writes
  // today's key as soon as the moment opens, so the very next re-render (any store update —
  // and completing a quest causes several) would see `seen === today`, flip `shouldShow` to
  // false and unmount the overlay mid-animation. Freezing the value at mount means only
  // `dismissed` can close it.
  const [seenAtMount] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SEEN_KEY);
    } catch {
      return today; // storage blocked (private mode) — degrade to never showing, not always
    }
  });
  const shouldShow = !dismissed && current > 0 && lastActive === today && seenAtMount !== today;

  useEffect(() => {
    if (!shouldShow) return;
    try {
      localStorage.setItem(SEEN_KEY, today);
    } catch {
      /* nothing to do; the in-memory guard still prevents a repeat this session */
    }
    const t = setTimeout(() => setDismissed(true), DISMISS_MS);
    return () => clearTimeout(t);
  }, [shouldShow, today]);

  useGsap(
    root,
    () => {
      if (!shouldShow) return;
      const tl = gsap.timeline();
      tl.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.2 })
        .fromTo(
          '[data-flame]',
          { scale: 0.2, opacity: 0, rotate: -18 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.55, ease: 'back.out(2)' },
          0.05
        )
        // The count ticks from where it was to where it is — the increment is the message.
        .fromTo(
          '[data-streak-num]',
          { textContent: Math.max(current - 1, 0) },
          {
            textContent: current,
            duration: 0.7,
            ease: 'power2.out',
            snap: { textContent: 1 },
          },
          0.35
        )
        .fromTo('[data-streak-label]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, 0.55)
        .fromTo(
          '[data-dow]',
          { opacity: 0, scale: 0.5 },
          { opacity: 1, scale: 1, duration: 0.32, stagger: 0.05, ease: 'back.out(2.2)' },
          0.7
        );

      if (!prefersReducedMotion()) {
        tl.to('[data-flame]', { scale: 1.08, duration: 0.5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.1);
      }
    },
    [shouldShow, current]
  );

  if (!shouldShow || !global) return null;

  // The seven days ending today, so the strip always ends on the day just earned.
  const now = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(now, i - 6);
    const key = dayKeyFor(date);
    return { key, dow: DOW[date.getDay()], done: key <= today && isBanked(key, current, today) };
  });

  const dismiss = () => setDismissed(true);

  return (
    <div
      ref={root}
      onPointerDown={dismiss}
      className="fixed inset-0 z-[60] grid place-items-center bg-bg/90 p-6 opacity-0"
      role="status"
      aria-live="polite"
    >
      <SystemPanel glow className="w-full max-w-xs" innerClassName="flex flex-col items-center gap-1 px-6 py-8">
        <span data-flame className="block text-epic">
          <StreakIcon size={72} />
        </span>

        <span
          data-streak-num
          className="font-display text-6xl font-bold leading-none text-epic tabular-nums"
          style={{ textShadow: '0 0 24px rgb(245 185 66 / 0.55)' }}
        >
          {current}
        </span>
        <span
          data-streak-label
          className="font-display text-[11px] uppercase tracking-[0.32em] text-muted"
        >
          Day streak
        </span>

        <div className="mt-5 flex gap-2">
          {week.map((d, i) => (
            <div key={d.key} data-dow className="flex flex-col items-center gap-1">
              <span className="font-display text-[9px] uppercase tracking-wider text-muted">{d.dow}</span>
              <span
                className={
                  d.done
                    ? 'grid size-6 place-items-center rounded-full bg-epic text-bg'
                    : 'grid size-6 place-items-center rounded-full border border-edge text-transparent'
                }
                style={d.done ? { boxShadow: '0 0 8px rgb(245 185 66 / 0.6)' } : undefined}
              >
                {d.done && <CheckIcon size={13} />}
              </span>
              {i === 6 && <span className="h-px w-4 bg-epic" />}
            </div>
          ))}
        </div>

        <span className="mt-5 font-display text-[10px] uppercase tracking-[0.2em] text-muted">
          Tap to continue
        </span>
      </SystemPanel>
    </div>
  );
}

// A day inside the current run is banked. The run ends today and is `current` days long, so
// anything within that window counts — derived rather than re-querying the log for a display
// that is already on screen for three seconds.
function isBanked(key: string, current: number, today: string): boolean {
  const start = dayKeyFor(addDays(new Date(), -(current - 1)));
  return key >= start && key <= today;
}
