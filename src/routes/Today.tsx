import { useMemo, useRef } from 'react';
import { FastCapture } from '../components/FastCapture';
import { StatusHero } from '../components/StatusHero';
import { TaskCard, type Reward } from '../components/TaskCard';
import { SectionBar } from '../components/system/SectionBar';
import { useTaskStore } from '../store/useTaskStore';
import { useSkillStore } from '../store/useSkillStore';
import { useStreakStore } from '../store/useStreakStore';
import { isScheduledDay } from '../engine/time';
import { splitSkillXp, xpForDifficulty } from '../engine/xp';
import { gsap, useGsap } from '../lib/gsap';
import type { Task } from '../types';
import type { NewTask } from '../db/queries/tasks';

export default function Today() {
  const tasks = useTaskStore((s) => s.tasks);
  const completionsToday = useTaskStore((s) => s.completionsToday);
  const skipsToday = useTaskStore((s) => s.skipsToday);
  const addTask = useTaskStore((s) => s.addTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const undoCompletion = useTaskStore((s) => s.undoCompletion);
  const skipTask = useTaskStore((s) => s.skipTask);
  const unskipTask = useTaskStore((s) => s.unskipTask);
  const logCountedProgress = useTaskStore((s) => s.logCountedProgress);
  const streaksByTask = useStreakStore((s) => s.byTask);
  const root = useRef<HTMLDivElement | null>(null);

  // The quest row's reward tag and spine colour both come from the task's first tagged
  // category (§5). Subscribe to raw state and derive here — a selector building this map
  // would loop (see useSkillStore).
  const skills = useSkillStore((s) => s.skills);
  const taskSkills = useSkillStore((s) => s.taskSkills);
  const rewardFor = useMemo(() => {
    const byId = new Map(skills.map((s) => [s.id, s]));
    return (task: Task): Reward => {
      const xp = xpForDifficulty(task.difficulty);
      const tagged = taskSkills[task.id] ?? [];
      const first = tagged.length ? byId.get(tagged[0]) : undefined;
      // §7: character always banks the full XP, but the tag shows what the *skill* gets —
      // that is the number the user is watching when they tag a task with two categories.
      return first
        ? { xp: splitSkillXp(xp, tagged.length), label: first.name, color: first.color }
        : { xp, label: 'XP', color: null };
    };
  }, [skills, taskSkills]);

  const completedTaskIds = new Set(completionsToday.map((c) => c.taskId));
  const skippedTaskIds = new Set(skipsToday.map((s) => s.taskId));

  // Counted tasks: today's cumulative progress per task (daily reset, §7)
  const progressByTask = new Map<string, number>();
  for (const c of completionsToday) {
    progressByTask.set(c.taskId, (progressByTask.get(c.taskId) ?? 0) + (c.progressCount ?? 0));
  }

  const isDone = (t: Task) =>
    t.type === 'counted' && t.targetCount != null
      ? (progressByTask.get(t.id) ?? 0) >= t.targetCount
      : completedTaskIds.has(t.id);

  // Today view (§4, Phase 1.5): schedule is orthogonal — any task with a schedule appears
  // only on its scheduled days; unscheduled tasks always show.
  const today = new Date();
  const todayTasks = tasks.filter((t) => !t.schedule || isScheduledDay(t.schedule, today));
  const doneCount = todayTasks.filter(isDone).length;
  const remaining = todayTasks.length - doneCount;
  const xpToday = completionsToday.reduce((sum, c) => sum + c.xpAwarded, 0);

  // The quest log deals itself in: each row lifts and settles a beat after the one above.
  // Keyed on the task ids so it replays when the set genuinely changes, not on every tick of
  // progress — otherwise logging "+1" on a counted task would re-deal the whole list.
  const listKey = todayTasks.map((t) => t.id).join(',');
  useGsap(
    root,
    () => {
      const rows = gsap.utils.toArray<HTMLElement>('[data-quest-row]');
      if (!rows.length) return;
      gsap.fromTo(
        rows,
        { opacity: 0, y: 22, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power3.out',
          // Capped so a long log doesn't crawl in for two seconds.
          stagger: { each: 0.055, from: 'start', amount: Math.min(rows.length * 0.055, 0.5) },
          clearProps: 'transform',
        }
      );
    },
    [listKey]
  );

  const onAdd = (input: NewTask, skillIds: string[]) =>
    void addTask(input, new Date()).then((task) => {
      if (skillIds.length) return useSkillStore.getState().tagTask(task.id, skillIds);
    });
  // Streak state is derived from the completions log, so every write to that log has to be
  // followed by a re-derivation — otherwise the number on screen is stale until the next cold
  // start. Cheap at this scale (one array pass over ~1.8k rows/year).
  const resync = () => useStreakStore.getState().hydrate(useTaskStore.getState().tasks, new Date());

  const onComplete = (task: Task) => void completeTask(task, new Date()).then(resync);
  const onSkip = (task: Task) => void skipTask(task, new Date()).then(resync);
  const onUnskip = (task: Task) => void unskipTask(task, new Date()).then(resync);
  const onLogProgress = (task: Task) => void logCountedProgress(task, 1, new Date()).then(resync);

  // §4 Undo: remove the most recent completion for today
  const onUndo = (task: Task) => {
    const latest = [...completionsToday].reverse().find((c) => c.taskId === task.id);
    if (latest) void undoCompletion(latest.id, new Date()).then(resync);
  };

  return (
    <div ref={root} className="pb-10">
      <StatusHero doneCount={doneCount} totalCount={todayTasks.length} xpToday={xpToday} />

      <FastCapture onAdd={onAdd} />

      <SectionBar
        label="Quest log"
        meta={todayTasks.length ? `${remaining} remaining` : undefined}
      />

      {todayTasks.length === 0 ? (
        <p className="px-4 pt-6 text-center text-sm text-muted">
          No quests today — add your first one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 px-4 pt-1">
          {todayTasks.map((task) => (
            <li key={task.id} data-quest-row>
              <TaskCard
                task={task}
                reward={rewardFor(task)}
                streak={streaksByTask[task.id]?.state.current}
                done={isDone(task)}
                hasCompletionToday={completedTaskIds.has(task.id)}
                skippedToday={skippedTaskIds.has(task.id)}
                progressToday={progressByTask.get(task.id) ?? 0}
                onComplete={onComplete}
                onUndo={onUndo}
                onSkip={onSkip}
                onUnskip={onUnskip}
                onLogProgress={onLogProgress}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
