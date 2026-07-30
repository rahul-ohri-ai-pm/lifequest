import { Tabs } from 'expo-router';
import { CalendarIcon, ProfileIcon, StatsIcon, TodayIcon } from '../../src/components/icons';
import { colors, text } from '../../src/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundAlt },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: text.screenTitle,
        tabBarStyle: { backgroundColor: colors.backgroundAlt, borderTopColor: colors.panel },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        // Tab labels stay on the system font deliberately: §5 reserves the display face
        // for headers, numbers, and level-up moments. Rajdhani here also overflowed the
        // tab bar's fixed label box and clipped the glyph bottoms.
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <TodayIcon color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: ({ color }) => <StatsIcon color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <ProfileIcon color={color} /> }}
      />
    </Tabs>
  );
}
