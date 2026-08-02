import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { SystemPanel } from './system/SystemPanel';
import { CheckIcon, CountedIcon, HabitIcon, TodoIcon } from './icons';
import { cn } from '../lib/utils';
import { colors, difficultyTextClass } from '../constants/theme';
import type { Task, TaskType } from '../types';

// The quest row from the design reference: a framed system window laid out as
//   [type mark] │ [title + progress] │ [reward tag] [claim target]
// The reference's `+5 STRENGTH` tag is the piece that makes a task list read as a quest
// log, so it renders real data — the XP this completion will actually award, credited to
// the skill it will actually go to (see the `reward` prop, computed in Today.tsx from the
// engine's `splitSkillXp`).

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

// Metadata is shown only when it says something. Every task defaults to medium (Phase 1.5
// hid the difficulty picker), so printing "Medium" on every row was five identical lines of
// noise — difficulty appears only when the user actually changed it, and then it carries
// its rarity color (§5).
function metaParts(task: Task, skippedToday: boolean): string[] {
  const parts: string[] = [];
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
  onComplete,
  onUndo,
  onSkip,
  onUnskip,
  onLogProgress,
}: Props) {
  const navigate = useNavigate();
  const inactive = done || skippedToday;
  const isCounted = task.type === 'counted' && task.targetCount != null;
  const parts = metaParts(task, skippedToday);
  const Icon = typeIcon[task.type];
  const tint = reward.color ?? colors.accent;
  const canSkip = task.type === 'habit' && !done && !skippedToday;
  const showMetaRow = isCounted || parts.length > 0 || hasCompletionToday || canSkip || skippedToday;

  return (
    <SystemPanel
      // Every row is framed, as in the reference — the frame is what makes a list read as a
      // quest log rather than as a to-do list. A *completed* row adds the bloom and the corner
      // brackets, which is enough to stand out at a glance. It used to add a BorderBeam too,
      // but that is an infinite animation *per row*: ten cleared quests meant ten of them
      // running forever, and §5 reserves the beam for the one element that is the moment.
      glow={done}
      brackets={done}
      className={cn('transition-opacity', skippedToday && 'opacity-50')}
      innerClassName="flex items-stretch overflow-hidden"
    >
      {/* Category spine — the one place color varies, so a list of quests is scannable at a
          glance without turning every row into a rainbow. */}
      <div className="w-[3px] shrink-0" style={{ backgroundColor: tint }} />

      <div
        className="grid w-10 shrink-0 place-items-center border-r text-muted"
        style={{ borderColor: `${colors.panelBorder}99` }}
      >
        <Icon className={done ? 'text-accent' : undefined} />
      </div>

      {/* The title is the navigation target; the meta row is its sibling, not its child, so
          the secondary verbs can be real buttons (a button inside a button is invalid HTML
          and swallows the inner click in some browsers). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-2.5 pl-3 pr-2">
        <button
          type="button"
          onClick={() => void navigate(`/task/${task.id}`)}
          className="min-w-0 text-left"
        >
          <span className={cn('line-clamp-2 text-[16px] leading-snug text-fg', inactive && 'text-muted line-through')}>
            {task.title}
          </span>
        </button>

        {showMetaRow && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* The reference's inline `0/100` bar. Counted tasks are the only ones with a
                partial state worth drawing — a todo is binary, and its bar would always be
                empty or full, which is what the claim target already says. */}
            {isCounted && task.targetCount != null && (
              <span className="flex min-w-20 flex-1 items-center gap-1.5">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full border border-edge bg-bg-alt">
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ backgroundColor: tint, boxShadow: `0 0 6px ${tint}` }}
                    initial={false}
                    animate={{ width: `${Math.min((progressToday / task.targetCount) * 100, 100)}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                </span>
                <span className="font-display text-[11px] tabular-nums text-muted">
                  {progressToday}/{task.targetCount}
                </span>
              </span>
            )}

            {parts.map((p) => (
              <span
                key={p}
                className={cn(
                  'text-[11px] capitalize',
                  p === task.difficulty ? difficultyTextClass[task.difficulty] : 'text-muted'
                )}
              >
                {p}
              </span>
            ))}

            {/* Secondary verbs sit on the meta line rather than beside the claim target, so
                the primary action is never one of three same-sized things. */}
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
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 pr-2.5">
        {/* The reference's `+5 STRENGTH` reward tag. */}
        <span
          className="notch-diag px-1.5 py-1 text-right font-display text-[11px] uppercase leading-tight tracking-wider"
          style={{ color: tint, backgroundColor: `${tint}1a` }}
        >
          <span className="block tabular-nums">+{reward.xp}</span>
          <span className="block max-w-14 truncate opacity-70">{reward.label}</span>
        </span>

        {/* The primary action: a 40px target that fills and glows when it lands. */}
        {!skippedToday && isCounted && (
          <button
            type="button"
            onClick={() => onLogProgress(task)}
            aria-label={`Log progress on ${task.title}`}
            className={cn(
              'notch [--notch:6px] grid h-10 w-12 shrink-0 place-items-center border-2 border-accent font-display text-sm transition-all active:scale-95',
              done ? 'bg-accent text-bg panel-glow-strong' : 'text-accent hover:bg-accent/15'
            )}
          >
            {done ? <CheckIcon /> : '+1'}
          </button>
        )}
        {!skippedToday && !isCounted && (
          <button
            type="button"
            onClick={() => onComplete(task)}
            disabled={done}
            aria-label={`Complete ${task.title}`}
            aria-checked={done}
            role="checkbox"
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-accent transition-all active:scale-95',
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
