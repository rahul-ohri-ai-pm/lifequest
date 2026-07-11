import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import type { SkillDef } from '../types';

interface Props {
  skills: SkillDef[];
  selected: string[];
  onToggle(skillId: string): void;
}

// One-tap category chips (multi-select allowed; §7 split-XP). MRU ordering
// is the caller's job so the user's top categories sit first.
export function SkillChips({ skills, selected, onToggle }: Props) {
  return (
    <View style={styles.row}>
      {skills.map((s) => {
        const on = selected.includes(s.id);
        const color = s.color ?? colors.accent;
        return (
          <Pressable
            key={s.id}
            onPress={() => onToggle(s.id)}
            style={[styles.chip, { borderColor: color }, on && { backgroundColor: color + '33' }]}
          >
            <Text style={[styles.chipText, { color }]}>{s.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: 12 },
});
