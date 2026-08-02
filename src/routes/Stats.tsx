import { useEffect, useMemo, useRef, useState } from 'react';
import { SystemPanel } from '../components/system/SystemPanel';
import { SectionBar } from '../components/system/SectionBar';
import { RangeFilter, RANGES } from '../components/system/RangeFilter';
import { ActivityChart, type Bar } from '../components/charts/ActivityChart';
import { SkillBars, type SkillRow } from '../components/charts/SkillBars';
import { StreakIcon } from '../components/icons';
import { getAllCompletions } from '../db/queries/completions';
import { getAllSkips } from '../db/queries/skips';
import { useCharacterStore } from '../store/useCharacterStore';
import { useSkillStore } from '../store/useSkillStore';
import { useStreakStore } from '../store/useStreakStore';
import { useTaskStore } from '../store/useTaskStore';
import { levelProgress } from '../engine/xp';
import {
  lastNDayCounts,
  rangeSummary,
  scheduledOutcomes,
  skillBreakdown,
  topTasks,
} from '../engine/stats';
import { gsap, useGsap } from '../lib/gsap';
import { colors, difficultyColors } from '../constants/theme';
import type { Completion, Skip } from '../types';

// The §10 Phase 2 skill dashboard. One range control governs every panel, so all the numbers
// on screen always describe the same window — panels that quietly disagree about "this week"
// are worse than no dashboard at all.

// How many day-columns the activity chart draws per range. "Day" gets a week of context
// rather than a single bar, because one bar is not a chart (dataviz: a lone value is a stat
// tile, and the tile row above already shows it).
const CHART_DAYS = [7, 7, 30, 60];

