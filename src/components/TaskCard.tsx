import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { SystemPanel } from './system/SystemPanel';
import { CheckIcon, CountedIcon, HabitIcon, StreakIcon, TodoIcon } from './icons';
import { cn } from '../lib/utils';
import { gsap } from '../lib/gsap';
import { flyXp, igniteRow, ripple } from '../lib/burst';
import { colors, difficultyTextClass } from '../constants/theme';
import type { Task, TaskType } from '../types';

// The quest row: [rank mark] │ [title + progress] │ [reward] [claim target].
//
// Clearing a quest is the single most-repeated action in the app, so it gets the most
// attention: the row ignites, a ring pulses at the point of contact, and a shard carrying the
// XP arcs up into the status rail, which flinches when it lands. Roughly 700ms end to end,
// none of it blocking — the database write has already happened by the time it plays.

export interface Reward {
  xp: number;
  /** Skill name when the task is tagged, otherwise `XP`. */
  label: string;
  color: string | null;
}

interface Props {
  task: Task;
  done: boolean; // strike-through state (counted: daily target reached)
  hasCompletionToday: boolean; // enables undo
  skippedToday: boolean;
  progressToday: number; // counted tasks: today's cumulative sum
  reward: Reward;
  /** Per-habit streak length; undefined for tasks that cannot have one (§7). */
  streak?: number;
  onComplete(task: Task): void;
  onUndo(task: Task): void;
  onSkip(task: Task): void;
  onUnskip(task: Task): void;
  onLogProgress(task: Task): void;
}

const typeIcon: Record<TaskType, typeof TodoIcon> = {
  todo: TodoIcon,
  habit: HabitIcon,
  counted: CountedIcon,
};

const typeLabel: Record<TaskType, string> = { todo: 'Quest', habit: 'Daily', counted: 'Counted' };

// Metadata is shown only when it says something. Every task defaults to medium (Phase 1.5
// hid the difficulty picker), so printing "Medium" on every row was five identical lines of
// noise — difficulty appears only when the user actually changed it, carrying its rarity
// color (§5).
function metaParts(task: Task, skippedToday: boolean): string[] {
  const parts: string[] = [typeLabel[task.type]];
  if (task.difficulty !== 'medium') parts.push(task.difficulty);
  if (skippedToday) parts.push('skipped');
  return parts;
}

const ghost =
  'notch [--notch:5px] border border-edge px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-muted hover:text-fg';

