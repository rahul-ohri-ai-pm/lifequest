import { useMemo, useState } from 'react';
import { BorderBeam } from './ui/border-beam';
import { SkillChips } from './SkillChips';
import { orderSkillsByMru, useSkillStore } from '../store/useSkillStore';
import { cn } from '../lib/utils';
import { colors } from '../constants/theme';
import type { Schedule, TaskType } from '../types';
import type { NewTask } from '../db/queries/tasks';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay()

interface Props {
  onAdd(input: NewTask, skillIds: string[]): void;
}

// §2 fast capture, reworked per Phase 1.5: title is the only required field. Schedule and
// target are orthogonal toggles — no type picker, no difficulty picker (difficulty
// defaults to medium; editable on the task's edit screen).
export function FastCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [days, setDays] = useState<number[]>([]); // empty = daily
  const [counted, setCounted] = useState(false);
  const [target, setTarget] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);
  // Subscribe to the raw state and derive here: a selector returning a fresh array on
  // every render loops forever under zustand v5 (see orderSkillsByMru).
  const skills = useSkillStore((s) => s.skills);
  const mru = useSkillStore((s) => s.mru);
  const orderedSkills = useMemo(() => orderSkillsByMru(skills, mru), [skills, mru]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const schedule: Schedule | null = repeat
      ? days.length
        ? { freq: 'custom', days: [...days].sort() }
        : { freq: 'daily' }
      : null;
    const targetCount = counted ? Math.max(1, parseInt(target, 10) || 1) : null;
    const type: TaskType = counted ? 'counted' : repeat ? 'habit' : 'todo';
    onAdd({ title: trimmed, difficulty: 'medium', type, schedule, targetCount }, skillIds);
    setTitle('');
    setRepeat(false);
    setDays([]);
    setCounted(false);
    setTarget('');
    setSkillIds([]);
  };

  const toggleSkill = (id: string) =>
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const input =
    'w-full border-b border-accent bg-transparent py-2 text-base text-fg outline-none placeholder:text-muted';
  const toggle = 'rounded border px-2 py-1 text-[13px] transition-colors';

  return (
    <form
      className="relative m-4 flex flex-col gap-2 overflow-hidden rounded-lg bg-panel p-4 panel-glow"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <BorderBeam size={90} duration={9} colorFrom={colors.accent} colorTo={colors.accentSecondary} />

      <input
        className={input}
        placeholder="New quest…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Quest title"
      />
      <SkillChips skills={orderedSkills} selected={skillIds} onToggle={toggleSkill} />

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-pressed={repeat}
          onClick={() => setRepeat(!repeat)}
          className={cn(toggle, repeat ? 'border-accent bg-accent/15 text-accent' : 'border-muted text-muted')}
        >
          ↻ Repeat
        </button>
        <button
          type="button"
          aria-pressed={counted}
          onClick={() => setCounted(!counted)}
          className={cn(toggle, counted ? 'border-accent bg-accent/15 text-accent' : 'border-muted text-muted')}
        >
          # Count to target
        </button>
      </div>

      {repeat && (
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
                days.includes(d) ? 'border-accent bg-accent text-bg' : 'border-muted text-muted'
              )}
            >
              {label}
            </button>
          ))}
          {!days.length && <span className="ml-1 text-xs text-muted">every day</span>}
        </div>
      )}

      {counted && (
        <input
          className={input}
          placeholder="Daily target (e.g. 8)"
          value={target}
          inputMode="numeric"
          onChange={(e) => setTarget(e.target.value)}
          aria-label="Daily target"
        />
      )}

      <button
        type="submit"
        className="rounded bg-accent py-2 text-[15px] font-bold text-bg transition-opacity hover:opacity-90"
      >
        + Add
      </button>
    </form>
  );
}
