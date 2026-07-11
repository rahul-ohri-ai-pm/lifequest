import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';
import { useCharacterStore } from '../src/store/useCharacterStore';
import { useSkillStore } from '../src/store/useSkillStore';
import { useTaskStore } from '../src/store/useTaskStore';
import { colors } from '../src/constants/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await Promise.all([
          useCharacterStore.getState().hydrate(),
          useTaskStore.getState().hydrate(new Date()),
          useSkillStore.getState().hydrate(),
        ]);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={styles.gate}>
        <Text style={styles.errorText}>Failed to start: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: colors.textPrimary, padding: 24, textAlign: 'center' },
});
