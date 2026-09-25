// Данные дня для экрана Календаря: события видимых календарей, задачи со сроком
// (слой «Задачи») и времена намазов — несдвигаемые якоря дня.

import dayjs, { Dayjs } from 'dayjs';

import type { Calendar, CalendarEvent, Task, UserSettings } from './types';
import { NAMAZ_WINDOW_START_PRAYER } from './types';
import type { EventOccurrence } from './events';
import { eventsOnDate } from './events';
import { namazWindowsForDate } from './prayerTimes';
import { DATE_FORMAT, dueSortKey } from './dates';

export interface PrayerMark {
  label: string; // «Зухр»
  at: Dayjs;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  events: EventOccurrence[];
  tasks: Task[];
  prayers: PrayerMark[];
}

export function collectDay(
  date: string,
  src: { events: CalendarEvent[]; calendars: Calendar[]; tasks: Task[]; settings: UserSettings },
  opts: { alwaysShowTasks?: boolean } = {} // «Сегодня» показывает задачи независимо от слоя Календаря
): DayData {
  const showTasks = opts.alwaysShowTasks || src.settings.showTasksInCalendar !== false;
  return {
    date,
    events: eventsOnDate(src.events, src.calendars, date),
    tasks: showTasks
      ? src.tasks
          .filter((t) => t.due?.date === date)
          .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || dueSortKey(a.due).localeCompare(dueSortKey(b.due)))
      : [],
    prayers: namazWindowsForDate(date, src.settings).map((w) => ({
      label: NAMAZ_WINDOW_START_PRAYER[w.name],
      at: dayjs(w.start),
    })),
  };
}

/** Минуты от начала дня date для момента m (с обрезкой по границам дня). */
export function minutesInDay(m: Dayjs, date: string): number {
  const start = dayjs(date).startOf('day');
  return Math.min(1440, Math.max(0, m.diff(start, 'minute')));
}

export function dateRange(start: Dayjs, days: number): string[] {
  return Array.from({ length: days }, (_, i) => start.add(i, 'day').format(DATE_FORMAT));
}
