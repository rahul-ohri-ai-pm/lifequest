import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FastCapture } from '../../src/components/FastCapture';
import { TaskCard } from '../../src/components/TaskCard';
import { useTaskStore } from '../../src/store/useTaskStore';
import { useSkillStore } from '../../src/store/useSkillStore';
import { isScheduledDay } from '../../src/engine/time';
import { colors, spacing } from '../../src/constants/theme';
import type { Task } from '../../src/types';
import type { NewTask } from '../../src/db/queries/tasks';

export default function TodayScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const completionsToday = useTaskStore((s) => s.completionsToday);
  const skipsToday = useTaskStore((s) => s.skipsToday);
  const addTask = useTaskStore((s) => s.addTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const undoCompletion = useTaskStore((s) => s.undoCompletion);
  const skipTask = useTaskStore((s) => s.skipTask);
  const unskipTask = useTaskStore((s) => s.unskipTask);
  const logCountedProgress = useTaskStore((s) => s.logCountedProgress);

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

  // Today view (§4, Phase 1.5): schedule is orthogonal — any task with a
  // schedule appears only on its scheduled days; unscheduled tasks always show
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
    <View style={styles.screen}>
      <FlatList
        data={todayTasks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={<FastCapture onAdd={onAdd} />}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            done={isDone(item)}
            hasCompletionToday={completedTaskIds.has(item.id)}
            skippedToday={skippedTaskIds.has(item.id)}
            progressToday={progressByTask.get(item.id) ?? 0}
            onComplete={onComplete}
            onUndo={onUndo}
            onSkip={onSkip}
            onUnskip={onUnskip}
            onLogProgress={onLogProgress}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No quests for today — add your first one above.</Text>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
