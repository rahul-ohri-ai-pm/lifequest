import { useEffect, useState } from 'react';
import { BarList, StatPanel, TileRow } from '../components/StatPanel';
import { NumberTicker } from '../components/ui/number-ticker';
import { getAllCompletions } from '../db/queries/completions';
import { getAllSkips } from '../db/queries/skips';
import { useCharacterStore } from '../store/useCharacterStore';
import { useSkillStore } from '../store/useSkillStore';
import { useTaskStore } from '../store/useTaskStore';
import { levelProgress } from '../engine/xp';
import { isScheduledDay } from '../engine/time';
import {
  activeDaysInLast,
  distinctActiveDays,
  lastNDayCounts,
  scheduledOutcomes,
  skillBreakdown,
  topTasks,
  xpOnDay,
} from '../engine/stats';
import { cn } from '../lib/utils';
import { colors, difficultyColors } from '../constants/theme';
import type { Completion, Skip } from '../types';

const RANGES = [
  { label: '7d', days: 7 as number | null },
  { label: '30d', days: 30 as number | null },
  { label: 'All', days: null as number | null },
];

export default function Stats() {
  const tasks = useTaskStore((s) => s.tasks);
  const character = useCharacterStore((s) => s.character);
  const skills = useSkillStore((s) => s.skills);
  const taskSkills = useSkillStore((s) => s.taskSkills);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [skips, setSkips] = useState<Skip[]>([]);
  const [rangeIdx, setRangeIdx] = useState(1); // default 30d

  // The route unmounts when you navigate away, so a mount-time load is the refresh —
  // stats are always derived on read (§4), never cached.
  useEffect(() => {
    void getAllCompletions().then(setCompletions);
    void getAllSkips().then(setSkips);
  }, []);

  const now = new Date();
  const p = character ? levelProgress(character.totalXp) : null;

  // Hero numbers
  const doneToday = lastNDayCounts(completions, 1, now)[0]?.count ?? 0;
  const plannedToday = tasks.filter(
    (t) => t.type !== 'habit' || !t.schedule || isScheduledDay(t.schedule, now)
  ).length;
  const xpToday = xpOnDay(completions, now);

  // Panels
  const days14 = lastNDayCounts(completions, 14, now);
  const max14 = Math.max(...days14.map((d) => d.count), 1);
  const rate = scheduledOutcomes(tasks, completions, skips, 30, now);
  const ratePct = rate.scheduled ? Math.round((rate.done / rate.scheduled) * 100) : null;
  const range = RANGES[rangeIdx];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const top = topTasks(completions, range.days, now).map((s) => {
    const task = taskById.get(s.taskId);
    return {
      label: task?.title ?? 'Archived task',
      value: s.count,
      color: task ? difficultyColors[task.difficulty] : colors.textSecondary,
      detail: `${s.count}× · ${s.xp} XP`,
    };
  });

  const links = Object.entries(taskSkills).flatMap(([taskId, ids]) =>
    ids.map((skillId) => ({ taskId, skillId }))
  );
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const byCategory = skillBreakdown(completions, links, range.days, now).map((agg) => {
    const skill = skillById.get(agg.skillId);
    return {
      label: skill ? `${skill.name} · Lv ${skill.level}` : 'Unknown',
      value: agg.xp,
      color: skill?.color ?? colors.accent,
      detail: `${agg.count}× · ${agg.xp} XP`,
    };
  });

  return (
    <div className="py-4">
      <StatPanel title="Today">
        <TileRow
          tiles={[
            { value: `${doneToday}/${plannedToday}`, label: 'done / planned' },
            { value: <NumberTicker value={xpToday} />, label: 'XP today' },
            { value: `${p?.level ?? 1}`, label: 'level' },
          ]}
        />
        {p && (
          // The track carries a border: an unbordered near-black bar on a near-black panel
          // read as a render glitch rather than as an empty progress bar.
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-edge bg-bg-alt">
            <div
              className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-500"
              style={{ width: `${Math.min(p.progress * 100, 100)}%` }}
            />
          </div>
        )}
      </StatPanel>

      <StatPanel title="Last 14 days">
        <div className="flex h-20 items-end gap-[3px]">
          {days14.map((d, i) => (
            <div key={d.dayKey} className="flex h-full flex-1 items-end">
              <div
                className={cn(
                  'w-full min-h-[2px] rounded-sm transition-[height] duration-500',
                  i === days14.length - 1 ? 'bg-accent-2' : 'bg-accent',
                  d.count === 0 && 'opacity-15'
                )}
                style={{ height: `${(d.count / max14) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{days14[0].dayKey.slice(5)}</span>
          <span>today</span>
        </div>
      </StatPanel>

      <StatPanel title="Active days">
        <TileRow
          tiles={[
            { value: `${activeDaysInLast(completions, 7, now)}/7`, label: 'last 7 days' },
            { value: `${activeDaysInLast(completions, 30, now)}/30`, label: 'last 30 days' },
            { value: `${distinctActiveDays(completions)}`, label: 'all time' },
          ]}
        />
      </StatPanel>

      <StatPanel title="Habit follow-through · 30 days">
        {ratePct === null ? (
          <p className="text-xs text-muted">No scheduled habits yet — add one with a Repeat schedule.</p>
        ) : (
          <>
            <p className="font-display text-4xl font-bold text-accent">{ratePct}%</p>
            <p className="mt-0.5 text-xs text-muted">
              {rate.done} done · {rate.skipped} skipped · {rate.missed} missed of {rate.scheduled} scheduled
            </p>
          </>
        )}
      </StatPanel>

      <div className="mx-4 mb-2 flex gap-1">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRangeIdx(i)}
            className={cn(
              'notch [--notch:5px] border px-4 py-1 font-display text-[13px] uppercase tracking-[0.12em] transition-colors',
              i === rangeIdx ? 'border-accent bg-accent/15 text-accent' : 'border-edge text-muted'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <StatPanel title={`By category · ${range.label}`}>
        <BarList items={byCategory} emptyText="Tag tasks with categories to see XP per category." />
      </StatPanel>

      <StatPanel title={`Top quests · ${range.label}`}>
        <BarList items={top} emptyText="Complete something to see it here." />
      </StatPanel>
    </div>
  );
}
