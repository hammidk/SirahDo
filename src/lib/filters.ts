// Сохранённые фильтры (ТЗ §5.1): простые критерии из чипов, без языка запросов.
// Внутри одного критерия — «ИЛИ» (любая из выбранных сфер), между критериями — «И».

import dayjs from 'dayjs';

import type { DueFilter, FilterCriteria, Task } from './types';
import { DATE_FORMAT } from './dates';

export const DUE_FILTERS: { id: DueFilter; title: string }[] = [
  { id: 'today', title: 'Сегодня' },
  { id: 'week', title: 'Ближайшие 7 дней' },
  { id: 'overdue', title: 'Просрочено' },
  { id: 'none', title: 'Без срока' },
];

export function matchesCriteria(task: Task, c: FilterCriteria, today = dayjs().format(DATE_FORMAT)): boolean {
  if (task.status !== 'active') return false;
  if (c.spheres?.length && (!task.sphere || !c.spheres.includes(task.sphere))) return false;
  if (c.intentionTags?.length && (!task.intentionTag || !c.intentionTags.includes(task.intentionTag))) return false;
  if (c.priorities?.length && !c.priorities.includes(task.priority)) return false;
  if (c.tagIds?.length && !task.tagIds.some((id) => c.tagIds!.includes(id))) return false;
  if (c.due) {
    const d = task.due?.date;
    switch (c.due) {
      case 'today':
        if (d !== today) return false;
        break;
      case 'week': {
        const end = dayjs(today).add(6, 'day').format(DATE_FORMAT);
        if (!d || d < today || d > end) return false;
        break;
      }
      case 'overdue':
        if (!d || d >= today) return false;
        break;
      case 'none':
        if (d) return false;
        break;
    }
  }
  return true;
}

export function isEmptyCriteria(c: FilterCriteria): boolean {
  return !c.spheres?.length && !c.intentionTags?.length && !c.priorities?.length && !c.tagIds?.length && !c.due;
}
