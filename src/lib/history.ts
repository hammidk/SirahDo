// История (ТЗ §10): журнал прожитого дня — выполненные, перенесённые и
// невыполненные задачи, отметки привычек и запись дневника.

import type { DiaryEntry, Habit, HabitLog, Task } from './types';
import { toDateKey } from './dates';
import { countOn, isScheduled, logIndex } from './habits';

export interface DayHistory {
  date: string;
  done: Task[]; // выполнены в этот день
  postponed: Task[]; // срок стоял на этот день и был перенесён позже
  notDone: Task[]; // срок на этот день, до сих пор не выполнены (день прошёл)
  habits: { habit: Habit; count: number; done: boolean }[]; // запланированные привычки дня
  diary?: DiaryEntry;
}

export function dayHistory(
  date: string,
  data: { tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[]; diary: DiaryEntry[] },
  today: string,
  index = logIndex(data.habitLogs)
): DayHistory {
  const done = data.tasks
    .filter((t) => t.status === 'done' && t.endedAt && toDateKey(t.endedAt) === date)
    .sort((a, b) => (a.endedAt ?? '').localeCompare(b.endedAt ?? ''));
  const postponed = data.tasks.filter((t) => t.postponedFrom?.includes(date));
  const notDone = date < today ? data.tasks.filter((t) => t.status === 'active' && t.due?.date === date) : [];
  const habits = data.habits
    .filter((h) => isScheduled(h, date) || countOn(index, h.id, date) > 0)
    .map((h) => {
      const count = countOn(index, h.id, date);
      return { habit: h, count, done: count >= h.targetCountPerDay };
    });
  return { date, done, postponed, notDone, habits, diary: data.diary.find((d) => d.date === date) };
}

export function isQuietDay(d: DayHistory): boolean {
  return !d.done.length && !d.postponed.length && !d.notDone.length && !d.habits.some((h) => h.count > 0) && !d.diary;
}
