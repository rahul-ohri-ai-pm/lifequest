import { useNavigate } from 'react-router';
import { weekStrip } from '../../engine/stats';

// The week you are actually in, above everything else on Today.
//
// Until now Today had no date context at all — it said "today" and nothing about whether that
// was a good week or the fourth day running you had let slide. Seven marks answer that in one
// glance, and they answer it from the completions log rather than from a stored counter (§4).
//
// The three states are deliberately distinct: a day you cleared, a day you missed, and a day
// that has not happened yet. Collapsing the last two would make Wednesday look like a failure
// on Monday, which is exactly the punishing read §2 rules out.

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  activeDays: ReadonlySet<string>;
  today: Date;
}

export function WeekStrip({ activeDays, today }: Props) {
  const navigate = useNavigate();
  const days = weekStrip(activeDays, today);

  return (
    <div className="grid grid-cols-7 gap-1" role="list" aria-label="This week">
      {days.map((d) => (
        <button
          key={d.dayKey}
          type="button"
          role="listitem"
          onClick={() => navigate(`/calendar?day=${d.dayKey}`)}
          aria-label={`${d.dayKey}${d.active ? ', completed' : ''}${d.isToday ? ', today' : ''}`}
          aria-current={d.isToday ? 'date' : undefined}
          className="flex flex-col items-center gap-1 py-1"
        >
          <span
            className={`font-display text-[10px] uppercase tracking-[0.14em] ${
              d.isToday ? 'text-accent' : 'text-muted'
            }`}
          >
            {LETTERS[d.weekday]}
          </span>
          <span
            className={`font-display text-sm leading-none tabular-nums ${
              d.isToday
                ? 'text-fg text-glow'
                : d.isFuture
                  ? 'text-muted/50'
                  : d.active
                    ? 'text-fg'
                    : 'text-muted'
            }`}
          >
            {d.dayOfMonth}
          </span>
          {/* Marker rail: a lit pip for a cleared day, a hollow one for a missed day, and
              nothing at all for a day still to come. */}
          <span
            aria-hidden
            className={`size-1.5 rotate-45 ${
              d.active
                ? 'bg-accent shadow-[0_0_6px_var(--color-accent)]'
                : d.isFuture
                  ? 'border border-edge/60'
                  : 'border border-edge'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
