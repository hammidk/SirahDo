// Блоки экрана «Сегодня» (docs/spec/today.md): ориентир намаза с датой, строка
// события, просроченные задачи, вечерний итог.

import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './themed';
import { Icon } from './Icon';
import dayjs from 'dayjs';
import { router } from 'expo-router';

import type { Task, UserSettings } from '../lib/types';
import { PRAYER_TITLES, PRAYER_TITLES_GENITIVE } from '../lib/types';
import type { EventOccurrence } from '../lib/events';
import { prayerStatus } from '../lib/prayerTimes';
import { formatDurationLong } from '../lib/dates';
import { useNow } from '../lib/hooks';
import { TaskCard } from './TaskCard';
import { CollapsibleSection } from './Collapsible';
import { COLORS } from './ui';

// Намаз — жёлтый акцент: текущее состояние видно по подсветке блока, а не по слову «сейчас».
const ACCENT = COLORS.warning;

// ---------- Ориентир намаза ----------

/**
 * Один активный ориентир вместо списка 5 окон: заголовок — наступивший намаз,
 * строка — «До Асра — 3 часа 2 минуты, в 16:17». Своя подписка на время (раз в
 * 10 секунд) — пересчитывается в реальном времени, не дёргая весь экран.
 * Дата (число, день недели, хиджра) — маленькой подписью сверху блока.
 */
export function PrayerCard({
  settings,
  dateLabel,
  onSetupLocation,
}: {
  settings: UserSettings;
  dateLabel: string;
  onSetupLocation: () => void;
}) {
  const now = useNow(10_000);
  const status = prayerStatus(now, settings);

  if (!status) {
    return (
      <Pressable style={[styles.card, styles.setupCard]} onPress={onSetupLocation} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.setupTitle}>Укажите местоположение</Text>
          <Text style={styles.setupText}>Чтобы посчитать время намазов.</Text>
        </View>
        <Icon name="location" size={20} color={COLORS.muted} />
        <Icon name="chevron-forward" size={18} color={COLORS.muted} />
      </Pressable>
    );
  }

  // Оставшееся время округляем вверх: «1 минута», пока не наступило время намаза.
  const left = Math.ceil((status.nextAt.getTime() - now.getTime()) / 60_000);
  const span = status.nextAt.getTime() - status.since.getTime();
  const progress = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - status.since.getTime()) / span)) : 0;
  const countdown = `До ${PRAYER_TITLES_GENITIVE[status.next]} — ${formatDurationLong(left)}, в ${dayjs(status.nextAt).format('HH:mm')}`;

  return (
    <View
      style={[styles.card, styles.prayerCard]}
      accessibilityRole="summary"
      accessibilityLabel={[dateLabel, status.current ? PRAYER_TITLES[status.current] : null, countdown].filter(Boolean).join('. ')}
    >
      <Text style={styles.dateLabel}>{dateLabel}</Text>
      {status.current ? <Text style={styles.prayerTitle}>{PRAYER_TITLES[status.current]}</Text> : null}
      <Text style={[styles.countdown, !status.current && styles.countdownMain]}>{countdown}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

// ---------- Строки ----------

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
    <CollapsibleSection
      title="Просрочено"
      count={tasks.length}
      right={
        <Pressable onPress={onMoveToToday} hitSlop={8} accessibilityRole="button">
          <Text style={styles.linkText}>Перенести на сегодня</Text>
        </Pressable>
      }
    >
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} showProject />
      ))}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 6 },

  setupCard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setupTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  setupText: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  prayerCard: { backgroundColor: COLORS.hover, borderLeftWidth: 3, borderLeftColor: ACCENT },
  dateLabel: { fontSize: 12, color: COLORS.muted },
  prayerTitle: { fontSize: 22, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  countdown: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  countdownMain: { fontSize: 17, fontWeight: '500', color: COLORS.text, marginTop: 6 },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: COLORS.separator, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: ACCENT },

  linkText: { fontSize: 13, color: COLORS.primary },

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