export function TaskCard({
  task,
  done,
  hasCompletionToday,
  skippedToday,
  progressToday,
  reward,
  streak,
  onComplete,
  onUndo,
  onSkip,
  onUnskip,
  onLogProgress,
}: Props) {
  const navigate = useNavigate();
  const row = useRef<HTMLDivElement | null>(null);
  const inactive = done || skippedToday;
  const isCounted = task.type === 'counted' && task.targetCount != null;
  const parts = metaParts(task, skippedToday);
  const Icon = typeIcon[task.type];
  const tint = reward.color ?? colors.accent;
  const canSkip = task.type === 'habit' && !done && !skippedToday;
  const pct = isCounted && task.targetCount ? Math.min((progressToday / task.targetCount) * 100, 100) : 0;

  const celebrate = (btn: HTMLElement) => {
    ripple(btn, tint);
    if (row.current) igniteRow(row.current, tint);
    flyXp(btn, reward.xp, tint);
  };

  const claim = (e: React.MouseEvent<HTMLButtonElement>) => {
    celebrate(e.currentTarget);
    onComplete(task);
  };

  const logProgress = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    ripple(btn, tint);
    // A counted task only pays out on the entry that reaches the target (§7), so the shard
    // and the ignite are saved for that one — otherwise every "+1" would claim a reward the
    // user has not actually earned yet.
    const willComplete = task.targetCount != null && progressToday + 1 >= task.targetCount;
    if (willComplete) {
      if (row.current) igniteRow(row.current, tint);
      flyXp(btn, reward.xp, tint);
    } else {
      gsap.fromTo(btn, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' });
    }
    onLogProgress(task);
  };

  return (
    <SystemPanel
      // Every row is framed, as in the reference — the frame is what makes a list read as a
      // quest log rather than a to-do list. A cleared row adds bloom and corner brackets.
      glow={done}
      brackets={done}
      className={cn('transition-opacity', skippedToday && 'opacity-50')}
      innerClassName="flex items-stretch overflow-hidden"
      rootRef={row}
    >
        {/* Rank spine — the one place colour varies, so a list is scannable at a glance. */}
        <div
          className="w-[3px] shrink-0"
          style={{ backgroundColor: tint, boxShadow: done ? `0 0 8px ${tint}` : undefined }}
        />

        <div
          className="grid w-11 shrink-0 place-items-center border-r"
          style={{ borderColor: `${colors.panelBorder}99` }}
        >
          <Icon className={done ? 'text-accent' : 'text-muted'} />
        </div>

        {/* The title is the navigation target; the meta row is its sibling, not its child, so
            the secondary verbs can be real buttons (a button inside a button is invalid HTML
            and swallows the inner click in some browsers). */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pl-3 pr-2">
          <button type="button" onClick={() => void navigate(`/task/${task.id}`)} className="min-w-0 text-left">
            <span
              className={cn(
                'line-clamp-2 text-[17px] leading-snug tracking-tight text-fg',
                inactive && 'text-muted line-through'
              )}
            >
              {task.title}
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {parts.map((p, i) => (
              <span
                key={p}
                className={cn(
                  'font-display text-[10px] uppercase tracking-[0.14em]',
                  p === task.difficulty ? difficultyTextClass[task.difficulty] : 'text-muted',
                  i > 0 && 'before:mr-2 before:content-["·"]'
                )}
              >
                {p}
              </span>
            ))}

            {streak != null && streak > 0 && (
              <span
                className="flex items-center gap-1 font-display text-[10px] uppercase tracking-[0.14em] text-epic"
                title={`${streak}-day streak`}
              >
                <StreakIcon size={12} />
                {streak}
              </span>
            )}

            {hasCompletionToday && (
              <button type="button" className={ghost} onClick={() => onUndo(task)} aria-label={`Undo ${task.title}`}>
                Undo
              </button>
            )}
            {canSkip && (
              <button type="button" className={ghost} onClick={() => onSkip(task)} aria-label={`Skip ${task.title}`}>
                Skip
              </button>
            )}
            {skippedToday && (
              <button
                type="button"
                className={ghost}
                onClick={() => onUnskip(task)}
                aria-label={`Undo skip ${task.title}`}
              >
                Undo skip
              </button>
            )}
          </div>

          {/* Counted tasks are the only ones with a partial state worth drawing — a todo is
              binary, and its bar would always be empty or full. */}
          {isCounted && task.targetCount != null && (
            <div className="mt-0.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-alt">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: tint, boxShadow: `0 0 6px ${tint}` }}
                />
              </div>
              <span className="font-display text-[10px] tabular-nums text-muted">
                {progressToday}/{task.targetCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 py-3 pr-3">
          <span
            className="notch-diag px-2 py-1 text-right font-display text-[11px] uppercase leading-tight tracking-wider"
            style={{ color: tint, backgroundColor: `${tint}1a` }}
          >
            <span className="block text-[15px] font-bold tabular-nums leading-none">+{reward.xp}</span>
            <span className="mt-0.5 block max-w-16 truncate text-[9px] opacity-70">{reward.label}</span>
          </span>

          {!skippedToday && isCounted && (
            <button
              type="button"
              onClick={logProgress}
              aria-label={`Log progress on ${task.title}`}
              className={cn(
                'notch [--notch:6px] grid h-9 w-12 shrink-0 place-items-center border-2 border-accent font-display text-sm transition-colors',
                done ? 'bg-accent text-bg panel-glow-strong' : 'text-accent hover:bg-accent/15'
              )}
            >
              {done ? <CheckIcon /> : '+1'}
            </button>
          )}
          {!skippedToday && !isCounted && (
            <button
              type="button"
              onClick={claim}
              disabled={done}
              aria-label={`Complete ${task.title}`}
              aria-checked={done}
              role="checkbox"
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-accent transition-colors',
                done ? 'bg-accent text-bg panel-glow-strong' : 'text-accent hover:bg-accent/15'
              )}
            >
              {done && <CheckIcon />}
            </button>
          )}
        </div>
    </SystemPanel>
  );
}
