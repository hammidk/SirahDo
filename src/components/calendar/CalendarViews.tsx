// Режимы Календаря (ТЗ §4): шкала времени (День / Неделя), Месяц, Расписание.
// Стиль — спокойный и плоский, в духе Notion Calendar. Намазы — зелёные
// линии-якоря поверх шкалы, их нельзя сдвинуть.

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../themed';
import dayjs, { Dayjs } from 'dayjs';

import type { Task } from '../../lib/types';
import { PRIORITIES } from '../../lib/types';
import type { EventOccurrence } from '../../lib/events';
import type { DayData } from '../../lib/calendarData';
import { minutesInDay } from '../../lib/calendarData';
import { layoutDay } from '../../lib/timeline';
import { DATE_FORMAT, WEEKDAY_SHORT, dueMoment, isoWeekday, parseTime } from '../../lib/dates';
import { formatHijri, toHijri } from '../../lib/hijri';
import { COLORS, withAlpha } from '../../theme/colors';

// Намазы — несдвигаемые якоря: тонкие жёлтые линии.
const PRAYER = COLORS.warning;
const TASK_DEFAULT_MINUTES = 30;
const GUTTER = 42;

export interface ViewHandlers {
  onPressEvent: (occ: EventOccurrence) => void;
  onPressTask: (task: Task) => void;
  onPressSlot: (date: string, hour: number) => void;
  onPressDay: (date: string) => void;
}

const taskColor = (t: Task) => (t.status === 'done' ? COLORS.muted : (PRIORITIES.find((p) => p.id === t.priority)?.color ?? COLORS.muted));

// ---------- Шкала времени: День и Неделя ----------

type Block =
  | { kind: 'event'; key: string; startMin: number; endMin: number; occ: EventOccurrence }
  | { kind: 'task'; key: string; startMin: number; endMin: number; task: Task };

function blocksOf(day: DayData): Block[] {
  const blocks: Block[] = [];
  for (const occ of day.events) {
    if (occ.event.allDay) continue;
    blocks.push({
      kind: 'event',
      key: occ.key,
      startMin: minutesInDay(occ.start, day.date),
      endMin: minutesInDay(occ.end, day.date),
      occ,
    });
  }
  for (const task of day.tasks) {
    if (!task.due || !parseTime(task.due.time)) continue;
    const start = minutesInDay(dueMoment(task.due), day.date);
    blocks.push({ kind: 'task', key: `task_${task.id}`, startMin: start, endMin: start + (task.durationMinutes ?? TASK_DEFAULT_MINUTES), task });
  }
  return blocks;
}

