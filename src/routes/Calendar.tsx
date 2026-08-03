import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { SystemPanel } from '../components/system/SystemPanel';
import { RuneDivider } from '../components/system/RuneDivider';
import { monthGrid } from '../engine/calendar';
import { dateFromDayKey, dayKeyFor, dayWindow, isScheduledDay } from '../engine/time';
import { getCompletionsBetween } from '../db/queries/completions';
import { useTaskStore } from '../store/useTaskStore';
import { useStreakStore } from '../store/useStreakStore';
import { CategoryIcon, CheckIcon } from '../components/icons';
import { useSkillStore } from '../store/useSkillStore';
import { cn } from '../lib/utils';
import { difficultyColors } from '../constants/theme';
import type { Completion, Task } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Calendar() {
  const navigate = useNavigate();
  const tasks = useTaskStore((s) => s.tasks);
  const todayKey = dayKeyFor(new Date());

  // `?day=YYYY-MM-DD` lets another screen open the calendar on a specific date — the week
  // strip on Today uses it. Read once at mount: this route is lazy, so arriving here always
  // mounts it fresh, and treating the param as live state would fight the day buttons below.
  const [params] = useSearchParams();
  const requested = params.get('day');
  const initial = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayKey;
  const initialDate = dateFromDayKey(initial);

  const [year, setYear] = useState(() => initialDate.getFullYear());
  const [month, setMonth] = useState(() => initialDate.getMonth());
  const [selected, setSelected] = useState(initial);
  const [dayCompletions, setDayCompletions] = useState<Completion[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const backfillCompletion = useTaskStore((s) => s.backfillCompletion);
  const skills = useSkillStore((s) => s.skills);
  const taskSkills = useSkillStore((s) => s.taskSkills);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);

  // Tasks relevant to a day: habits scheduled on it + tasks due on it (§4 Calendar)
  const tasksForDay = (dayKey: string): Task[] => {
    const date = dateFromDayKey(dayKey);
    return tasks.filter((t) => {
      const scheduled = t.schedule && isScheduledDay(t.schedule, date);
      const due = t.dueAt && dayKeyFor(new Date(t.dueAt)) === dayKey;
      return scheduled || due;
    });
  };

  // Days on which something was actually completed. This used to be "day has a scheduled
  // or due task", which — with a single daily habit — put an identical dot on every square
  // of every month, past and future, so the marker carried no information at all.
  // Completion is real history; a schedule is not.
  const [monthCompletionDays, setMonthCompletionDays] = useState<Set<string>>(new Set());
  const [monthRevision, setMonthRevision] = useState(0);

  useEffect(() => {
    const first = grid[0]?.[0];
    const lastWeek = grid[grid.length - 1];
    const last = lastWeek?.[lastWeek.length - 1];
    if (!first || !last) return;
    const startIso = dayWindow(dateFromDayKey(first.dayKey)).startIso;
    const endIso = dayWindow(dateFromDayKey(last.dayKey)).endIso;
    let cancelled = false;
    void getCompletionsBetween(startIso, endIso).then((rows) => {
      if (cancelled) return;
      setMonthCompletionDays(new Set(rows.map((c) => dayKeyFor(new Date(c.completedAt)))));
    });
    return () => {
      cancelled = true;
    };
  }, [grid, monthRevision]);

  // A future/today square with work planned gets a hollow marker, so "planned" and "done"
  // are visually distinct rather than the same blue dot.
  const dayIsPlanned = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const week of grid) {
      for (const cell of week) {
        map.set(cell.dayKey, cell.dayKey >= todayKey && tasksForDay(cell.dayKey).length > 0);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, tasks, todayKey]);

  // Bumped after a backfill so the day's list and the month dots both refresh.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const { startIso, endIso } = dayWindow(dateFromDayKey(selected));
    void getCompletionsBetween(startIso, endIso).then(setDayCompletions);
  }, [selected, revision]);

  const categoryOf = (taskId: string): string | null => {
    const first = taskSkills[taskId]?.[0];
    return first ? (skills.find((s) => s.id === first)?.name ?? null) : null;
  };

  const logOnSelectedDay = async (task: Task) => {
    setBusy(task.id);
    try {
      await backfillCompletion(task, dateFromDayKey(selected), new Date());
      // Streak state is derived from the completions log, so backfilling can *repair* a break
      // — but only if it is recomputed. Without this the repaired streak would not appear
      // until the next cold start.
      await useStreakStore.getState().hydrate(useTaskStore.getState().tasks, new Date());
      setRevision((r) => r + 1);
      setMonthRevision((r) => r + 1);
      setLogOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  };

  const selectedTasks = tasksForDay(selected);
  const completedIds = new Set(dayCompletions.map((c) => c.taskId));

  return (
    <div className="p-4 pb-8">
      <SystemPanel glow innerClassName="px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} aria-label="Previous month" className="p-2 text-accent">
          <ChevronLeftIcon />
        </button>
        <h2 className="font-display text-lg uppercase tracking-[0.14em] text-fg text-glow">
          {MONTHS[month]} {year}
        </h2>
        <button type="button" onClick={nextMonth} aria-label="Next month" className="p-2 text-accent">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center font-display text-[11px] uppercase tracking-widest text-muted">
            {w}
          </div>
        ))}
      </div>

      {grid.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((cell) => {
            const isToday = cell.dayKey === todayKey;
            const isSelected = cell.dayKey === selected;
            return (
              <button
                key={cell.dayKey}
                type="button"
                onClick={() => {
                  // Closing here rather than in an effect on `selected`: leaving the picker
                  // open across a day change would make it ambiguous which day the next tap
                  // logs against, and that is the one mistake that writes bad history.
                  setSelected(cell.dayKey);
                  setLogOpen(false);
                }}
                className={cn(
                  'notch [--notch:4px] relative m-px grid aspect-[1.1] place-items-center border border-transparent font-display text-[13px] text-fg transition-colors',
                  isSelected && 'border-accent bg-panel-raised',
                  isToday && !isSelected && 'border-accent-2',
                  !cell.inMonth && 'text-muted opacity-40'
                )}
              >
                {cell.dayOfMonth}
                {/* Filled = something was completed that day (real history).
                    Hollow = work planned for today/a future day, nothing logged yet. */}
                {monthCompletionDays.has(cell.dayKey) ? (
                  <span
                    className="absolute bottom-1 size-[5px] rounded-full bg-accent"
                    style={{ boxShadow: '0 0 5px var(--color-accent)' }}
                  />
                ) : dayIsPlanned.get(cell.dayKey) ? (
                  <span className="absolute bottom-1 size-[5px] rounded-full border border-muted" />
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      </SystemPanel>

      <RuneDivider className="my-3" label={selected === todayKey ? 'Today' : selected} />

      {dayCompletions.length > 0 && (
        <p className="mb-2 text-center text-[13px] text-muted">{dayCompletions.length} completed</p>
      )}

      {/* Backfill. Any past day is fair game (owner's call): the point is "I did this on
          Tuesday and forgot to log it", and a limit would just make the honest case fiddly.
          Today is excluded because Today's own screen is the place to complete today. */}
      {selected <= todayKey && (
        <div className="mb-3">
          {!logOpen ? (
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="notch [--notch:6px] w-full border border-edge py-2 font-display text-[12px] uppercase tracking-[0.16em] text-accent transition-colors hover:border-accent"
            >
              + Log a quest on this day
            </button>
          ) : (
            <SystemPanel brackets={false} innerClassName="flex flex-col gap-1 px-3 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">
                  Log as completed on {selected === todayKey ? 'today' : selected}
                </span>
                <button
                  type="button"
                  onClick={() => setLogOpen(false)}
                  className="font-display text-[10px] uppercase tracking-[0.16em] text-muted hover:text-fg"
                >
                  Cancel
                </button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-[13px] text-muted">No active quests to log.</p>
              ) : (
                tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void logOnSelectedDay(t)}
                    className="notch [--notch:5px] flex items-center gap-2 border border-edge px-2.5 py-2 text-left transition-colors hover:border-accent disabled:opacity-40"
                  >
                    <CategoryIcon name={categoryOf(t.id)} size={16} className="shrink-0 text-muted" />
                    <span className="flex-1 truncate text-[14px] text-fg">{t.title}</span>
                    <span className="shrink-0 font-display text-[11px] uppercase tracking-wider text-accent">
                      {busy === t.id ? '…' : 'Log'}
                    </span>
                  </button>
                ))
              )}
            </SystemPanel>
          )}
        </div>
      )}

      {selectedTasks.length === 0 ? (
        <p className="text-[13px] text-muted">
          {dayCompletions.length
            ? `${dayCompletions.length} completion${dayCompletions.length > 1 ? 's' : ''} logged this day.`
            : 'Nothing scheduled or due.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {selectedTasks.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void navigate(`/task/${item.id}`)}
                className="notch [--notch:6px] flex w-full items-center gap-2 border border-edge bg-panel p-2 text-left transition-colors hover:bg-panel-raised"
              >
                <span
                  className="size-2 shrink-0 rotate-45"
                  style={{ backgroundColor: difficultyColors[item.difficulty] }}
                />
                <span className="flex-1 truncate text-sm text-fg">{item.title}</span>
                {completedIds.has(item.id) && <CheckIcon size={15} className="shrink-0 text-accent" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
