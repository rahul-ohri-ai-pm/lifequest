import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { monthGrid } from '../engine/calendar';
import { dateFromDayKey, dayKeyFor, dayWindow, isScheduledDay } from '../engine/time';
import { getCompletionsBetween } from '../db/queries/completions';
import { useTaskStore } from '../store/useTaskStore';
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

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState(todayKey);
  const [dayCompletions, setDayCompletions] = useState<Completion[]>([]);

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
  }, [grid]);

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

  useEffect(() => {
    const { startIso, endIso } = dayWindow(dateFromDayKey(selected));
    void getCompletionsBetween(startIso, endIso).then(setDayCompletions);
  }, [selected]);

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
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} aria-label="Previous month" className="p-2 text-accent">
          <ChevronLeftIcon />
        </button>
        <h2 className="font-display text-lg text-fg">
          {MONTHS[month]} {year}
        </h2>
        <button type="button" onClick={nextMonth} aria-label="Next month" className="p-2 text-accent">
          <ChevronRightIcon />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[11px] text-muted">
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
                onClick={() => setSelected(cell.dayKey)}
                className={cn(
                  'relative m-px grid aspect-[1.1] place-items-center rounded border border-transparent text-[13px] text-fg transition-colors',
                  isSelected && 'border-accent bg-panel',
                  isToday && !isSelected && 'border-accent-2',
                  !cell.inMonth && 'text-muted opacity-40'
                )}
              >
                {cell.dayOfMonth}
                {/* Filled = something was completed that day (real history).
                    Hollow = work planned for today/a future day, nothing logged yet. */}
                {monthCompletionDays.has(cell.dayKey) ? (
                  <span className="absolute bottom-1 size-[5px] rounded-full bg-accent" />
                ) : dayIsPlanned.get(cell.dayKey) ? (
                  <span className="absolute bottom-1 size-[5px] rounded-full border border-muted" />
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      <p className="mt-4 mb-2 text-[13px] text-muted">
        {selected === todayKey ? 'Today' : selected}
        {dayCompletions.length > 0 ? ` · ${dayCompletions.length} completed` : ''}
      </p>

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
                className="flex w-full items-center gap-2 rounded bg-panel p-2 text-left transition-colors hover:bg-panel-raised"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: difficultyColors[item.difficulty] }}
                />
                <span className="flex-1 truncate text-sm text-fg">{item.title}</span>
                {completedIds.has(item.id) && <span className="font-bold text-accent">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