export function TimelineView({
  days,
  hourHeight,
  now,
  handlers,
}: {
  days: DayData[];
  hourHeight: number;
  now: Date;
  handlers: ViewHandlers;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const compact = days.length > 1;
  const todayKey = dayjs(now).format(DATE_FORMAT);

  // При открытии — прокрутка к текущему часу (или к 7 утра).
  useEffect(() => {
    const hour = days.some((d) => d.date === todayKey) ? Math.max(0, now.getHours() - 1) : 7;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: hour * hourHeight, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.map((d) => d.date).join(), hourHeight]);

  const allDay = days.map((d) => ({
    date: d.date,
    events: d.events.filter((o) => o.event.allDay),
    tasks: d.tasks.filter((t) => !parseTime(t.due?.time)),
  }));
  const hasAllDay = allDay.some((d) => d.events.length || d.tasks.length);

  return (
    <View style={{ flex: 1 }}>
      {compact ? (
        <View style={[styles.weekHeader, { paddingLeft: GUTTER }]}>
          {days.map((d) => {
            const dj = dayjs(d.date);
            const isToday = d.date === todayKey;
            return (
              <Pressable key={d.date} style={styles.weekHeaderCell} onPress={() => handlers.onPressDay(d.date)} accessibilityRole="button">
                <Text style={styles.weekHeaderDow}>{WEEKDAY_SHORT[isoWeekday(dj) - 1]}</Text>
                <View style={[styles.weekHeaderNum, isToday && styles.todayCircle]}>
                  <Text style={[styles.weekHeaderNumText, isToday && styles.todayText]}>{dj.date()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {hasAllDay ? (
        <View style={[styles.allDayRow, { paddingLeft: GUTTER }]}>
          {allDay.map((d) => (
            <View key={d.date} style={styles.allDayCell}>
              {d.events.map((o) => (
                <Pressable
                  key={o.key}
                  style={[styles.allDayChip, { backgroundColor: withAlpha(o.color, 0.25), borderLeftColor: o.color }]}
                  onPress={() => handlers.onPressEvent(o)}
                  accessibilityRole="button"
                  accessibilityLabel={`Событие ${o.event.title}, весь день`}
                >
                  <Text style={styles.allDayText} numberOfLines={1}>
                    {o.event.title}
                  </Text>
                </Pressable>
              ))}
              {d.tasks.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.allDayChip, styles.taskChip, { borderColor: taskColor(t) }]}
                  onPress={() => handlers.onPressTask(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Задача ${t.title}`}
                >
                  <Text style={[styles.allDayTaskText, t.status === 'done' && styles.doneText]} numberOfLines={1}>
                    {compact ? '' : '○ '}
                    {t.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ height: hourHeight * 24 + 16 }}>
        <View style={{ flexDirection: 'row', height: hourHeight * 24 }}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: 24 }, (_, h) => (
              <Text key={h} style={[styles.hourLabel, { top: h * hourHeight - 7 }]}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </Text>
            ))}
          </View>
          {days.map((d) => (
            <DayColumn key={d.date} day={d} hourHeight={hourHeight} now={now} isToday={d.date === todayKey} compact={compact} handlers={handlers} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DayColumn({
  day,
  hourHeight,
  now,
  isToday,
  compact,
  handlers,
}: {
  day: DayData;
  hourHeight: number;
  now: Date;
  isToday: boolean;
  compact: boolean;
  handlers: ViewHandlers;
}) {
  const blocks = blocksOf(day);
  const placed = layoutDay(blocks);
  const byKey = new Map(blocks.map((b) => [b.key, b]));
  const pxPerMin = hourHeight / 60;
  const nowTop = minutesInDay(dayjs(now), day.date) * pxPerMin;

  return (
    <View style={[styles.dayColumn, compact && styles.dayColumnCompact]}>
      {/* Сетка часов; тап по пустому часу — новое событие. */}
      {Array.from({ length: 24 }, (_, h) => (
        <Pressable
          key={h}
          style={[styles.hourSlot, { top: h * hourHeight, height: hourHeight }]}
          onPress={() => handlers.onPressSlot(day.date, h)}
          accessibilityLabel={`Новое событие в ${h}:00`}
        />
      ))}

      {/* Намазы — несдвигаемые якоря. */}
      {day.prayers.map((p) => {
        const top = minutesInDay(p.at, day.date) * pxPerMin;
        return (
          <View key={p.label} pointerEvents="none" style={[styles.prayerLine, { top }]}>
            {!compact ? (
              <Text style={styles.prayerLabel}>
                {p.label} {p.at.format('HH:mm')}
              </Text>
            ) : null}
          </View>
        );
      })}

      {placed.map((p) => {
        const b = byKey.get(p.key)!;
        const top = p.startMin * pxPerMin;
        const height = Math.max(p.endMin - p.startMin, 20) * pxPerMin - 2;
        const style = { top, height, left: `${(p.col / p.cols) * 100}%` as const, width: `${100 / p.cols}%` as const };
        if (b.kind === 'event') {
          return (
            <Pressable
              key={p.key}
              style={[styles.block, style, { backgroundColor: withAlpha(b.occ.color, 0.25), borderLeftColor: b.occ.color }]}
              onPress={() => handlers.onPressEvent(b.occ)}
              accessibilityRole="button"
              accessibilityLabel={`Событие ${b.occ.event.title}, ${b.occ.start.format('HH:mm')}`}
            >
              <Text style={styles.blockTitle} numberOfLines={compact ? 3 : 2}>
                {b.occ.event.title}
              </Text>
              {!compact && height > 34 ? (
                <Text style={styles.blockMeta} numberOfLines={1}>
                  {b.occ.start.format('HH:mm')}–{b.occ.end.format('HH:mm')}
                  {b.occ.event.location ? ` · ${b.occ.event.location}` : ''}
                </Text>
              ) : null}
            </Pressable>
          );
        }
        return (
          <Pressable
            key={p.key}
            style={[styles.block, styles.taskBlock, style, { borderLeftColor: taskColor(b.task) }]}
            onPress={() => handlers.onPressTask(b.task)}
            accessibilityRole="button"
            accessibilityLabel={`Задача ${b.task.title}, ${b.task.due?.time}`}
          >
            <Text style={[styles.taskBlockTitle, b.task.status === 'done' && styles.doneText]} numberOfLines={compact ? 3 : 2}>
              {b.task.status === 'done' ? '✓ ' : '○ '}
              {b.task.title}
            </Text>
          </Pressable>
        );
      })}

      {isToday ? <View pointerEvents="none" style={[styles.nowLine, { top: nowTop }]} /> : null}
    </View>
  );
}

// ---------- Месяц ----------

export function MonthView({
  month,
  selected,
  dayData,
  now,
  handlers,
}: {
  month: Dayjs;
  selected: string;
  dayData: Map<string, DayData>;
  now: Date;
  handlers: ViewHandlers;
}) {
  const first = month.startOf('month');
  const gridStart = first.subtract(isoWeekday(first) - 1, 'day');
  const todayKey = dayjs(now).format(DATE_FORMAT);
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => gridStart.add(w * 7 + d, 'day')));

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.monthDowRow}>
        {WEEKDAY_SHORT.map((w) => (
          <Text key={w} style={styles.monthDow}>
            {w}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.monthWeek}>
          {week.map((d) => {
            const key = d.format(DATE_FORMAT);
            const data = dayData.get(key);
            const inMonth = d.month() === month.month();
            const items = [
              ...(data?.events ?? []).map((o) => ({ key: o.key, title: o.event.title, color: o.color, filled: true })),
              ...(data?.tasks ?? []).filter((t) => t.status === 'active').map((t) => ({ key: t.id, title: t.title, color: taskColor(t), filled: false })),
            ];
            return (
              <Pressable
                key={key}
                style={[styles.monthCell, key === selected && styles.monthCellSelected]}
                onPress={() => handlers.onPressDay(key)}
                accessibilityRole="button"
                accessibilityLabel={`${d.format('D MMMM')}: ${items.length} записей`}
              >
                <View style={[styles.monthNum, key === todayKey && styles.todayCircle]}>
                  <Text style={[styles.monthNumText, !inMonth && styles.outMonth, key === todayKey && styles.todayText]}>{d.date()}</Text>
                </View>
                {items.slice(0, 3).map((it) => (
                  <View key={it.key} style={[styles.monthItem, it.filled ? { backgroundColor: withAlpha(it.color, 0.25) } : { borderLeftWidth: 2, borderLeftColor: it.color }]}>
                    <Text style={styles.monthItemText} numberOfLines={1}>
                      {it.title}
                    </Text>
                  </View>
                ))}
                {items.length > 3 ? <Text style={styles.monthMore}>+{items.length - 3}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------- Расписание ----------

export function AgendaView({
  days,
  now,
  hijriOffset,
  handlers,
}: {
  days: DayData[];
  now: Date;
  hijriOffset: number;
  handlers: ViewHandlers;
}) {
  const todayKey = dayjs(now).format(DATE_FORMAT);
  const withItems = days.filter((d) => d.events.length || d.tasks.length || d.date === todayKey);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      {withItems.length === 0 ? <Text style={styles.agendaEmpty}>В ближайшие недели ничего не запланировано.</Text> : null}
      {withItems.map((d) => {
        const dj = dayjs(d.date);
        return (
          <View key={d.date} style={styles.agendaDay}>
            <Pressable onPress={() => handlers.onPressDay(d.date)} accessibilityRole="button" style={styles.agendaHeader}>
              <Text style={[styles.agendaDate, d.date === todayKey && { color: COLORS.primary }]}>
                {d.date === todayKey ? 'Сегодня, ' : ''}
                {dj.format('dd, D MMMM')}
              </Text>
              <Text style={styles.agendaHijri}>{formatHijri(toHijri(d.date, hijriOffset))}</Text>
            </Pressable>
            {d.prayers.length ? (
              <Text style={styles.agendaPrayers} numberOfLines={1}>
                {d.prayers.map((p) => `${p.label} ${p.at.format('HH:mm')}`).join(' · ')}
              </Text>
            ) : null}
            {d.events.map((o) => (
              <Pressable key={o.key} style={styles.agendaItem} onPress={() => handlers.onPressEvent(o)} accessibilityRole="button">
                <View style={[styles.agendaBar, { backgroundColor: o.color }]} />
                <Text style={styles.agendaTime}>{o.event.allDay ? 'весь день' : o.start.format('HH:mm')}</Text>
                <Text style={styles.agendaTitle} numberOfLines={1}>
                  {o.event.title}
                </Text>
              </Pressable>
            ))}
            {d.tasks.map((t) => (
              <Pressable key={t.id} style={styles.agendaItem} onPress={() => handlers.onPressTask(t)} accessibilityRole="button">
                <View style={[styles.agendaBar, { backgroundColor: taskColor(t) }]} />
                <Text style={styles.agendaTime}>{t.due?.time ?? '—'}</Text>
                <Text style={[styles.agendaTitle, t.status === 'done' && styles.doneText]} numberOfLines={1}>
                  {t.status === 'done' ? '✓ ' : '○ '}
                  {t.title}
                </Text>
              </Pressable>
            ))}
            {!d.events.length && !d.tasks.length ? <Text style={styles.agendaEmpty}>Свободный день</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator, paddingVertical: 4 },
  weekHeaderCell: { flex: 1, alignItems: 'center' },
  weekHeaderDow: { fontSize: 11, color: COLORS.muted },
  weekHeaderNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  weekHeaderNumText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  todayCircle: { backgroundColor: COLORS.danger },
  todayText: { color: COLORS.onAccent },

  allDayRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator, paddingVertical: 4 },
  allDayCell: { flex: 1, paddingHorizontal: 2, gap: 2 },
  allDayChip: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, borderLeftWidth: 2 },
  allDayText: { fontSize: 11, color: COLORS.text, fontWeight: '500' },
  taskChip: { backgroundColor: COLORS.hover, borderLeftWidth: 2 },
  allDayTaskText: { fontSize: 11, color: COLORS.text },

  hourLabel: { position: 'absolute', right: 6, fontSize: 10, color: COLORS.tertiary },
  dayColumn: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: COLORS.separator },
  dayColumnCompact: {},
  hourSlot: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.subtle },
  prayerLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderTopColor: withAlpha(PRAYER, 0.7) },
  prayerLabel: {
    position: 'absolute',
    right: 4,
    top: -15,
    fontSize: 10,
    fontWeight: '600',
    color: PRAYER,
    backgroundColor: COLORS.background,
    paddingHorizontal: 3,
  },
  block: { position: 'absolute', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderLeftWidth: 3 },
  blockTitle: { fontSize: 12, fontWeight: '500', color: COLORS.text },
  blockMeta: { fontSize: 11, color: COLORS.muted },
  taskBlock: { backgroundColor: COLORS.hover, borderLeftWidth: 3 },
  taskBlockTitle: { fontSize: 12, color: COLORS.text },
  doneText: { color: COLORS.tertiary, textDecorationLine: 'line-through' },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: COLORS.danger },

  monthDowRow: { flexDirection: 'row', paddingVertical: 6 },
  monthDow: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted },
  monthWeek: { flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.separator },
  monthCell: { flex: 1, padding: 2, minHeight: 64, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: COLORS.separator },
  monthCellSelected: { backgroundColor: COLORS.hover },
  monthNum: { alignSelf: 'center', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  monthNumText: { fontSize: 12, color: COLORS.text },
  outMonth: { color: COLORS.disabled },
  monthItem: { borderRadius: 3, paddingHorizontal: 2, marginTop: 1, backgroundColor: COLORS.hover },
  monthItemText: { fontSize: 9, color: COLORS.text },
  monthMore: { fontSize: 9, color: COLORS.muted, textAlign: 'center' },

  agendaDay: { marginBottom: 18 },
  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  agendaDate: { fontSize: 15, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  agendaHijri: { fontSize: 11, color: COLORS.muted },
  agendaPrayers: { fontSize: 11, color: PRAYER, marginBottom: 6 },
  agendaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.separator },
  agendaBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  agendaTime: { width: 64, fontSize: 12, color: COLORS.muted },
  agendaTitle: { flex: 1, fontSize: 14, color: COLORS.text },
  agendaEmpty: { fontSize: 13, color: COLORS.muted, paddingVertical: 4 },
});
