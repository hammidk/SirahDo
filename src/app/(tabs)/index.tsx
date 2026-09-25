// Экран «Сегодня» (docs/spec/today.md): ориентир намаза с датой → «Без времени»
// (сворачиваемый блок) → просроченные → расписание дня шкалой, как в Календаре,
// с намазами-якорями → вечерний итог → Дневник.

import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { router } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { prayerStatus } from '../../lib/prayerTimes';
import { collectDay, minutesInDay } from '../../lib/calendarData';
import { formatHijri, toHijri } from '../../lib/hijri';
import { DATE_FORMAT, dueMoment, isoWeekday, parseTime, toDateKey } from '../../lib/dates';
import { useNow } from '../../lib/hooks';
import { NAMAZ_WINDOW_ORDER } from '../../lib/types';
import type { Task } from '../../lib/types';
import { TaskCard } from '../../components/TaskCard';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import { CollapsibleSection } from '../../components/Collapsible';
import { DayTimeline } from '../../components/calendar/CalendarViews';
import type { ViewHandlers } from '../../components/calendar/CalendarViews';
import { COLORS } from '../../components/ui';
import { EventRow, EveningCard, OverdueSection, PrayerCard } from '../../components/today';

const HOUR_HEIGHT = 52;

// Порядок в «Без времени»: сначала без окна намаза, затем по окнам дня, внутри — по приоритету.
const windowRank = (t: Task) => (t.namazWindow ? NAMAZ_WINDOW_ORDER.indexOf(t.namazWindow) + 1 : 0);

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
    reopenTask,
  } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const { openTask, completeWithFeedback } = useTaskSheet();
  const now = useNow(30_000);

  // Всё, что зависит от дня, пересчитывается при смене даты (в том числе в полночь).
  const todayStr = dayjs(now).format(DATE_FORMAT);
  const hijri = useMemo(() => toHijri(todayStr, settings.hijriOffset ?? 0), [todayStr, settings.hijriOffset]);
  const hasLocation = settings.latitude != null && settings.longitude != null;
  const weekdayDate = dayjs(now).format('dd, D MMMM');
  const dateLabel = `${weekdayDate.charAt(0).toUpperCase()}${weekdayDate.slice(1)} · ${formatHijri(hijri)}`;

  const day = useMemo(
    () => collectDay(todayStr, { events, calendars, tasks, settings }, { alwaysShowTasks: true }),
    [todayStr, events, calendars, tasks, settings]
  );
  const untimedTasks = useMemo(
    () =>
      day.tasks
        .filter((t) => t.status === 'active' && !parseTime(t.due?.time))
        .sort((a, b) => windowRank(a) - windowRank(b) || a.priority - b.priority),
    [day.tasks]
  );
  const allDayEvents = day.events.filter((o) => o.event.allDay);
  const overdue = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'active' && t.due && t.due.date < todayStr)
        .sort((a, b) => a.due!.date.localeCompare(b.due!.date)),
    [tasks, todayStr]
  );

  // Шкала начинается за час до текущего времени, а если какое-то дело дня раньше — с его часа.
  // Допущение: пустые утренние часы не показываем, чтобы «сейчас» было видно без прокрутки.
  const fromHour = useMemo(() => {
    let min = Math.max(0, now.getHours() - 1) * 60;
    for (const o of day.events) if (!o.event.allDay) min = Math.min(min, minutesInDay(o.start, todayStr));
    for (const t of day.tasks) if (t.due && parseTime(t.due.time)) min = Math.min(min, minutesInDay(dueMoment(t.due), todayStr));
    return Math.floor(min / 60);
  }, [day, now, todayStr]);

  const weekday = isoWeekday(dayjs(now));
  const todayHabits = useMemo(() => habits.filter((h) => !h.archived && h.weekdays.includes(weekday)), [habits, weekday]);
  const habitsDone = todayHabits.filter(
    (h) => (habitLogs.find((l) => l.habitId === h.id && l.date === todayStr)?.completedCount ?? 0) >= h.targetCountPerDay
  ).length;
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.endedAt && toDateKey(t.endedAt) === todayStr).length,
    [tasks, todayStr]
  );
  // После Магриба (без местоположения — после 18:00) и ночью до Фаджра — акцент на вечернем итоге.
  const status = prayerStatus(now, settings);
  const afterMaghrib = status
    ? !status.current || status.current === 'maghrib' || status.current === 'isha'
    : now.getHours() >= 18;

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

  const handlers: ViewHandlers = {
    onPressEvent: (occ) => router.push({ pathname: '/event/[id]', params: { id: occ.event.id } }),
    onPressTask: (task) => openTask({ taskId: task.id }),
    // Тап по пустому часу на «Сегодня» — новая задача на этот час (в Календаре — событие).
    onPressSlot: (date, hour) => openTask({ defaults: { due: { date, time: `${String(hour).padStart(2, '0')}:00` } } }),
    onPressDay: () => {},
    onToggleTask: (task) => (task.status === 'done' ? reopenTask(task.id) : completeWithFeedback(task.id)),
  };

  const untimedCount = untimedTasks.length + allDayEvents.length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PrayerCard settings={settings} dateLabel={dateLabel} onSetupLocation={() => router.push('/profile')} />
        {!hasLocation && !loading && locationError ? <Text style={styles.hint}>{locationError}</Text> : null}

        {untimedCount > 0 ? (
          <CollapsibleSection title="Без времени" count={untimedCount}>
            {allDayEvents.map((occ) => (
              <EventRow key={occ.key} occ={occ} />
            ))}
            {untimedTasks.map((t) => (
              <TaskCard key={t.id} task={t} showProject />
            ))}
          </CollapsibleSection>
        ) : null}

        <OverdueSection tasks={overdue} onMoveToToday={moveOverdueToToday} />

        <Text style={styles.sectionTitle}>Расписание</Text>
        <DayTimeline day={day} fromHour={fromHour} hourHeight={HOUR_HEIGHT} now={now} handlers={handlers} />

        <View style={{ height: 16 }} />
        <EveningCard
          highlighted={afterMaghrib}
          doneCount={doneToday}
          habitsDone={habitsDone}
          habitsTotal={todayHabits.length}
          hasEntry={diary.some((d) => d.date === todayStr)}
          onOpenDiary={() => router.push(`/diary/${todayStr}`)}
        />
      </ScrollView>
      <Fab accessibilityLabel="Новая задача на сегодня" onPress={() => openTask({ defaults: { due: { date: todayStr } } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 96 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  hint: { color: COLORS.muted, fontSize: 13, paddingVertical: 8 },
});
