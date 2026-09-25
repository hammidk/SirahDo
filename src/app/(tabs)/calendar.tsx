// Календарь (docs/spec/calendar.md): вверху — месяц (тап раскрывает сетку для быстрого перехода),
// гамбургер — режим и календари. Режимы: Расписание / День / Неделя / Месяц.
// Горизонтальный свайп листает период текущего режима. «+» создаёт событие.
// Намазы — несдвигаемые якоря на шкале дня.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Tabs, router } from 'expo-router';
import { Icon } from '../../components/Icon';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import type { CalendarViewMode } from '../../lib/types';
import { collectDay, dateRange } from '../../lib/calendarData';
import { DATE_FORMAT, startOfIsoWeek, todayKey } from '../../lib/dates';
import { useNow } from '../../lib/hooks';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import { CalendarGrid } from '../../components/CalendarGrid';
import { SwipePager } from '../../components/SwipePager';
import { CalendarDrawer } from '../../components/calendar/CalendarDrawer';
import { AgendaView, MonthView, TimelineView } from '../../components/calendar/CalendarViews';
import type { ViewHandlers } from '../../components/calendar/CalendarViews';
import { COLORS } from '../../components/ui';

const AGENDA_DAYS = 30;

export default function CalendarScreen() {
  const { tasks, events, calendars, settings, updateSettings } = useAppData();
  const { openTask } = useTaskSheet();
  const now = useNow(60_000);
  const [selected, setSelected] = useState(todayKey());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mode: CalendarViewMode = settings.calendarView ?? 'day';
  const sel = dayjs(selected);

  const setMode = (m: CalendarViewMode) => updateSettings({ ...settings, calendarView: m });

  const src = { events, calendars, tasks, settings };
  const visibleDates = useMemo(() => {
    switch (mode) {
      case 'day':
        return [selected];
      case 'week':
        return dateRange(startOfIsoWeek(sel), 7);
      case 'agenda':
        return dateRange(sel, AGENDA_DAYS);
      case 'month': {
        const first = sel.startOf('month');
        return dateRange(startOfIsoWeek(first), 42);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selected]);
  const days = useMemo(
    () => visibleDates.map((d) => collectDay(d, src)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleDates, events, calendars, tasks, settings]
  );
  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const step = (dir: 1 | -1) => {
    const unit = mode === 'month' ? 'month' : mode === 'day' ? 'day' : 'week';
    setSelected(sel.add(dir, unit).format(DATE_FORMAT));
  };

  const newEvent = (date: string, hour?: number) =>
    router.push({ pathname: '/event/[id]', params: { id: 'new', date, hour: String(hour ?? Math.min(23, now.getHours() + 1)) } });

  const handlers: ViewHandlers = {
    onPressEvent: (occ) => router.push({ pathname: '/event/[id]', params: { id: occ.event.id } }),
    onPressTask: (task) => openTask({ taskId: task.id }),
    onPressSlot: (date, hour) => newEvent(date, hour),
    onPressDay: (date) => {
      setSelected(date);
      setMode('day');
    },
  };

  const title =
    mode === 'day'
      ? sel.format('D MMMM, dd')
      : mode === 'week'
        ? `${startOfIsoWeek(sel).format('D MMM')} – ${startOfIsoWeek(sel).add(6, 'day').format('D MMM')}`
        : sel.format('MMMM YYYY');
  const isPast = mode === 'day' && selected < todayKey();

  return (
    <View style={styles.screen}>
      <Tabs.Screen
        options={{
          headerTitle: () => (
            <Pressable
              onPress={() => setPickerOpen((v) => !v)}
              style={styles.titleButton}
              accessibilityRole="button"
              accessibilityLabel={`${title}. Открыть календарь для перехода к дате`}
            >
              <Text style={styles.title}>{title}</Text>
              <Icon name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
            </Pressable>
          ),
          headerLeft: () => (
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={10} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Вид и календари">
              <Icon name="menu" size={22} color={COLORS.muted} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {
                setSelected(todayKey());
                setPickerOpen(false);
              }}
              hitSlop={10}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Перейти к сегодня"
            >
              <Text style={[styles.todayButton, selected === todayKey() && styles.todayButtonCurrent]}>Сегодня</Text>
            </Pressable>
          ),
        }}
      />

      {pickerOpen ? (
        <View style={styles.picker}>
          <CalendarGrid
            value={selected}
            onChange={(d) => {
              setSelected(d);
              setPickerOpen(false);
            }}
          />
        </View>
      ) : null}

      <View style={styles.navRow}>
        <Pressable onPress={() => step(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад">
          <Icon name="chevron-back" size={20} color={COLORS.muted} />
        </Pressable>
        <Text style={styles.navText}>
          {mode === 'day' ? sel.format('dddd') : mode === 'agenda' ? `С ${sel.format('D MMMM')}` : ''}
        </Text>
        {isPast ? (
          <Pressable onPress={() => router.push(`/history/${selected}`)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.historyLink}>История дня →</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => step(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Вперёд">
          <Icon name="chevron-forward" size={20} color={COLORS.muted} />
        </Pressable>
      </View>

      {/* Свайп влево/вправо — следующий/предыдущий день, неделя или месяц (как стрелки). */}
      <SwipePager style={styles.pager} onPrev={() => step(-1)} onNext={() => step(1)}>
        {mode === 'day' || mode === 'week' ? (
          <TimelineView days={days} hourHeight={mode === 'day' ? 56 : 44} now={now} handlers={handlers} />
        ) : null}
        {mode === 'month' ? <MonthView month={sel} selected={selected} dayData={dayMap} now={now} handlers={handlers} /> : null}
        {mode === 'agenda' ? <AgendaView days={days} now={now} hijriOffset={settings.hijriOffset ?? 0} handlers={handlers} /> : null}
      </SwipePager>

      <Fab accessibilityLabel="Новое событие" onPress={() => newEvent(selected)} />
      <CalendarDrawer visible={drawerOpen} mode={mode} onChangeMode={setMode} onClose={() => setDrawerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  headerButton: { paddingHorizontal: 16 },
  // «Сегодня» — обычный текст на фоне-плашке, без синего (docs/spec/design.md).
  todayButton: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    backgroundColor: COLORS.hover,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  todayButtonCurrent: { color: COLORS.muted, backgroundColor: 'transparent' },
  pager: { flex: 1 },
  picker: { backgroundColor: COLORS.card, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6 },
  navText: { flex: 1, fontSize: 13, color: COLORS.muted, textTransform: 'capitalize' },
  historyLink: { fontSize: 13, color: COLORS.primary },
});
