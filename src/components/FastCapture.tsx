import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SystemPanel } from './system/SystemPanel';
import { SkillChips } from './SkillChips';
import { orderSkillsByMru, useSkillStore } from '../store/useSkillStore';
import { cn } from '../lib/utils';
import type { Schedule, TaskType } from '../types';
import type { NewTask } from '../db/queries/tasks';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay()

interface Props {
  onAdd(input: NewTask, skillIds: string[]): void;
}

// §2 fast capture, reworked per Phase 1.5: title is the only required field. Schedule and
// target are orthogonal toggles — no type picker, no difficulty picker (difficulty defaults
// to medium; editable on the task's edit screen).
//
// The options now stay folded until the field is touched. Fully expanded, eight category
// chips and two toggles filled roughly the top third of Today before a single quest was
// visible — which is backwards for a screen whose job is showing the quest log. Capture
// itself is untouched and still one gesture: type a title, press Add.
export function FastCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
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
    setExpanded(false);
  };

  const toggleSkill = (id: string) =>
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const input =
    'w-full border-b border-accent/60 bg-transparent py-1.5 text-base text-fg outline-none placeholder:text-muted focus:border-accent';
  const toggle = 'notch [--notch:5px] border px-2 py-1 text-[13px] transition-colors';

  return (
    <form
      className="m-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SystemPanel glow innerClassName="relative flex flex-col gap-2 overflow-hidden px-4 py-3">
        <span className="font-display text-[11px] uppercase tracking-[0.24em] text-muted">New quest</span>

        <div className="flex items-center gap-2">
          <input
            className={input}
            placeholder="What needs doing?"
            value={title}
            onFocus={() => setExpanded(true)}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Quest title"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="notch [--notch:6px] shrink-0 bg-accent px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.12em] text-bg transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            + Add
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="options"
              className="flex flex-col gap-2 overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <SkillChips skills={orderedSkills} selected={skillIds} onToggle={toggleSkill} />

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  aria-pressed={repeat}
                  onClick={() => setRepeat(!repeat)}
                  className={cn(toggle, repeat ? 'border-accent bg-accent/15 text-accent' : 'border-edge text-muted')}
                >
                  ↻ Repeat
                </button>
                <button
                  type="button"
                  aria-pressed={counted}
                  onClick={() => setCounted(!counted)}
                  className={cn(toggle, counted ? 'border-accent bg-accent/15 text-accent' : 'border-edge text-muted')}
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
                        days.includes(d) ? 'border-accent bg-accent text-bg' : 'border-edge text-muted'
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
            </motion.div>
          )}
        </AnimatePresence>
      </SystemPanel>
    </form>
  );
}
