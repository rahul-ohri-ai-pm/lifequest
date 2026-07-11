import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { monthGrid } from '../../src/engine/calendar';
import { dateFromDayKey, dayKeyFor, dayWindow, isScheduledDay } from '../../src/engine/time';
import { getCompletionsBetween } from '../../src/db/queries/completions';
import { useTaskStore } from '../../src/store/useTaskStore';
import { colors, difficultyColors, radii, spacing } from '../../src/constants/theme';
import type { Completion, Task } from '../../src/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const todayKey = dayKeyFor(new Date());

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState(todayKey);
  const [dayCompletions, setDayCompletions] = useState<Completion[]>([]);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);

  // Tasks relevant to a day: habits scheduled on it + tasks due on it (§4 Calendar)
  const tasksForDay = (dayKey: string): Task[] => {
    const date = dateFromDayKey(dayKey);
    return tasks.filter((t) => {
      const scheduled = t.schedule && isScheduledDay(t.schedule, date);
      const due = t.dueAt && dayKeyFor(new Date(t.dueAt)) === dayKey;
      return scheduled || due;
    });
  };

  const dayHasActivity = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const week of grid) {
      for (const cell of week) {
        map.set(cell.dayKey, tasksForDay(cell.dayKey).length > 0);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, tasks]);

  useEffect(() => {
    const { startIso, endIso } = dayWindow(dateFromDayKey(selected));
    void getCompletionsBetween(startIso, endIso).then(setDayCompletions);
  }, [selected]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  };

  const selectedTasks = tasksForDay(selected);
  const completedIds = new Set(dayCompletions.map((c) => c.taskId));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return (
    <View style={styles.screen}>
      <View style={styles.nav}>
        <Pressable onPress={prevMonth} hitSlop={12}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} hitSlop={12}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekDay}>
            {w}
          </Text>
        ))}
      </View>

      {grid.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((cell) => {
            const isToday = cell.dayKey === todayKey;
            const isSelected = cell.dayKey === selected;
            return (
              <Pressable
                key={cell.dayKey}
                style={[styles.cell, isSelected && styles.cellSelected, isToday && styles.cellToday]}
                onPress={() => setSelected(cell.dayKey)}
              >
                <Text style={[styles.cellText, !cell.inMonth && styles.cellDim]}>
                  {cell.dayOfMonth}
                </Text>
                {dayHasActivity.get(cell.dayKey) && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>
      ))}

      <Text style={styles.selectedTitle}>
        {selected === todayKey ? 'Today' : selected}
        {dayCompletions.length > 0 ? ` · ${dayCompletions.length} completed` : ''}
      </Text>
      <FlatList
        data={selectedTasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Pressable style={styles.dayTask} onPress={() => router.push(`/task/${item.id}`)}>
            <View style={[styles.dayTaskDot, { backgroundColor: difficultyColors[item.difficulty] }]} />
            <Text style={styles.dayTaskTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {completedIds.has(item.id) && <Text style={styles.dayTaskDone}>✓</Text>}
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {dayCompletions.length
              ? `${dayCompletions.length} completion${dayCompletions.length > 1 ? 's' : ''} logged this day.`
              : 'Nothing scheduled or due.'}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navArrow: { color: colors.accent, fontSize: 28, paddingHorizontal: spacing.md },
  navTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  weekHeader: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11 },
  week: { flexDirection: 'row' },
  cell: {
    flex: 1,
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    margin: 1,
  },
  cellSelected: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.accent },
  cellToday: { borderWidth: 1, borderColor: colors.accentSecondary },
  cellText: { color: colors.textPrimary, fontSize: 13 },
  cellDim: { color: colors.textSecondary, opacity: 0.4 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    position: 'absolute',
    bottom: 4,
  },
  selectedTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dayTask: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  dayTaskDot: { width: 8, height: 8, borderRadius: 4 },
  dayTaskTitle: { color: colors.textPrimary, flex: 1, fontSize: 14 },
  dayTaskDone: { color: colors.accent, fontWeight: 'bold' },
  empty: { color: colors.textSecondary, fontSize: 13 },
});
