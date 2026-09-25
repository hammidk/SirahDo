// Блоки экрана «Сегодня» (ТЗ §9): текущее окно с таймером, «Фокус дня»,
// секции окон намаза с задачами и событиями, привычки на сегодня, вечерний итог.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './themed';
import { Icon } from './Icon';
import dayjs from 'dayjs';
import { router } from 'expo-router';

import type { Habit, HabitLog, NamazWindow, Task } from '../lib/types';
import { NAMAZ_WINDOW_END_PRAYER, NAMAZ_WINDOW_START_PRAYER } from '../lib/types';
import type { EventOccurrence } from '../lib/events';
import type { FocusItem } from '../lib/dayFocus';
import type { WindowPlan } from '../lib/dayPlan';
import { minutesLeft, windowProgress } from '../lib/dayPlan';
import { formatMinutes } from '../lib/dates';
import { TaskCard } from './TaskCard';
import { COLORS } from './ui';
import { tagBackground } from '../theme/colors';

// Намаз и окна — жёлтый акцент (как в задании: текущее окно — bg-hover + акцентная полоска).
const ACCENT = COLORS.warning;

// ---------- Текущее окно ----------

export function NowCard({
  current,
  now,
  hasLocation,
  onSetupLocation,
}: {
  current?: NamazWindow;
  now: Date;
  hasLocation: boolean;
  onSetupLocation: () => void;
}) {
  if (!hasLocation) {
    return (
      <Pressable style={[styles.card, styles.setupCard]} onPress={onSetupLocation} accessibilityRole="button">
        <Icon name="location" size={22} color={COLORS.muted} />
        <View style={{ flex: 1 }}>
          <Text style={styles.setupTitle}>Укажите местоположение</Text>
          <Text style={styles.setupText}>Чтобы посчитать время намазов и разложить день по окнам.</Text>
        </View>
        <Icon name="chevron-forward" size={18} color={COLORS.muted} />
      </Pressable>
    );
  }
  if (!current) return null;

  const left = minutesLeft(current, now);
  const progress = windowProgress(current, now);
  return (
    <View style={[styles.card, styles.nowCard]} accessibilityRole="summary">
      <Text style={styles.nowLabel}>Сейчас</Text>
      <Text style={styles.nowTitle}>{current.title}</Text>
      <Text style={styles.nowLeft}>
        до {NAMAZ_WINDOW_END_PRAYER[current.name]} — {formatMinutes(left)} · в {dayjs(current.end).format('HH:mm')}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

// ---------- Фокус дня ----------

export function FocusCard({ items }: { items: FocusItem[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Фокус дня</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.focusRow}>
          <Text style={styles.focusIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTitle}>{item.title}</Text>
            <Text style={styles.focusText}>{item.text}</Text>
          </View>
        </View>
      ))}
      {/* Заглушка ИИ-слоя (ТЗ §11): без логики, только место под будущие рекомендации. */}
      <View style={styles.aiStub} accessibilityState={{ disabled: true }}>
        <Icon name="sparkles" size={16} color={COLORS.ai} />
        <Text style={styles.aiStubText}>Рекомендации ИИ — дуа, азкары, пересборка дня</Text>
        <Text style={styles.aiBadge}>скоро</Text>
      </View>
    </View>
  );
}

// ---------- Привычки на сегодня ----------

