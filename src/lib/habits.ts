// Логика привычек (docs/spec/habits.md): расписание по дням недели, прогресс дня, серии и
// статистика. Принцип — постепенность без штрафов: пропуск не «сжигает»
// прогресс, поэтому рядом с текущей серией всегда показываем лучшую и общее
// количество выполнений. Сегодняшний день, пока он не прошёл, серию не рвёт.

import dayjs from 'dayjs';

import type { Habit, HabitLog } from './types';
import { DATE_FORMAT, isoWeekday } from './dates';

const MAX_DAYS_SCAN = 3700; // ~10 лет — предел перебора

export function habitStartDate(habit: Habit): string {
  return habit.createdAt ? dayjs(habit.createdAt).format(DATE_FORMAT) : '2000-01-01';
}

/** Запланирована ли привычка на дату (день недели в расписании и не раньше создания). */
export function isScheduled(habit: Habit, date: string): boolean {
  if (habit.archived) return false;
  if (date < habitStartDate(habit)) return false;
  return habit.weekdays.includes(isoWeekday(dayjs(date)));
}

export function logIndex(logs: HabitLog[]): Map<string, number> {
  return new Map(logs.map((l) => [`${l.habitId}_${l.date}`, l.completedCount]));
}

export function countOn(index: Map<string, number>, habitId: string, date: string): number {
  return index.get(`${habitId}_${date}`) ?? 0;
}

export function isDone(habit: Habit, index: Map<string, number>, date: string): boolean {
  return countOn(index, habit.id, date) >= habit.targetCountPerDay;
}

/** Прогресс дня по всем запланированным привычкам: доля выполненных (частичные засчитываются долей). */
export function dayProgress(habits: Habit[], index: Map<string, number>, date: string) {
  const scheduled = habits.filter((h) => isScheduled(h, date));
  if (scheduled.length === 0) return { total: 0, done: 0, ratio: 0 };
  let sum = 0;
  let done = 0;
  for (const h of scheduled) {
    const c = Math.min(countOn(index, h.id, date), h.targetCountPerDay);
    sum += c / h.targetCountPerDay;
    if (c >= h.targetCountPerDay) done++;
  }
  return { total: scheduled.length, done, ratio: sum / scheduled.length };
}

/** Текущая серия: подряд выполненные запланированные дни, считая назад от сегодня. */
export function currentStreak(habit: Habit, index: Map<string, number>, today: string): number {
  let streak = 0;
  let d = dayjs(today);
  const start = habitStartDate(habit);
  for (let i = 0; i < MAX_DAYS_SCAN; i++) {
    const key = d.format(DATE_FORMAT);
    if (key < start) break;
    if (isScheduled(habit, key)) {
      if (isDone(habit, index, key)) streak++;
      else if (key !== today) break; // сегодня ещё можно успеть
    }
    d = d.subtract(1, 'day');
  }
  return streak;
}

/** Лучшая серия за всё время (по запланированным дням до сегодня включительно). */
export function bestStreak(habit: Habit, index: Map<string, number>, today: string): number {
  let best = 0;
  let run = 0;
  let d = dayjs(habitStartDate(habit));
  for (let i = 0; i < MAX_DAYS_SCAN; i++) {
    const key = d.format(DATE_FORMAT);
    if (key > today) break;
    if (isScheduled(habit, key)) {
      if (isDone(habit, index, key)) {
        run++;
        best = Math.max(best, run);
      } else if (key !== today) {
        run = 0;
      }
    }
    d = d.add(1, 'day');
  }
  return best;
}

export interface PeriodStats {
  scheduledDays: number;
  doneDays: number;
  rate: number; // 0..1
  totalCount: number; // сумма отметок за период (для «Зикр ×5» — все нажатия)
}

/** Статистика привычки за период [from, to] (to обрезается сегодняшним днём). */
export function periodStats(habit: Habit, index: Map<string, number>, from: string, to: string, today: string): PeriodStats {
  const end = to < today ? to : today;
  let scheduledDays = 0;
  let doneDays = 0;
  let totalCount = 0;
  let d = dayjs(from);
  for (let i = 0; i < MAX_DAYS_SCAN; i++) {
    const key = d.format(DATE_FORMAT);
    if (key > end) break;
    totalCount += countOn(index, habit.id, key);
    if (isScheduled(habit, key)) {
      scheduledDays++;
      if (isDone(habit, index, key)) doneDays++;
    }
    d = d.add(1, 'day');
  }
  return { scheduledDays, doneDays, rate: scheduledDays ? doneDays / scheduledDays : 0, totalCount };
}

/** Всего дней, когда привычка выполнена полностью. */
export function totalDoneDays(habit: Habit, logs: HabitLog[]): number {
  return logs.filter((l) => l.habitId === habit.id && l.completedCount >= habit.targetCountPerDay).length;
}

// Набор иконок привычек (line-иконки в стиле Notion, рисует components/HabitIcon.tsx):
// 17 под типичные привычки + 4 нейтральные, чтобы подходящая нашлась для любой.
export const HABIT_ICONS: { id: string; label: string }[] = [
  { id: 'water', label: 'Вода' },
  { id: 'sleep', label: 'Сон' },
  { id: 'sport', label: 'Спорт' },
  { id: 'book', label: 'Книга' },
  { id: 'prayer', label: 'Молитва, размышление' },
  { id: 'food', label: 'Здоровое питание' },
  { id: 'cardio', label: 'Зарядка, бег' },
  { id: 'money', label: 'Финансы' },
  { id: 'study', label: 'Работа, учёба' },
  { id: 'tea', label: 'Чай, кофе' },
  { id: 'no-smoking', label: 'Без сигарет' },
  { id: 'phone', label: 'Экранное время' },
  { id: 'walk', label: 'Прогулка' },
  { id: 'pills', label: 'Витамины' },
  { id: 'cleaning', label: 'Уборка' },
  { id: 'music', label: 'Музыка' },
  { id: 'journal', label: 'Дневник' },
  { id: 'star', label: 'Звезда' },
  { id: 'check', label: 'Галочка' },
  { id: 'dot', label: 'Круг' },
  { id: 'flag', label: 'Флажок' },
];

export const DEFAULT_HABIT_ICON = 'check';
