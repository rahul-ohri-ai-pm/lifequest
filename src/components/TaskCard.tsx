import { useNavigate } from 'react-router-dom';
import { BorderBeam } from './ui/border-beam';
import { CheckIcon } from './icons';
import { cn } from '../lib/utils';
import { colors, difficultyTextClass } from '../constants/theme';
import { xpForDifficulty } from '../engine/xp';
import type { Task } from '../types';

interface Props {
  task: Task;
  done: boolean; // strike-through state (counted: daily target reached)
  hasCompletionToday: boolean; // enables undo
  skippedToday: boolean;
  progressToday: number; // counted tasks: today's cumulative sum
  spineColor?: string | null; // first tagged category's color (§5 card accent)
  onComplete(task: Task): void;
  onUndo(task: Task): void;
  onSkip(task: Task): void;
  onUnskip(task: Task): void;
  onLogProgress(task: Task): void;
}

// Metadata is shown only when it says something. Every task defaults to medium
// (Phase 1.5 hid the difficulty picker), so printing "Medium · 25 XP" on every row was
// five identical lines of noise — difficulty appears only when the user actually changed
// it, and then it carries its rarity color (§5).
function metaParts(task: Task, progressToday: number, skippedToday: boolean): string[] {
  const parts: string[] = [];
  if (task.type === 'counted' && task.targetCount != null) {
    parts.push(`${progressToday}/${task.targetCount}`);
  }
  if (task.difficulty !== 'medium') parts.push(task.difficulty);
  if (skippedToday) parts.push('skipped');
  return parts;
}

const ghost =
  'rounded border border-edge px-2 py-1 text-xs text-muted transition-colors hover:border-muted hover:text-fg';

export function TaskCard({
  task,
  done,
  hasCompletionToday,
  skippedToday,
  progressToday,
  spineColor,
  onComplete,
  onUndo,
  onSkip,
  onUnskip,
  onLogProgress,
}: Props) {
  const navigate = useNavigate();
  const inactive = done || skippedToday;
  const isCounted = task.type === 'counted' && task.targetCount != null;
  const parts = metaParts(task, progressToday, skippedToday);
  const xp = xpForDifficulty(task.difficulty);

  return (
    <div
      className={cn(
        'relative flex min-h-[68px] items-stretch overflow-hidden rounded-lg border bg-panel',
        done ? 'border-accent bg-panel-raised' : 'border-edge',
        skippedToday && 'opacity-50'
      )}
    >
      {/* Completing something is the point of the app, so the card marks it loudly —
          this is the one place a beam is justified (§5: if everything glows, nothing does). */}
      {done && <BorderBeam size={70} duration={5} colorFrom={colors.accent} colorTo={colors.accentSecondary} />}

      {/* Category spine — the one place color varies, so a list of quests is scannable
          at a glance without turning every card into a rainbow. */}
      <div className="w-[3px] shrink-0" style={{ backgroundColor: spineColor ?? colors.panelBorder }} />

      <button
        type="button"
        onClick={() => void navigate(`/task/${task.id}`)}
        className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 text-left"
      >
        <span className={cn('line-clamp-2 text-[17px] text-fg', inactive && 'text-muted line-through')}>
          {task.title}
        </span>
        <span className="mt-[3px] flex items-center gap-1">
          <span
            className={cn(
              'font-display text-xs tracking-wide',
              task.difficulty === 'medium' ? 'text-muted' : difficultyTextClass[task.difficulty]
            )}
          >
            {xp} XP
          </span>
          {parts.map((p) => (
            <span key={p} className="text-xs capitalize text-muted">
              · {p}
            </span>
          ))}
        </span>
      </button>

      <div className="flex items-center gap-1 px-4">
        {/* Secondary verbs are real buttons, not underlined text that reads as a broken
            link. They stay quiet until the row needs them. */}
        {hasCompletionToday && (
          <button type="button" className={ghost} onClick={() => onUndo(task)} aria-label={`Undo ${task.title}`}>
            Undo
          </button>
        )}
        {/* §4 Skip: offered only for habits on their scheduled days */}
        {task.type === 'habit' && !done && !skippedToday && (
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

        {/* The primary action: a 40px target that fills and glows when it lands. */}
        {!skippedToday && isCounted && (
          <button
            type="button"
            onClick={() => onLogProgress(task)}
            aria-label={`Log progress on ${task.title}`}
            className={cn(
              'grid h-10 w-12 shrink-0 place-items-center rounded-xl border-2 border-accent font-display text-sm transition-all',
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
              'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-accent transition-all',
              done ? 'bg-accent text-bg panel-glow-strong' : 'text-accent hover:bg-accent/15'
            )}
          >
            {done && <CheckIcon />}
          </button>
        )}
      </div>
    </div>
  );
}
