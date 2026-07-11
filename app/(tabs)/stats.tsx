import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BarList, StatPanel, TileRow } from '../../src/components/StatPanel';
import { getAllCompletions } from '../../src/db/queries/completions';
import { getAllSkips } from '../../src/db/queries/skips';
import { useCharacterStore } from '../../src/store/useCharacterStore';
import { useSkillStore } from '../../src/store/useSkillStore';
import { useTaskStore } from '../../src/store/useTaskStore';
import { levelProgress } from '../../src/engine/xp';
import { isScheduledDay } from '../../src/engine/time';
import {
  activeDaysInLast,
  distinctActiveDays,
  lastNDayCounts,
  scheduledOutcomes,
  skillBreakdown,
  topTasks,
  xpOnDay,
} from '../../src/engine/stats';
import { colors, difficultyColors, spacing } from '../../src/constants/theme';
import type { Completion, Skip } from '../../src/types';

const RANGES = [
  { label: '7d', days: 7 as number | null },
  { label: '30d', days: 30 as number | null },
  { label: 'All', days: null as number | null },
];

export default function StatsScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const character = useCharacterStore((s) => s.character);
  const skills = useSkillStore((s) => s.skills);
  const taskSkills = useSkillStore((s) => s.taskSkills);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [skips, setSkips] = useState<Skip[]>([]);
  const [rangeIdx, setRangeIdx] = useState(1); // default 30d

  useFocusEffect(
    useCallback(() => {
      void getAllCompletions().then(setCompletions);
      void getAllSkips().then(setSkips);
    }, [])
  );

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
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingVertical: spacing.md }}>
      <StatPanel title="Today">
        <TileRow
          tiles={[
            { value: `${doneToday}/${plannedToday}`, label: 'done / planned' },
            { value: `${xpToday}`, label: 'XP today' },
            { value: `${p?.level ?? 1}`, label: 'level' },
          ]}
        />
        {p && (
          <View style={styles.levelBarTrack}>
            <View style={[styles.levelBarFill, { width: `${Math.min(p.progress * 100, 100)}%` }]} />
          </View>
        )}
      </StatPanel>

      <StatPanel title="Last 14 days">
        <View style={styles.chartRow}>
          {days14.map((d, i) => (
            <View key={d.dayKey} style={styles.chartCol}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${(d.count / max14) * 100}%`,
                    backgroundColor: i === days14.length - 1 ? colors.accentSecondary : colors.accent,
                    opacity: d.count === 0 ? 0.15 : 1,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>{days14[0].dayKey.slice(5)}</Text>
          <Text style={styles.chartLabel}>today</Text>
        </View>
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
          <Text style={styles.hint}>No scheduled habits yet — add one with a Repeat schedule.</Text>
        ) : (
          <>
            <Text style={styles.ratePct}>{ratePct}%</Text>
            <Text style={styles.hint}>
              {rate.done} done · {rate.skipped} skipped · {rate.missed} missed of {rate.scheduled}{' '}
              scheduled
            </Text>
          </>
        )}
      </StatPanel>

      <View style={styles.rangeRow}>
        {RANGES.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => setRangeIdx(i)}
            style={[styles.rangeChip, i === rangeIdx && styles.rangeChipActive]}
          >
            <Text style={[styles.rangeText, i === rangeIdx && { color: colors.accent }]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <StatPanel title={`By category · ${range.label}`}>
        <BarList items={byCategory} emptyText="Tag tasks with categories to see XP per category." />
      </StatPanel>

      <StatPanel title={`Top quests · ${range.label}`}>
        <BarList items={top} emptyText="Complete something to see it here." />
      </StatPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  levelBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  levelBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 3,
  },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { borderRadius: 2, minHeight: 2 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  chartLabel: { color: colors.textSecondary, fontSize: 10 },
  ratePct: { color: colors.accent, fontSize: 36, fontWeight: 'bold' },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  rangeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  rangeChip: {
    borderWidth: 1,
    borderColor: colors.panel,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rangeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  rangeText: { color: colors.textSecondary, fontSize: 13 },
});
