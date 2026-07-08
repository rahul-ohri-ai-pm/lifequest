import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FastCapture } from '../../src/components/FastCapture';
import { TaskCard } from '../../src/components/TaskCard';
import { useTaskStore } from '../../src/store/useTaskStore';
import { colors, spacing } from '../../src/constants/theme';
import type { Difficulty, Task } from '../../src/types';

export default function TodayScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const completionsToday = useTaskStore((s) => s.completionsToday);
  const addTask = useTaskStore((s) => s.addTask);
  const completeTask = useTaskStore((s) => s.completeTask);

  const completedTaskIds = new Set(completionsToday.map((c) => c.taskId));

  const onAdd = (title: string, difficulty: Difficulty) => {
    void addTask({ title, difficulty, type: 'todo' }, new Date());
  };

  const onComplete = (task: Task) => {
    void completeTask(task, new Date());
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={<FastCapture onAdd={onAdd} />}
        renderItem={({ item }) => (
          <TaskCard task={item} completedToday={completedTaskIds.has(item.id)} onComplete={onComplete} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No quests yet — add your first one above.</Text>
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
