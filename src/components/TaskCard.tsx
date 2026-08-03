import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { SystemPanel } from './system/SystemPanel';
import { CategorySlot } from './system/CategorySlot';
import {
  CheckIcon,
  CountedIcon,
  HabitIcon,
  SkipIcon,
  StreakIcon,
  TodoIcon,
  UndoIcon,
  CategoryIcon,
} from './icons';
import { cn } from '../lib/utils';
import { gsap } from '../lib/gsap';
import { flyXp, igniteRow, ripple } from '../lib/burst';
import { colors, difficultyTextClass } from '../constants/theme';
import type { Task, TaskType } from '../types';

// The quest row.
//
// Layout, left to right: a category-tinted spine, the category's own icon, the title with its
// meta line, the reward chip, and the claim target. The icon is the *category's* now rather
// than the task type's — the type is already spelled out in the meta line, so a second glyph
// saying "habit" was redundant, whereas the category is the thing you scan a list for.
//
// The claim target is a real toggle: tapping a cleared quest un-clears it. It used to be a
// disabled button next to a text link reading "Undo", which meant the obvious gesture (tap the
// tick again) did nothing at all and the way back was a word rendered in the meta line.

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

const typeLabel: Record<TaskType, string> = { todo: 'Quest', habit: 'Daily', counted: 'Counted' };
const typeIcon: Record<TaskType, typeof TodoIcon> = {
  todo: TodoIcon,
  habit: HabitIcon,
  counted: CountedIcon,
};

// Metadata is shown only when it says something. Every task defaults to medium (Phase 1.5 hid
// the difficulty picker), so printing "Medium" on every row was five identical lines of noise.
function metaParts(task: Task, skippedToday: boolean): string[] {
  const parts: string[] = [typeLabel[task.type]];
  if (task.difficulty !== 'medium') parts.push(task.difficulty);
  if (skippedToday) parts.push('skipped');
  return parts;
}

// Icon-only verbs. They keep an aria-label and a title, so the meaning survives for screen
// readers and on hover even though the glyph carries it visually.
const verbBtn =
  'grid size-7 shrink-0 place-items-center rounded-full border border-edge text-muted transition-colors hover:border-muted hover:text-fg';

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
  // Untagged quests have no category to show, so they fall back to their type mark.
  const TypeIcon = typeIcon[task.type];
  const untagged = reward.label === 'XP';
  const tint = reward.color ?? colors.accent;
  const canSkip = task.type === 'habit' && !done && !skippedToday;
  const pct = isCounted && task.targetCount ? Math.min((progressToday / task.targetCount) * 100, 100) : 0;

  // Tapping the tick toggles: clear it, or un-clear it if it is already cleared.
  const toggleClaim = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (done || hasCompletionToday) {
      ripple(btn, colors.textSecondary);
      onUndo(task);
      return;
    }
    ripple(btn, tint);
    if (row.current) igniteRow(row.current, tint);
    flyXp(btn, reward.xp, tint);
    onComplete(task);
  };

  const logProgress = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    ripple(btn, tint);
    // A counted task only pays out on the entry that reaches the target (§7), so the shard and
    // the ignite are saved for that one — otherwise every "+1" would claim a reward the user
    // has not actually earned yet.
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
      glow={done}
      brackets={done}
      className={cn('transition-opacity', skippedToday && 'opacity-50')}
      innerClassName="flex items-stretch overflow-hidden"
      rootRef={row}
    >
      {/* Category spine — the one place colour varies, so a list is scannable at a glance. */}
      <div
        className="w-[3px] shrink-0"
        style={{ backgroundColor: tint, boxShadow: done ? `0 0 8px ${tint}` : undefined }}
      />

      <div className="grid w-14 shrink-0 place-items-center">
        <CategorySlot color={reward.color} dim={inactive}>
          {untagged ? <TypeIcon size={22} /> : <CategoryIcon name={reward.label} size={22} />}
        </CategorySlot>
      </div>

      {/* The title is the navigation target; the meta row is its sibling, not its child, so the
          secondary verbs can be real buttons (a button inside a button is invalid HTML and
          swallows the inner click in some browsers). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pr-2">
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
        </div>

        {/* Counted tasks are the only ones with a partial state worth drawing — a todo is
            binary, and its bar would always be empty or full. */}
        {isCounted && task.targetCount != null && (
          <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-1.5">
          {/* Icon verbs, only when they apply. */}
          {canSkip && (
            <button
              type="button"
              className={verbBtn}
              onClick={() => onSkip(task)}
              aria-label={`Skip ${task.title}`}
              title="Skip today"
            >
              <SkipIcon />
            </button>
          )}
          {skippedToday && (
            <button
              type="button"
              className={verbBtn}
              onClick={() => onUnskip(task)}
              aria-label={`Undo skip ${task.title}`}
              title="Undo skip"
            >
              <UndoIcon />
            </button>
          )}

          {!skippedToday && isCounted && (
            <div className="flex items-center gap-1.5">
              {hasCompletionToday && (
                <button
                  type="button"
                  className={verbBtn}
                  onClick={() => onUndo(task)}
                  aria-label={`Undo ${task.title}`}
                  title="Undo last +1"
                >
                  <UndoIcon />
                </button>
              )}
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
            </div>
          )}

          {!skippedToday && !isCounted && (
            <button
              type="button"
              onClick={toggleClaim}
              // A checkbox that is never disabled: tapping a cleared quest clears the
              // completion again. `aria-checked` carries the state, and the label changes with
              // it so a screen reader announces the action the tap will perform.
              role="checkbox"
              aria-checked={done}
              aria-label={done ? `Undo ${task.title}` : `Complete ${task.title}`}
              title={done ? 'Tap to undo' : 'Tap to complete'}
              className={cn(
                'group grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-accent transition-colors',
                done ? 'bg-accent text-bg panel-glow-strong' : 'text-accent hover:bg-accent/15'
              )}
            >
              {done && (
                <>
                  <CheckIcon className="group-hover:hidden" />
                  {/* On hover the tick becomes the undo glyph, so the toggle advertises itself
                      instead of relying on the user guessing. */}
                  <UndoIcon size={17} className="hidden group-hover:block" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </SystemPanel>
  );
}
