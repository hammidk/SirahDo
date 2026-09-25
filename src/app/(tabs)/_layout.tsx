// Нижняя навигация (ТЗ §1): Сегодня / Календарь / Трекер / Обзор.
// Входящие — первая строка «Обзора», Профиль — шестерёнка в шапке «Сегодня».
// Стиль Notion: таб-бар сливается с фоном, активная вкладка — светлый текст,
// неактивные — приглушённые, без цветных индикаторов.

import { Pressable, StyleSheet } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs, router } from 'expo-router';

import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { COLORS } from '../../theme/colors';
import { headerOptions } from '../../theme/navigation';

function tabIcon(name: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={name} size={22} color={color} strokeWidth={focused ? 2 : 1.75} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        sceneStyle: { backgroundColor: COLORS.background },
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.tertiary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.subtle,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Сегодня',
          tabBarIcon: tabIcon('today'),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={12}
              style={{ paddingHorizontal: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Профиль и настройки"
            >
              <Icon name="settings" size={20} color={COLORS.muted} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="calendar" options={{ title: 'Календарь', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="tracker" options={{ title: 'Трекер', tabBarIcon: tabIcon('tracker') }} />
      <Tabs.Screen name="overview" options={{ title: 'Обзор', tabBarIcon: tabIcon('overview') }} />
    </Tabs>
  );
}
