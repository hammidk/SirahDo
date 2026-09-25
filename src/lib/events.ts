// Вхождения событий календаря на дату — с учётом повторения и многодневных
// событий. Используется лентой «Сегодня» и экраном Календаря.

import dayjs, { Dayjs } from 'dayjs';

import type { Calendar, CalendarEvent } from './types';
import { DATE_FORMAT } from './dates';
import { occurrencesBetween } from './recurrence';

export interface EventOccurrence {
  event: CalendarEvent;
  start: Dayjs;
  end: Dayjs; // для allDay — конец последнего дня
  color: string;
  key: string; // уникальный ключ вхождения
}

/** Длина события: для allDay считаем, что end — начало последнего дня (включительно). */
function spanOf(event: CalendarEvent): { durationMs: number; spanDays: number } {
  const start = dayjs(event.start);
  const end = event.allDay ? dayjs(event.end).endOf('day') : dayjs(event.end);
  const durationMs = Math.max(0, end.diff(start));
  const spanDays = Math.max(0, end.startOf('day').diff(start.startOf('day'), 'day'));
  return { durationMs, spanDays };
}

export function eventsOnDate(events: CalendarEvent[], calendars: Calendar[], date: string): EventOccurrence[] {
  const visible = new Map(calendars.filter((c) => c.visible).map((c) => [c.id, c]));
  const dayStart = dayjs(date).startOf('day');
  const dayEnd = dayStart.endOf('day');
  const result: EventOccurrence[] = [];

  for (const event of events) {
    const calendar = visible.get(event.calendarId);
    if (!calendar) continue;
    const start = dayjs(event.start);
    const { durationMs, spanDays } = spanOf(event);
    const startKey = start.format(DATE_FORMAT);

    // Вхождения, которые начинаются в пределах spanDays до этой даты, могут её задевать.
    const candidates = event.recurrence
      ? occurrencesBetween(event.recurrence, startKey, dayStart.subtract(spanDays, 'day').format(DATE_FORMAT), date)
      : [startKey];

    for (const occ of candidates) {
      const occStart = dayjs(occ).hour(start.hour()).minute(start.minute()).second(0).millisecond(0);
      const occEnd = occStart.add(durationMs, 'millisecond');
      // Событие, закончившееся ровно в полночь, в следующий день не попадает;
      // событие нулевой длины попадает в день своего начала.
      const overlaps =
        !occStart.isAfter(dayEnd) &&
        (occEnd.isAfter(dayStart) || (durationMs === 0 && !occStart.isBefore(dayStart)));
      if (!overlaps) continue;
      result.push({
        event,
        start: occStart,
        end: occEnd,
        color: event.colorOverride ?? calendar.color,
        key: `${event.id}_${occ}`,
      });
    }
  }

  return result.sort((a, b) => Number(b.event.allDay) - Number(a.event.allDay) || a.start.diff(b.start));
}
