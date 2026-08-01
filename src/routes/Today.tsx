import { useMemo } from 'react';
import { BlurFade } from '../components/ui/blur-fade';
import { FastCapture } from '../components/FastCapture';
import { TaskCard, type Reward } from '../components/TaskCard';
import { TodayHeader } from '../components/TodayHeader';
import { useTaskStore } from '../store/useTaskStore';
import { useSkillStore } from '../store/useSkillStore';
import { isScheduledDay } from '../engine/time';
import { splitSkillXp, xpForDifficulty } from '../engine/xp';
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

  // The quest row's reward tag and spine color both come from the task's first tagged
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

  const onAdd = (input: NewTask, skillIds: string[]) =>
    void addTask(input, new Date()).then((task) => {
      if (skillIds.length) return useSkillStore.getState().tagTask(task.id, skillIds);
    });
  const onComplete = (task: Task) => void completeTask(task, new Date());
  const onSkip = (task: Task) => void skipTask(task, new Date());
  const onUnskip = (task: Task) => void unskipTask(task, new Date());
  const onLogProgress = (task: Task) => void logCountedProgress(task, 1, new Date());

  // §4 Undo: remove the most recent completion for today
  const onUndo = (task: Task) => {
    const latest = [...completionsToday].reverse().find((c) => c.taskId === task.id);
    if (latest) void undoCompletion(latest.id, new Date());
  };

  return (
    <div className="pb-8">
      <TodayHeader doneCount={todayTasks.filter(isDone).length} totalCount={todayTasks.length} />
      <FastCapture onAdd={onAdd} />

      {todayTasks.length === 0 ? (
        <p className="mt-8 text-center text-muted">No quests for today — add your first one above.</p>
      ) : (
        <ul className="flex flex-col gap-2 px-4">
          {todayTasks.map((task, i) => (
            <li key={task.id}>
              {/* Staggered entry, capped so a long list doesn't crawl in for two seconds. */}
              <BlurFade delay={Math.min(i, 8) * 0.04}>
                <TaskCard
                  task={task}
                  reward={rewardFor(task)}
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
              </BlurFade>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
