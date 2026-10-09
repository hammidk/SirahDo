// Трекер привычек (docs/spec/habits.md): вверху неделя с кружками выполнения (листается
// свайпом), ниже — привычки выбранного дня карточками: каждое выполнение заливает
// карточку цветом привычки. Без штрафов: невыполненный день — просто пустой кружок,
// рядом с серией всегда видна лучшая серия.

import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../themed';
import { router } from 'expo-router';
import { Icon } from '../Icon';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import type { Habit } from '../../lib/types';
import { bestStreak, countOn, currentStreak, dayProgress, isScheduled, logIndex } from '../../lib/habits';
import { DATE_FORMAT, WEEKDAY_SHORT, startOfIsoWeek, todayKey } from '../../lib/dates';
import { useNow } from '../../lib/hooks';
import { Fab } from '../Fab';
import { HabitIcon } from '../HabitIcon';
import { SwipePager } from '../SwipePager';
import { COLORS } from '../ui';
import { readableOn, withAlpha } from '../../theme/colors';


export function TrackerPage() {
  const { habits, habitLogs, setHabitCount } = useAppData();
  useNow(60_000); // обновление в полночь
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfIsoWeek(dayjs()).format(DATE_FORMAT));

  const index = useMemo(() => logIndex(habitLogs), [habitLogs]);
  const active = useMemo(() => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order), [habits]);
  const week = Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day').format(DATE_FORMAT));

  const scheduled = active.filter((h) => isScheduled(h, selected));
  const rest = active.filter((h) => !isScheduled(h, selected));
  const isFuture = selected > today;

  const shiftWeek = (dir: 1 | -1) => setWeekStart((w) => dayjs(w).add(dir, 'week').format(DATE_FORMAT));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={styles.weekCard}>
          <View style={styles.weekNav}>
            <Pressable onPress={() => shiftWeek(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Предыдущая неделя">
              <Icon name="chevron-back" size={20} color={COLORS.muted} />
            </Pressable>
            <Text style={styles.weekTitle}>
              {dayjs(weekStart).format('D MMM')} – {dayjs(weekStart).add(6, 'day').format('D MMM')}
            </Text>
            <Pressable onPress={() => shiftWeek(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Следующая неделя">
              <Icon name="chevron-forward" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <SwipePager onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)}>
            <View style={styles.weekRow}>
              {week.map((d, i) => {
                const p = dayProgress(active, index, d);
                const future = d > today;
                const full = p.total > 0 && p.done === p.total;
                return (
                  <Pressable
                    key={d}
                    style={styles.dayCell}
                    onPress={() => setSelected(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayjs(d).format('D MMMM')}: выполнено ${p.done} из ${p.total}`}
                    accessibilityState={{ selected: d === selected }}
                  >
                    <Text style={[styles.dow, d === today && styles.dowToday]}>{WEEKDAY_SHORT[i]}</Text>
                    <View
                      style={[
                        styles.circle,
                        p.total === 0 && styles.circleEmpty,
                        !future && p.total > 0 && { backgroundColor: withAlpha(COLORS.success, 0.1 + 0.6 * p.ratio), borderColor: withAlpha(COLORS.success, 0.6) },
                        full && styles.circleFull,
                        d === selected && styles.circleSelected,
                      ]}
                    >
                      {full ? (
                        <Icon name="check" size={16} color={COLORS.onAccent} />
                      ) : (
                        <Text style={styles.circleNum}>{dayjs(d).date()}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </SwipePager>
          {selected !== today ? (
            <Pressable
              onPress={() => {
                setSelected(today);
                setWeekStart(startOfIsoWeek(dayjs()).format(DATE_FORMAT));
              }}
              accessibilityRole="button"
            >
              <Text style={styles.backToday}>К сегодня</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {selected === today ? 'Сегодня' : dayjs(selected).format('dddd, D MMMM')}
          </Text>
          <Pressable
            onPress={() => router.push('/habit/stats')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Статистика привычек"
          >
            <Icon name="stats" size={22} color={COLORS.muted} />
          </Pressable>
        </View>

        {active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Начните с одной маленькой привычки</Text>
            <Text style={styles.emptyText}>
              Например, «Зикр после намаза — 5 раз в день» или «Страница Корана». Постепенно, без давления: пропуск не обнуляет
              ваш путь.
            </Text>
          </View>
        ) : null}
        {active.length > 0 && scheduled.length === 0 ? <Text style={styles.hint}>На этот день привычек по плану нет.</Text> : null}

        {scheduled.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            count={countOn(index, h.id, selected)}
            streak={currentStreak(h, index, today)}
            best={bestStreak(h, index, today)}
            disabled={isFuture}
            onSet={(c) => setHabitCount(h.id, selected, c)}
          />
        ))}

        {rest.length > 0 ? (
          <>
            <Text style={styles.subTitle}>Не по плану в этот день</Text>
            {rest.map((h) => (
              <Pressable key={h.id} style={styles.restRow} onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button">
                <HabitIcon id={h.icon} size={16} color={COLORS.tertiary} />
                <Text style={styles.restName}>{h.name}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      <Fab accessibilityLabel="Новая привычка" onPress={() => router.push('/habit/new')} />
    </View>
  );
}

function HabitCard({
  habit,
  count,
  streak,
  best,
  disabled,
  onSet,
}: {
  habit: Habit;
  count: number;
  streak: number;
  best: number;
  disabled: boolean;
  onSet: (count: number) => void;
}) {
  const target = habit.targetCountPerDay;
  const done = count >= target;
  const ratio = Math.min(1, count / target);

  // Заливка карточки цветом привычки растёт плавно с каждым выполнением.
  const [fill] = useState(() => new Animated.Value(ratio));
  useEffect(() => {
    Animated.timing(fill, { toValue: ratio, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, ratio]);
  const fillWidth = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // Кнопка: +1 до цели; для привычки «1 раз» — переключатель выполнено/нет.
  const onMain = () => {
    if (disabled) return;
    if (target === 1) onSet(done ? 0 : 1);
    else if (!done) onSet(count + 1);
  };

  const meta =
    [streak > 0 ? `серия ${streak}` : null, best > 0 ? `лучшая ${best}` : null].filter(Boolean).join(' · ') ||
    'Первый шаг самый важный';

  return (
    <View style={styles.habitCard}>
      <Animated.View style={[styles.habitFill, { width: fillWidth, backgroundColor: withAlpha(habit.color, 0.22) }]} />
      <Pressable
        style={styles.habitBody}
        onPress={() => router.push(`/habit/${habit.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, ${Math.min(count, target)} из ${target}. Изменить`}
      >
        <View style={[styles.habitIconWrap, { backgroundColor: withAlpha(habit.color, 0.18) }]}>
          <HabitIcon id={habit.icon} size={20} color={habit.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.habitName} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.habitMeta} numberOfLines={1}>
            {target > 1 ? `${Math.min(count, target)} из ${target} · ` : ''}
            {meta}
          </Text>
        </View>
      </Pressable>
      {target > 1 && count > 0 && !disabled ? (
        <Pressable onPress={() => onSet(count - 1)} hitSlop={8} style={styles.minus} accessibilityRole="button" accessibilityLabel="Минус одно выполнение">
          <Icon name="remove" size={16} color={COLORS.muted} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onMain}
        disabled={disabled}
        style={[
          styles.mainButton,
          { borderColor: habit.color },
          done && { backgroundColor: habit.color },
          disabled && { opacity: 0.35 },
        ]}
        accessibilityRole={target === 1 ? 'checkbox' : 'button'}
        accessibilityState={{ checked: done, disabled }}
        accessibilityLabel={target === 1 ? (done ? 'Снять отметку' : 'Отметить выполнение') : `Плюс одно выполнение, сейчас ${count} из ${target}`}
      >
        {done ? (
          <Icon name="check" size={20} color={readableOn(habit.color)} strokeWidth={2.5} />
        ) : target > 1 ? (
          <Text style={[styles.plus, { color: habit.color }]}>+1</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  weekCard: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12 },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', gap: 6, flex: 1 },
  dow: { fontSize: 11, color: COLORS.muted },
  dowToday: { color: COLORS.primary, fontWeight: '700' },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmpty: { borderStyle: 'dashed' },
  circleFull: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  circleSelected: { borderWidth: 2, borderColor: COLORS.text },
  circleNum: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  backToday: { textAlign: 'center', color: COLORS.primary, fontSize: 13, marginTop: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  subTitle: { fontSize: 13, fontWeight: '500', color: COLORS.tertiary, marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 13, color: COLORS.muted, paddingVertical: 6 },
  empty: { backgroundColor: COLORS.card, borderRadius: 8, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  habitFill: { position: 'absolute', left: 0, top: 0, bottom: 0, pointerEvents: 'none' },
  habitBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIconWrap: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  habitName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  habitMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  minus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.hover },
  mainButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { fontSize: 14, fontWeight: '700' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  restName: { fontSize: 14, color: COLORS.muted },
});
