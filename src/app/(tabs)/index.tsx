// Экран «Сегодня» (docs/spec/today.md): день вокруг намазов. Шапка с датой и хиджрой,
// текущее окно с таймером, «Фокус дня», привычки, лента 5 окон с задачами и
// событиями, вечерний итог → Дневник.

import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { router } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { prayerDayContext } from '../../lib/prayerTimes';
import { buildDayPlan } from '../../lib/dayPlan';
import { eventsOnDate } from '../../lib/events';
import { getDayFocus } from '../../lib/dayFocus';
import { formatHijri, toHijri } from '../../lib/hijri';
import { isoWeekday, toDateKey } from '../../lib/dates';
import { useNow } from '../../lib/hooks';
import { TaskCard } from '../../components/TaskCard';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import type { NamazWindowName } from '../../lib/types';
import { COLORS } from '../../components/ui';
import {
  EventRow,
  EveningCard,
  FocusCard,
  HabitsToday,
  NowCard,
  OverdueSection,
  SectionHeader,
  WindowSection,
} from '../../components/today';

export default function TodayScreen() {
  const {
    loading,
    tasks,
    events,
    calendars,
    habits,
    habitLogs,
    diary,
    settings,
    locationError,
    refresh,
    addOrUpdateTask,
    setHabitCount,
  } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const { openTask } = useTaskSheet();
  const now = useNow(30_000);

  // Всё, что зависит от дня, пересчитывается при смене даты (в том числе в полночь).
  const ctx = useMemo(() => prayerDayContext(now, settings), [now, settings]);
  const todayStr = ctx.dayKey;
  const hijri = useMemo(() => toHijri(todayStr, settings.hijriOffset ?? 0), [todayStr, settings.hijriOffset]);
  const hasLocation = settings.latitude != null && settings.longitude != null;

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.status === 'active' && t.due?.date === todayStr),
    [tasks, todayStr]
  );
  const overdue = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'active' && t.due && t.due.date < todayStr)
        .sort((a, b) => a.due!.date.localeCompare(b.due!.date)),
    [tasks, todayStr]
  );
  const todayEvents = useMemo(() => eventsOnDate(events, calendars, todayStr), [events, calendars, todayStr]);

  const plan = useMemo(
    () => buildDayPlan({ tasks: todayTasks, events: todayEvents, windows: ctx.windows, now }),
    [todayTasks, todayEvents, ctx.windows, now]
  );

  const focus = getDayFocus({
    now,
    hijri,
    windows: ctx.windows,
    yesterdayWindows: ctx.yesterdayWindows,
    currentWindow: ctx.current,
  });

  const weekday = isoWeekday(dayjs(now));
  const todayHabits = useMemo(
    () => habits.filter((h) => !h.archived && h.weekdays.includes(weekday)).sort((a, b) => a.order - b.order),
    [habits, weekday]
  );
  const todayLogs = useMemo(() => habitLogs.filter((l) => l.date === todayStr), [habitLogs, todayStr]);
  const habitsDone = todayHabits.filter(
    (h) => (todayLogs.find((l) => l.habitId === h.id)?.completedCount ?? 0) >= h.targetCountPerDay
  ).length;

  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.endedAt && toDateKey(t.endedAt) === todayStr).length,
    [tasks, todayStr]
  );
  const maghrib = ctx.windows.find((w) => w.name === 'maghrib_isha')?.start;
  // После Магриба (без локации — после 18:00) или после полуночи до Фаджра,
  // когда ещё идёт ночь прошедшего дня, — акцент на вечернем итоге.
  const nightOfYesterday = !!ctx.current && ctx.current.date < todayStr;
  const afterMaghrib = (maghrib ? now >= new Date(maghrib) : now.getHours() >= 18) || nightOfYesterday;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Перенос просроченных — явное действие пользователя: время и окно сохраняются.
  const moveOverdueToToday = async () => {
    for (const t of overdue) {
      await addOrUpdateTask({ id: t.id, due: { ...t.due!, date: todayStr } });
    }
  };

  // «+» — компактный вид задачи на сегодня (из секции окна — сразу в это окно).
  const addTask = (window?: NamazWindowName) => openTask({ defaults: { due: { date: todayStr }, namazWindow: window } });

  const showAnytime = plan.anytime.tasks.length > 0 || plan.anytime.events.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.dateLabel}>{dayjs(now).format('dddd, D MMMM')}</Text>
        <Text style={styles.hijriLabel}>{formatHijri(hijri)}</Text>

        <NowCard
          current={ctx.current}
          now={now}
          hasLocation={hasLocation}
          onSetupLocation={() => router.push('/profile')}
        />
        {!hasLocation && !loading && locationError ? <Text style={styles.hint}>{locationError}</Text> : null}

        <FocusCard items={focus} />

        <HabitsToday habits={todayHabits} logs={todayLogs} onSetCount={(h, c) => setHabitCount(h.id, todayStr, c)} />

        <OverdueSection tasks={overdue} onMoveToToday={moveOverdueToToday} />

        {showAnytime || ctx.windows.length === 0 ? (
          <View>
            <SectionHeader title="В течение дня" />
            {plan.anytime.events.map((occ) => (
              <EventRow key={occ.key} occ={occ} />
            ))}
            {plan.anytime.tasks.map((t) => (
              <TaskCard key={t.id} task={t} showProject />
            ))}
            {!showAnytime ? <Text style={styles.hint}>На сегодня задач нет — нажмите «+», чтобы добавить.</Text> : null}
          </View>
        ) : null}

        {plan.windows.length > 0 ? (
          <View>
            <SectionHeader title="Окна намаза" />
            {plan.windows.map((p) => (
              <WindowSection key={p.window.id} plan={p} onAdd={() => addTask(p.window.name)} />
            ))}
          </View>
        ) : null}

        <View style={{ height: 12 }} />
        <EveningCard
          highlighted={afterMaghrib}
          doneCount={doneToday}
          habitsDone={habitsDone}
          habitsTotal={todayHabits.length}
          hasEntry={diary.some((d) => d.date === todayStr)}
          onOpenDiary={() => router.push(`/diary/${todayStr}`)}
        />
      </ScrollView>
      <Fab accessibilityLabel="Новая задача на сегодня" onPress={() => addTask()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 96 },
  dateLabel: { fontSize: 24, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  hijriLabel: { fontSize: 14, color: COLORS.muted, marginTop: 2, marginBottom: 14 },
  hint: { color: COLORS.muted, fontSize: 13, paddingVertical: 8 },
});
