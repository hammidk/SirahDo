// Правила повторения (docs/SPEC.md, «Повторение»): пресеты, человекочитаемое описание и расчёт дат
// вхождений. Работаем с датами дней (YYYY-MM-DD); время события/задачи хранится
// отдельно и к каждому вхождению применяется одинаково.

import dayjs, { Dayjs } from 'dayjs';

import type { Recurrence, RecurrenceFreq } from './types';
import { DATE_FORMAT, WEEKDAY_SHORT, isoWeekday, startOfIsoWeek } from './dates';

export type RecurrencePresetId = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export const RECURRENCE_PRESETS: { id: RecurrencePresetId; title: string }[] = [
  { id: 'none', title: 'Не повторять' },
  { id: 'daily', title: 'Каждый день' },
  { id: 'weekdays', title: 'По будням (Пн–Пт)' },
  { id: 'weekly', title: 'Каждую неделю' },
  { id: 'monthly', title: 'Каждый месяц' },
  { id: 'yearly', title: 'Каждый год' },
];

/** Правило для пресета. Для еженедельного повтора берём день недели даты начала. */
export function presetToRule(id: RecurrencePresetId, startDate: string): Recurrence | undefined {
  const start = dayjs(startDate);
  switch (id) {
    case 'none':
      return undefined;
    case 'daily':
      return { freq: 'day', interval: 1 };
    case 'weekdays':
      return { freq: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5] };
    case 'weekly':
      return { freq: 'week', interval: 1, weekdays: [isoWeekday(start)] };
    case 'monthly':
      return { freq: 'month', interval: 1 };
    case 'yearly':
      return { freq: 'year', interval: 1 };
  }
}

/** Какому пресету соответствует правило (или 'custom', если ни одному). */
export function ruleToPreset(rule: Recurrence | undefined, startDate: string): RecurrencePresetId | 'custom' {
  if (!rule) return 'none';
  if (rule.until || rule.count) return 'custom';
  for (const p of RECURRENCE_PRESETS) {
    if (p.id === 'none') continue;
    const candidate = presetToRule(p.id, startDate);
    if (candidate && sameRule(candidate, rule)) return p.id;
  }
  return 'custom';
}

function sameRule(a: Recurrence, b: Recurrence): boolean {
  const wa = normalizeWeekdays(a).join(',');
  const wb = normalizeWeekdays(b).join(',');
  return a.freq === b.freq && a.interval === b.interval && (a.freq !== 'week' || wa === wb);
}

function normalizeWeekdays(rule: Recurrence, fallbackStart?: Dayjs): number[] {
  const list = rule.weekdays && rule.weekdays.length > 0
    ? rule.weekdays
    : fallbackStart
      ? [isoWeekday(fallbackStart)]
      : [];
  return [...new Set(list)].filter((d) => d >= 1 && d <= 7).sort((x, y) => x - y);
}

const UNIT_FORMS: Record<RecurrenceFreq, [string, string, string]> = {
  day: ['день', 'дня', 'дней'],
  week: ['неделю', 'недели', 'недель'],
  month: ['месяц', 'месяца', 'месяцев'],
  year: ['год', 'года', 'лет'],
};

/** Русское склонение по числу: 1 день, 2 дня, 5 дней. */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function freqUnitLabel(freq: RecurrenceFreq, n: number): string {
  return plural(n, UNIT_FORMS[freq]);
}

/** «Каждый день», «Каждые 2 недели: Пн, Ср», «Каждый месяц, до 1 дек.», «… , 10 раз». */
export function describeRecurrence(rule: Recurrence | undefined, startDate?: string): string {
  if (!rule) return 'Не повторять';
  if (startDate) {
    const preset = ruleToPreset(rule, startDate);
    if (preset !== 'custom' && preset !== 'none') {
      return RECURRENCE_PRESETS.find((p) => p.id === preset)!.title;
    }
  }
  const n = Math.max(1, rule.interval);
  let text: string;
  if (n === 1) {
    const every = { day: 'Каждый день', week: 'Каждую неделю', month: 'Каждый месяц', year: 'Каждый год' };
    text = every[rule.freq];
  } else {
    text = `Каждые ${n} ${freqUnitLabel(rule.freq, n)}`;
  }
  if (rule.freq === 'week' && rule.weekdays && rule.weekdays.length > 0) {
    text += `: ${normalizeWeekdays(rule).map((d) => WEEKDAY_SHORT[d - 1]).join(', ')}`;
  }
  if (rule.until) text += `, до ${dayjs(rule.until).format('D MMM YYYY')}`;
  if (rule.count) text += `, ${rule.count} ${plural(rule.count, ['раз', 'раза', 'раз'])}`;
  return text;
}

const MAX_ITERATIONS = 5000;

/**
 * Перебирает даты вхождений правила начиная с startDate (первое вхождение —
 * сама startDate, если она подходит под правило) в хронологическом порядке.
 * Колбэк возвращает false, чтобы остановиться.
 */
function iterate(rule: Recurrence, startDate: string, visit: (date: string) => boolean): void {
  const start = dayjs(startDate).startOf('day');
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  let emitted = 0;

  const emit = (d: Dayjs): boolean => {
    const key = d.format(DATE_FORMAT);
    if (rule.until && key > rule.until) return false;
    if (rule.count && emitted >= rule.count) return false;
    emitted++;
    return visit(key);
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    switch (rule.freq) {
      case 'day': {
        if (!emit(start.add(i * interval, 'day'))) return;
        break;
      }
      case 'week': {
        const weekStart = startOfIsoWeek(start).add(i * interval, 'week');
        for (const wd of normalizeWeekdays(rule, start)) {
          const d = weekStart.add(wd - 1, 'day');
          if (d.isBefore(start)) continue;
          if (!emit(d)) return;
        }
        break;
      }
      case 'month': {
        // Ежемесячно 31-го: месяцы без 31-го пропускаются (как в Google Calendar).
        const d = start.startOf('month').add(i * interval, 'month');
        if (start.date() <= d.daysInMonth()) {
          if (!emit(d.date(start.date()))) return;
        }
        break;
      }
      case 'year': {
        // Ежегодно 29 февраля — только в високосные годы.
        const d = start.startOf('month').add(i * interval, 'year');
        if (start.date() <= d.daysInMonth()) {
          if (!emit(d.date(start.date()))) return;
        }
        break;
      }
    }
  }
}

/** Даты вхождений в диапазоне [from, to] включительно. */
export function occurrencesBetween(
  rule: Recurrence,
  startDate: string,
  from: string,
  to: string,
  limit = 500
): string[] {
  const result: string[] = [];
  iterate(rule, startDate, (date) => {
    if (date > to) return false;
    if (date >= from) result.push(date);
    return result.length < limit;
  });
  return result;
}

/** Первое вхождение строго после afterDate, либо undefined, если повторы закончились. */
export function nextOccurrenceAfter(rule: Recurrence, startDate: string, afterDate: string): string | undefined {
  let found: string | undefined;
  iterate(rule, startDate, (date) => {
    if (date > afterDate) {
      found = date;
      return false;
    }
    return true;
  });
  return found;
}

/** Попадает ли дата в правило (используется календарём и историей). */
export function occursOn(rule: Recurrence, startDate: string, date: string): boolean {
  if (date < startDate) return false;
  return occurrencesBetween(rule, startDate, date, date, 1).length === 1;
}
