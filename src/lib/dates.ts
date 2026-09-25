// Небольшие помощники для дат. Даты дней храним строками YYYY-MM-DD в локальном
// времени, моменты — ISO-строками.

import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/ru';

import type { TaskDue } from './types';

dayjs.locale('ru');

export const DATE_FORMAT = 'YYYY-MM-DD';

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']; // индекс = ISO-день − 1

export function toDateKey(d: Dayjs | Date | string): string {
  return dayjs(d).format(DATE_FORMAT);
}

export function todayKey(): string {
  return dayjs().format(DATE_FORMAT);
}

/** ISO-день недели без плагина: 1 = Пн … 7 = Вс. */
export function isoWeekday(d: Dayjs): number {
  return ((d.day() + 6) % 7) + 1;
}

/** Понедельник недели, в которую попадает дата. */
export function startOfIsoWeek(d: Dayjs): Dayjs {
  return d.startOf('day').subtract(isoWeekday(d) - 1, 'day');
}

/** "HH:mm" → { hour, minute } или null, если строка некорректна. */
export function parseTime(time?: string): { hour: number; minute: number } | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// Допущение: у задачи без времени напоминания считаются от 09:00 дня срока
// (как делают Todoist/Google Tasks для задач «на весь день»).
export const ALL_DAY_REMINDER_HOUR = 9;

/** Момент срока задачи: дата + время, либо 09:00 для задач без времени. */
export function dueMoment(due: TaskDue): Dayjs {
  const base = dayjs(due.date).startOf('day');
  const t = parseTime(due.time);
  return t ? base.hour(t.hour).minute(t.minute) : base.hour(ALL_DAY_REMINDER_HOUR);
}

/** Сортировочный ключ задачи по сроку: задачи без времени идут перед задачами со временем. */
export function dueSortKey(due?: TaskDue): string {
  if (!due) return '9999-99-99';
  return `${due.date} ${due.time ?? '00:00'}`;
}

/** Человекочитаемый срок: «Сегодня», «Завтра 14:30», «Пт, 3 окт.». */
export function formatDue(due: TaskDue): string {
  const d = dayjs(due.date);
  const today = dayjs().startOf('day');
  const diff = d.startOf('day').diff(today, 'day');
  let day: string;
  if (diff === 0) day = 'Сегодня';
  else if (diff === 1) day = 'Завтра';
  else if (diff === -1) day = 'Вчера';
  else if (d.year() === today.year()) day = d.format('dd, D MMM');
  else day = d.format('D MMM YYYY');
  return due.time ? `${day} ${due.time}` : day;
}

export function isOverdue(due: TaskDue, now: Dayjs = dayjs()): boolean {
  if (due.time) return dueMoment(due).isBefore(now);
  return due.date < now.format(DATE_FORMAT);
}

/** Русское склонение по числу: 1 день, 2 дня, 5 дней. */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** 182 → «3 часа 2 минуты», 42 → «42 минуты», 60 → «1 час», 0 → «меньше минуты». */
export function formatDurationLong(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m === 0) return 'меньше минуты';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const hours = h > 0 ? `${h} ${plural(h, ['час', 'часа', 'часов'])}` : '';
  const minutes = rest > 0 ? `${rest} ${plural(rest, ['минута', 'минуты', 'минут'])}` : '';
  return [hours, minutes].filter(Boolean).join(' ');
}

/** 75 → «1 ч 15 мин», 40 → «40 мин», 120 → «2 ч». */
export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} мин`;
  return rest === 0 ? `${h} ч` : `${h} ч ${rest} мин`;
}