export function HabitsToday({
  habits,
  logs,
  onSetCount,
}: {
  habits: Habit[];
  logs: HabitLog[];
  onSetCount: (habit: Habit, count: number) => void;
}) {
  if (habits.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Привычки</Text>
      <View style={styles.habitsRow}>
        {habits.map((h) => {
          const count = logs.find((l) => l.habitId === h.id)?.completedCount ?? 0;
          const done = count >= h.targetCountPerDay;
          return (
            <Pressable
              key={h.id}
              style={[styles.habitChip, done && styles.habitChipDone]}
              // Тап — +1 (до цели), долгое нажатие — сбросить отметку за сегодня.
              onPress={() => !done && onSetCount(h, count + 1)}
              onLongPress={() => onSetCount(h, 0)}
              accessibilityRole="button"
              accessibilityLabel={`${h.name}: ${count} из ${h.targetCountPerDay}`}
              accessibilityHint="Нажмите, чтобы отметить. Удерживайте, чтобы сбросить."
            >
              <Text style={styles.habitIcon}>{h.icon}</Text>
              <Text style={[styles.habitName, done && styles.habitNameDone]} numberOfLines={1}>
                {h.name}
              </Text>
              {h.targetCountPerDay > 1 || done ? (
                <Text style={[styles.habitCount, done && styles.habitNameDone]}>
                  {done ? '✓' : `${count}/${h.targetCountPerDay}`}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Секции ленты ----------

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function EventRow({ occ }: { occ: EventOccurrence }) {
  const time = occ.event.allDay ? 'Весь день' : `${occ.start.format('HH:mm')}–${occ.end.format('HH:mm')}`;
  return (
    <Pressable
      style={styles.eventRow}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: occ.event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Событие: ${occ.event.title}, ${time}`}
    >
      <View style={[styles.eventBar, { backgroundColor: occ.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {occ.event.title}
        </Text>
        <Text style={styles.eventMeta} numberOfLines={1}>
          {[time, occ.event.location].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

export function WindowSection({ plan, onAdd }: { plan: WindowPlan; onAdd: () => void }) {
  const { window: w, status, tasks, events, freeMinutes } = plan;
  const empty = tasks.length === 0 && events.length === 0;
  const past = status === 'past';

  return (
    <View style={[styles.windowBlock, past && empty && styles.windowPast]}>
      {/* Намаз — несдвигаемый якорь: разделитель с временем начала окна. */}
      <View style={styles.prayerDivider}>
        <View style={[styles.prayerDot, status === 'current' && styles.prayerDotCurrent]} />
        <Text style={[styles.prayerName, status === 'current' && styles.prayerNameCurrent]}>
          {NAMAZ_WINDOW_START_PRAYER[w.name]} · {dayjs(w.start).format('HH:mm')}
        </Text>
        <View style={styles.prayerLine} />
        {!past ? (
          <Pressable
            onPress={onAdd}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Добавить задачу в окно ${w.title}`}
          >
            <Icon name="add-circle" size={20} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.windowBody, status === 'current' && styles.windowBodyCurrent]}>
        <Text style={styles.windowTitle}>
          {w.title}
          {status === 'current' ? ' · сейчас' : ''}
        </Text>
        {events.map((occ) => (
          <EventRow key={occ.key} occ={occ} />
        ))}
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} showProject />
        ))}
        {freeMinutes != null && freeMinutes >= 15 ? (
          <Text style={styles.freeText}>
            {empty ? 'Свободно' : 'Ещё свободно'} ≈ {formatMinutes(freeMinutes)}
            {status === 'current' ? ' — время, которое можно наполнить благом' : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------- Вечерний итог ----------

export function EveningCard({
  highlighted,
  doneCount,
  habitsDone,
  habitsTotal,
  hasEntry,
  onOpenDiary,
}: {
  highlighted: boolean; // после Магриба — акцент на подведении итогов
  doneCount: number;
  habitsDone: number;
  habitsTotal: number;
  hasEntry: boolean;
  onOpenDiary: () => void;
}) {
  return (
    <View style={[styles.card, highlighted && styles.eveningHighlighted]}>
      <Text style={styles.cardTitle}>{highlighted ? 'Вечер — время подвести итоги' : 'Итоги дня'}</Text>
      <Text style={styles.eveningStats}>
        Выполнено задач: {doneCount}
        {habitsTotal > 0 ? ` · привычек: ${habitsDone} из ${habitsTotal}` : ''}
      </Text>
      <Pressable
        style={[styles.eveningButton, highlighted && styles.eveningButtonPrimary]}
        onPress={onOpenDiary}
        accessibilityRole="button"
      >
        <Icon name="diary" size={16} color={highlighted ? COLORS.onAccent : COLORS.text} />
        <Text style={[styles.eveningButtonText, highlighted && { color: COLORS.onAccent }]}>
          {hasEntry ? 'Открыть запись в дневнике' : 'Анализ дня → дневник'}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------- Просроченные ----------

export function OverdueSection({ tasks, onMoveToToday }: { tasks: Task[]; onMoveToToday: () => void }) {
  if (tasks.length === 0) return null;
  return (
    <View>
      <SectionHeader
        title="Просрочено"
        right={
          <Pressable onPress={onMoveToToday} hitSlop={8} accessibilityRole="button">
            <Text style={styles.linkText}>Перенести на сегодня</Text>
          </Pressable>
        }
      />
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} showProject />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 6 },

  setupCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setupTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  setupText: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  nowCard: { backgroundColor: COLORS.hover, borderLeftWidth: 3, borderLeftColor: ACCENT },
  nowLabel: { fontSize: 12, fontWeight: '500', color: COLORS.muted },
  nowTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  nowLeft: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: COLORS.separator, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: ACCENT },

  focusRow: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  focusIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  focusTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  focusText: { fontSize: 13, color: COLORS.muted, marginTop: 1, lineHeight: 19 },
  aiStub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.aiBackground,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  aiStubText: { flex: 1, fontSize: 13, color: COLORS.ai },
  aiBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.ai,
    backgroundColor: COLORS.aiBackground,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  habitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.hover,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  habitChipDone: { backgroundColor: tagBackground(COLORS.success) },
  habitIcon: { fontSize: 14 },
  habitName: { fontSize: 13, color: COLORS.muted, flexShrink: 1 },
  habitNameDone: { color: COLORS.success },
  habitCount: { fontSize: 12, color: COLORS.tertiary, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  linkText: { fontSize: 13, color: COLORS.primary },

  windowBlock: { marginTop: 4 },
  windowPast: { opacity: 0.45 },
  prayerDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  prayerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.tertiary },
  prayerDotCurrent: { backgroundColor: ACCENT },
  prayerName: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  prayerNameCurrent: { color: COLORS.text },
  prayerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator },
  windowBody: { marginLeft: 2, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: COLORS.separator, paddingBottom: 2 },
  windowBodyCurrent: { borderLeftColor: ACCENT, borderLeftWidth: 2, backgroundColor: COLORS.hover, borderRadius: 6 },
  windowTitle: { fontSize: 12, color: COLORS.tertiary, marginBottom: 2, marginTop: 4 },
  freeText: { fontSize: 12, color: COLORS.tertiary, marginVertical: 6 },

  eventRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  eventBar: { width: 3, borderRadius: 2 },
  eventTitle: { fontSize: 15, color: COLORS.text },
  eventMeta: { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  eveningHighlighted: { backgroundColor: COLORS.aiBackground },
  eveningStats: { fontSize: 13, color: COLORS.muted },
  eveningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  eveningButtonPrimary: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  eveningButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
});
