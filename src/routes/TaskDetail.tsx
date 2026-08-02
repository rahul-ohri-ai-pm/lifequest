import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { SkillChips } from '../components/SkillChips';
import { SystemPanel } from '../components/system/SystemPanel';
import { useTaskStore } from '../store/useTaskStore';
import { useSkillStore } from '../store/useSkillStore';
import { addDays, dateFromDayKey, dayKeyFor } from '../engine/time';
import { cn } from '../lib/utils';
import { gsap, useGsap } from '../lib/gsap';
import { difficultyColors } from '../constants/theme';
import type { Difficulty, Schedule, TaskType } from '../types';

const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard', 'epic'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const inputClass =
  'w-full border-b border-accent/60 bg-transparent py-1 text-base text-fg outline-none placeholder:text-muted focus:border-accent';
const labelClass =
  'mt-2 block font-display text-[11px] uppercase tracking-[0.18em] text-muted';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement | null>(null);
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useTaskStore((s) => s.updateTask);
  const archiveTask = useTaskStore((s) => s.archiveTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(task?.difficulty ?? 'easy');
  // Repeatability is a real, editable field — a todo can become a habit and back again.
  // Seeded from whether the task currently carries a schedule at all.
  const [repeat, setRepeat] = useState(task?.schedule != null);
  const [days, setDays] = useState<number[]>(
    task?.schedule?.freq === 'custom' ? task.schedule.days : []
  );
  const [target, setTarget] = useState(task?.targetCount ? String(task.targetCount) : '');
  const [due, setDue] = useState(task?.dueAt ? dayKeyFor(new Date(task.dueAt)) : '');
  const [saved, setSaved] = useState(false);
  const skills = useSkillStore((s) => s.skills);
  const tagTask = useSkillStore((s) => s.tagTask);
  const [skillIds, setSkillIds] = useState<string[]>(
    useSkillStore.getState().taskSkills[id ?? ''] ?? []
  );

  useGsap(
    root,
    () => {
      const panel = root.current?.firstElementChild;
      if (!panel) return;
      gsap
        .timeline()
        .fromTo(
          panel,
          { scaleY: 0.02, opacity: 0, transformOrigin: '50% 30%' },
          { scaleY: 1, opacity: 1, duration: 0.42, ease: 'power4.out' }
        )
        .fromTo(
          '[data-field]',
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.36, stagger: 0.045, ease: 'power2.out', clearProps: 'transform' },
          '-=0.18'
        );
    },
    [id]
  );

  if (!task) {
    return <p className="p-4 text-xs text-muted">Task not found (it may be archived).</p>;
  }

  const dueValid = due === '' || DAY_KEY_RE.test(due);
  const canSave = title.trim().length > 0 && dueValid;

  const onSave = async () => {
    // Mirrors the capture form so the two screens cannot disagree: Repeat drives the
    // schedule (empty days = daily), and the type follows from it. Counted stays counted —
    // for those, a schedule is orthogonal (Phase 1.5) and the toggle only adds or clears it.
    const schedule: Schedule | null = repeat
      ? days.length
        ? { freq: 'custom', days: [...days].sort() }
        : { freq: 'daily' }
      : null;
    const nextType: TaskType = task.type === 'counted' ? 'counted' : repeat ? 'habit' : 'todo';
    await updateTask(
      task.id,
      {
        title: title.trim(),
        notes: notes.trim() || null,
        type: nextType,
        difficulty,
        schedule,
        targetCount: task.type === 'counted' ? Math.max(1, parseInt(target, 10) || 1) : null,
        dueAt: due ? dateFromDayKey(due).toISOString() : null,
      },
      new Date()
    );
    await tagTask(task.id, skillIds);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // §4 Snooze: push due_at forward without touching completion history
  const snooze = async (byDays: number) => {
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    const next = addDays(base, byDays);
    await updateTask(task.id, { dueAt: next.toISOString() }, new Date());
    setDue(dayKeyFor(next));
  };

  const onArchive = async () => {
    await archiveTask(task.id, new Date());
    void navigate(-1);
  };

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));


  return (
    // The quest expands into its detail: the panel unfolds from a seam the width of the row
    // that was tapped, then the fields deal themselves in. It reads as the same object opening
    // rather than a new screen arriving.
    <div ref={root} className="p-4 pb-8" style={{ perspective: 1200 }}>
      <SystemPanel glow innerClassName="flex flex-col gap-2 px-5 py-5">
        <label data-field className={labelClass}>
          Title
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label data-field className={labelClass}>
          Notes
          <textarea
            className={cn(inputClass, 'min-h-[60px] resize-y')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <span data-field className={labelClass}>Categories (XP splits across them)</span>
        <SkillChips
          skills={skills}
          selected={skillIds}
          onToggle={(sid) =>
            setSkillIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]))
          }
        />

        <span data-field className={labelClass}>Difficulty</span>
        <div className="flex flex-wrap items-center gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(d)}
              className="notch [--notch:4px] border px-2 py-1 font-display text-xs uppercase tracking-wider transition-colors"
              style={{
                borderColor: difficultyColors[d],
                color: difficultyColors[d],
                backgroundColor: difficulty === d ? `${difficultyColors[d]}33` : 'transparent',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <span data-field className={labelClass}>Repeats</span>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            aria-pressed={repeat}
            onClick={() => setRepeat(!repeat)}
            className={cn(
              'notch [--notch:5px] border px-2 py-1 font-display text-xs uppercase tracking-wider transition-colors',
              repeat ? 'border-accent bg-accent/15 text-accent' : 'border-edge text-muted'
            )}
          >
            ↻ Repeat
          </button>
          <span className="ml-1 text-xs text-muted">
            {repeat ? 'shows on its scheduled days' : 'one-off quest'}
          </span>
        </div>

        {repeat && (
          <>
            <span className={labelClass}>Scheduled days {days.length ? '' : '(every day)'}</span>
            <div className="flex flex-wrap items-center gap-1">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(d)}
                  aria-label={`Toggle day ${d}`}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'grid size-7 place-items-center rounded-full border text-xs transition-colors',
                    days.includes(d) ? 'border-accent bg-accent text-bg' : 'border-edge text-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {task.type === 'counted' && (
          <label className={labelClass}>
            Daily target
            <input
              className={inputClass}
              value={target}
              inputMode="numeric"
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
        )}

        <label data-field className={labelClass}>
          Due date (YYYY-MM-DD)
          <input
            className={cn(inputClass, !dueValid && 'border-danger')}
            value={due}
            onChange={(e) => setDue(e.target.value)}
            placeholder="None"
            autoCapitalize="none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => void snooze(1)}
            className="notch [--notch:5px] border border-accent-2 px-2 py-1 font-display text-xs uppercase tracking-wider text-accent-2 transition-colors hover:bg-accent-2/15"
          >
            Snooze +1d
          </button>
          <button
            type="button"
            onClick={() => void snooze(7)}
            className="notch [--notch:5px] border border-accent-2 px-2 py-1 font-display text-xs uppercase tracking-wider text-accent-2 transition-colors hover:bg-accent-2/15"
          >
            Snooze +1w
          </button>
        </div>

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!canSave}
          className="notch [--notch:6px] mt-4 bg-accent py-2 font-display text-[15px] font-bold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saved ? 'Saved ✓' : 'Save'}
        </button>
      </SystemPanel>

      <button
        type="button"
        onClick={() => void onArchive()}
        className="notch [--notch:6px] mt-6 w-full border border-edge py-2 font-display text-[15px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-fg hover:text-fg"
      >
        Archive
      </button>
      <p className="mt-2 text-xs text-muted">
        Archiving hides this quest but keeps all history. Restore from Profile → Archived.
      </p>
    </div>
  );
}
