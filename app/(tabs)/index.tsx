import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FastCapture } from '../../src/components/FastCapture';
import { TaskCard } from '../../src/components/TaskCard';
import { useTaskStore } from '../../src/store/useTaskStore';
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

  const completedTaskIds = new Set(completionsToday.map((c) => c.taskId));
  const skippedTaskIds = new Set(skipsToday.map((s) => s.taskId));

  // Today view (§4): todos and counted always; habits only on their scheduled days
  const today = new Date();
  const todayTasks = tasks.filter(
    (t) => t.type !== 'habit' || !t.schedule || isScheduledDay(t.schedule, today)
  );

  const onAdd = (input: NewTask) => void addTask(input, new Date());
  const onComplete = (task: Task) => void completeTask(task, new Date());
  const onSkip = (task: Task) => void skipTask(task, new Date());
  const onUnskip = (task: Task) => void unskipTask(task, new Date());

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
            completedToday={completedTaskIds.has(item.id)}
            skippedToday={skippedTaskIds.has(item.id)}
            onComplete={onComplete}
            onUndo={onUndo}
            onSkip={onSkip}
            onUnskip={onUnskip}
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
