import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCharacterStore } from '../../src/store/useCharacterStore';
import { levelProgress } from '../../src/engine/xp';
import { colors, glow, radii, spacing } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  if (!character) return <View style={styles.screen} />;

  const p = levelProgress(character.totalXp);

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.levelLabel}>LEVEL</Text>
        <Text style={styles.level}>{p.level}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(p.progress * 100, 100)}%` }]} />
        </View>
        <Text style={styles.xpText}>
          {character.totalXp} / {p.nextLevelXp} XP
        </Text>
      </View>
      <Pressable style={styles.link} onPress={() => router.push('/archived')}>
        <Text style={styles.linkText}>Archived quests →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...glow,
  },
  levelLabel: { color: colors.textSecondary, fontSize: 12, letterSpacing: 4 },
  level: { color: colors.accent, fontSize: 64, fontWeight: 'bold' },
  barTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
  xpText: { color: colors.textPrimary, marginTop: spacing.sm },
  link: { marginTop: spacing.md, padding: spacing.sm },
  linkText: { color: colors.accent, fontSize: 14 },
});
