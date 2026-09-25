// Фильтры (docs/spec/overview.md): фиксированный список из 4 по сроку, новые не создаются.
// Допущение: задание не называет, какие именно 4 фильтра, — берём 4 критерия срока,
// которые уже были в приложении (Сегодня / 7 дней / Просрочено / Без срока).

import dayjs from 'dayjs';

import type { DueFilter, Task } from './types';
import { DATE_FORMAT } from './dates';

export const FIXED_FILTERS: { id: DueFilter; title: string; hint: string }[] = [
  { id: 'today', title: 'Сегодня', hint: 'Задачи со сроком на сегодня' },
  { id: 'week', title: 'Ближайшие 7 дней', hint: 'Срок — сегодня и следующие 6 дней' },
  { id: 'overdue', title: 'Просрочено', hint: 'Срок уже прошёл' },
  { id: 'none', title: 'Без срока', hint: 'Задачи без даты' },
];

/** Подходит ли активная задача под фильтр по сроку. */
export function matchesFilter(task: Task, filter: DueFilter, today = dayjs().format(DATE_FORMAT)): boolean {
  if (task.status !== 'active') return false;
  const d = task.due?.date;
  switch (filter) {
    case 'today':
      return d === today;
    case 'week': {
      const end = dayjs(today).add(6, 'day').format(DATE_FORMAT);
      return !!d && d >= today && d <= end;
    }
    case 'overdue':
      return !!d && d < today;
    case 'none':
      return !d;
  }
}
