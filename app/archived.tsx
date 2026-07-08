import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { getArchivedTasks } from '../src/db/queries/tasks';
import { useTaskStore } from '../src/store/useTaskStore';
import { colors, difficultyColors, radii, spacing } from '../src/constants/theme';
import type { Task } from '../src/types';

export default function ArchivedScreen() {
  const [archived, setArchived] = useState<Task[]>([]);
  const unarchiveTask = useTaskStore((s) => s.unarchiveTask);

  useEffect(() => {
    void getArchivedTasks().then(setArchived);
  }, []);

  const onUnarchive = async (task: Task) => {
    await unarchiveTask(task.id, new Date());
    setArchived((prev) => prev.filter((t) => t.id !== task.id));
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Archived' }} />
      <FlatList
        data={archived}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: difficultyColors[item.difficulty] }]}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable onPress={() => onUnarchive(item)} hitSlop={8}>
              <Text style={styles.restore}>Restore</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing archived.</Text>}
        contentContainerStyle={{ padding: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    opacity: 0.8,
  },
  title: { color: colors.textPrimary, fontSize: 15, flex: 1, marginRight: spacing.sm },
  restore: { color: colors.accent, fontSize: 14 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
});