export default function Stats() {
  const tasks = useTaskStore((s) => s.tasks);
  const character = useCharacterStore((s) => s.character);
  const skills = useSkillStore((s) => s.skills);
  const taskSkills = useSkillStore((s) => s.taskSkills);
  const globalStreak = useStreakStore((s) => s.global);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [skips, setSkips] = useState<Skip[]>([]);
  const [rangeIdx, setRangeIdx] = useState(1); // default: Week
  const root = useRef<HTMLDivElement | null>(null);

  // The route unmounts when you navigate away, so a mount-time load is the refresh — stats
  // are always derived on read (§4), never cached.
  useEffect(() => {
    void getAllCompletions().then(setCompletions);
    void getAllSkips().then(setSkips);
  }, []);

  const now = useMemo(() => new Date(), []);
  const range = RANGES[rangeIdx];
  const p = character ? levelProgress(character.totalXp) : null;

  const summary = useMemo(
    () => rangeSummary(completions, range.days, now),
    [completions, range.days, now]
  );

  const bars: Bar[] = useMemo(
    () => lastNDayCounts(completions, CHART_DAYS[rangeIdx], now).map((d) => ({ day: d.dayKey, count: d.count })),
    [completions, rangeIdx, now]
  );

  const skillRows: SkillRow[] = useMemo(() => {
    const links = Object.entries(taskSkills).flatMap(([taskId, ids]) =>
      ids.map((skillId) => ({ taskId, skillId }))
    );
    const byId = new Map(skills.map((s) => [s.id, s]));
    return skillBreakdown(completions, links, range.days, now).flatMap((agg) => {
      const skill = byId.get(agg.skillId);
      if (!skill) return [];
      return [{
        id: skill.id,
        name: skill.name,
        color: skill.color,
        level: skill.level,
        xp: agg.xp,
        count: agg.count,
      }];
    });
  }, [completions, taskSkills, skills, range.days, now]);

  const followThrough = useMemo(
    () => scheduledOutcomes(tasks, completions, skips, range.days ?? 3650, now),
    [tasks, completions, skips, range.days, now]
  );
  const ratePct = followThrough.scheduled
    ? Math.round((followThrough.done / followThrough.scheduled) * 100)
    : null;

  const top = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return topTasks(completions, range.days, now).map((s) => ({
      ...s,
      title: byId.get(s.taskId)?.title ?? 'Archived quest',
      color: byId.get(s.taskId) ? difficultyColors[byId.get(s.taskId)!.difficulty] : colors.textSecondary,
    }));
  }, [completions, tasks, range.days, now]);

  // Panels power on in sequence — the same vocabulary as the boot sequence, so the dashboard
  // reads as part of the same system rather than a separate screen.
  useGsap(
    root,
    () => {
      const panels = gsap.utils.toArray<HTMLElement>('[data-panel]');
      if (!panels.length) return;
      gsap.fromTo(
        panels,
        { opacity: 0, y: 18, scaleY: 0.96 },
        {
          opacity: 1,
          y: 0,
          scaleY: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.07,
          clearProps: 'transform',
        }
      );
    },
    [completions.length]
  );

  // Range changes re-run the counters so the headline numbers visibly re-measure.
  const animateKey = `${rangeIdx}:${completions.length}`;
  const kpiRoot = useRef<HTMLDivElement | null>(null);
  useGsap(
    kpiRoot,
    () => {
      const nums = gsap.utils.toArray<HTMLElement>('[data-kpi]');
      nums.forEach((el, i) => {
        const target = Number(el.dataset.kpi ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 0.6,
          delay: i * 0.05,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
        });
      });
    },
    [animateKey]
  );

  const kpis = [
    { label: 'Cleared', value: summary.completions },
    { label: 'XP', value: summary.xp },
    { label: 'Active days', value: summary.activeDays },
  ];

  return (
    <div ref={root} className="pb-10">
      <div className="pt-2">
        <RangeFilter index={rangeIdx} onChange={setRangeIdx} />
      </div>

      {/* KPI row — headline numbers are stat tiles, not a chart (dataviz: a handful of
          figures is a tile row; a grouped bar chart of three numbers is noise). */}
      <div ref={kpiRoot} data-panel className="mt-3 px-4">
        <SystemPanel glow innerClassName="flex gap-2 px-3 py-3">
          {kpis.map((k) => (
            <div key={k.label} className="flex-1 text-center">
              <div className="font-display text-3xl leading-none text-accent text-glow tabular-nums">
                <span data-kpi={k.value}>0</span>
              </div>
              <div className="mt-1 font-display text-[10px] uppercase tracking-[0.16em] text-muted">
                {k.label}
              </div>
            </div>
          ))}
        </SystemPanel>
      </div>

      {/* Level + streak, the two figures that describe the account rather than the range. */}
      <div data-panel className="mt-2 px-4">
        <SystemPanel brackets={false} innerClassName="flex items-center gap-4 px-4 py-2.5">
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">
            Level <span className="text-lg text-fg">{p?.level ?? 1}</span>
          </span>
          {globalStreak && (
            <span className="ml-auto flex items-center gap-1.5">
              <StreakIcon size={14} className={globalStreak.state.current > 0 ? 'text-epic' : 'text-muted'} />
              <span className="font-display text-lg leading-none tabular-nums text-epic">
                {globalStreak.state.current}
              </span>
              <span className="font-display text-[10px] uppercase tracking-[0.18em] text-muted">
                day · best {globalStreak.longest}
              </span>
            </span>
          )}
        </SystemPanel>
      </div>

      <SectionBar label="Activity" meta={range.label} />
      <div data-panel className="px-4">
        <SystemPanel brackets={false} innerClassName="px-4 py-3">
          <ActivityChart bars={bars} animateKey={animateKey} />
        </SystemPanel>
      </div>

      <SectionBar label="Skills" meta={`${skillRows.length} active`} />
      <div data-panel className="px-4">
        <SystemPanel brackets={false} innerClassName="px-4 py-4">
          <SkillBars
            rows={skillRows}
            animateKey={animateKey}
            emptyText="Tag quests with categories to see XP per skill."
          />
        </SystemPanel>
      </div>

      <SectionBar label="Follow-through" meta={range.label} />
      <div data-panel className="px-4">
        <SystemPanel brackets={false} innerClassName="px-4 py-3">
          {ratePct === null ? (
            <p className="text-[13px] text-muted">
              No scheduled habits in this range — add one with a Repeat schedule.
            </p>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-4xl font-bold leading-none text-accent text-glow">
                  {ratePct}%
                </span>
                <span className="text-xs text-muted">
                  {followThrough.done} done · {followThrough.skipped} skipped ·{' '}
                  {followThrough.missed} missed of {followThrough.scheduled}
                </span>
              </div>
              {/* A single ratio against a limit is a meter, not a pie. */}
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-edge bg-bg-alt">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${ratePct}%`,
                    backgroundColor: colors.accent,
                    boxShadow: `0 0 8px ${colors.accent}`,
                  }}
                />
              </div>
            </>
          )}
        </SystemPanel>
      </div>

      <SectionBar label="Top quests" meta={range.label} />
      <div data-panel className="px-4">
        <SystemPanel brackets={false} innerClassName="flex flex-col gap-2 px-4 py-3">
          {top.length === 0 ? (
            <p className="text-[13px] text-muted">Complete something to see it here.</p>
          ) : (
            top.map((t) => {
              const max = Math.max(...top.map((x) => x.count), 1);
              return (
                <div key={t.taskId}>
                  <div className="mb-0.5 flex justify-between gap-2">
                    <span className="truncate text-[13px] text-fg">{t.title}</span>
                    <span className="shrink-0 font-display text-[12px] tabular-nums text-muted">
                      ×{t.count} · {t.xp} XP
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-bg-alt">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${(t.count / max) * 100}%`, backgroundColor: t.color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </SystemPanel>
      </div>
    </div>
  );
}
