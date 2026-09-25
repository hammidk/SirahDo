import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppDataProvider, useAppData } from '../lib/AppDataContext';
import { addNotificationTapListener } from '../lib/notifications';
import { TaskSheetProvider } from '../components/TaskSheet';
import { COLORS } from '../theme/colors';
import { headerOptions } from '../theme/navigation';

// Заставка держится, пока грузятся данные, — без мигания пустых экранов.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function LoadingGate({ children }: { children: ReactNode }) {
  const { loading } = useAppData();
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.muted} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  // Тап по напоминанию открывает связанную задачу.
  useEffect(() => addNotificationTapListener((url) => router.push(url as never)), []);

  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <LoadingGate>
          <TaskSheetProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                ...headerOptions,
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: COLORS.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="task/[id]"
                options={{ presentation: 'modal', title: 'Задача' }}
              />
              <Stack.Screen
                name="project/[id]"
                options={{ title: 'Проект' }}
              />
              <Stack.Screen
                name="inbox"
                options={{ title: 'Входящие' }}
              />
              <Stack.Screen name="profile" options={{ title: 'Профиль' }} />
              <Stack.Screen name="diary/index" options={{ title: 'Дневник' }} />
              <Stack.Screen name="diary/[date]" options={{ title: 'Дневник' }} />
              <Stack.Screen name="history/index" options={{ title: 'История' }} />
              <Stack.Screen name="history/[date]" options={{ title: 'День' }} />
              <Stack.Screen name="tag/[id]" options={{ title: 'Тег' }} />
              <Stack.Screen name="filters-tags" options={{ title: 'Фильтры и теги' }} />
              <Stack.Screen name="filter/[id]" options={{ title: 'Фильтр' }} />
              <Stack.Screen name="archive" options={{ title: 'Архив проектов' }} />
              <Stack.Screen name="event/[id]" options={{ presentation: 'modal', title: 'Событие' }} />
              <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', title: 'Привычка' }} />
              <Stack.Screen name="habit/stats" options={{ title: 'Статистика привычек' }} />
            </Stack>
          </TaskSheetProvider>
        </LoadingGate>
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
