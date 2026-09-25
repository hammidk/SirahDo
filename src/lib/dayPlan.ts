// Раскладка дня по окнам намаза для ленты «Сегодня» (docs/spec/today.md). Только отображение:
// данные задач не меняются. Задача попадает в окно, если оно у неё выбрано явно,
// иначе — в окно, на которое приходится её время. Без времени и окна — «В течение дня».

import type { NamazWindow, NamazWindowName, Task } from './types';
import type { EventOccurrence } from './events';
import { dueMoment, dueSortKey } from './dates';

export interface WindowPlan {
  window: NamazWindow;
  tasks: Task[];
  events: EventOccurrence[];
  status: 'past' | 'current' | 'future';
  freeMinutes?: number; // только для текущего и будущих окон (кроме ночного)
}

export interface DayPlan {
  anytime: { tasks: Task[]; events: EventOccurrence[] };
  windows: WindowPlan[];
}

const sortTasks = (a: Task, b: Task) => dueSortKey(a.due).localeCompare(dueSortKey(b.due)) || a.priority - b.priority;

export function buildDayPlan(input: {
  tasks: Task[]; // активные задачи на этот день
  events: EventOccurrence[];
  windows: NamazWindow[]; // 5 окон дня; пусто — локация не задана
  now: Date;
}): DayPlan {
  const { tasks, events, windows, now } = input;
  const nowMs = now.getTime();
  const anytime: DayPlan['anytime'] = { tasks: [], events: [] };
  const byName = new Map<NamazWindowName, WindowPlan>(
    windows.map((w) => {
      const start = new Date(w.start).getTime();
      const end = new Date(w.end).getTime();
      const status = nowMs >= end ? 'past' : nowMs >= start ? 'current' : 'future';
      return [w.name, { window: w, tasks: [], events: [], status }];
    })
  );

  const windowAt = (ms: number) =>
    windows.find((w) => ms >= new Date(w.start).getTime() && ms < new Date(w.end).getTime());

  for (const task of tasks) {
    let target = task.namazWindow ? byName.get(task.namazWindow) : undefined;
    if (!target && task.due?.time) {
      const w = windowAt(dueMoment(task.due).valueOf());
      if (w) target = byName.get(w.name);
    }
    (target ? target.tasks : anytime.tasks).push(task);
  }

  for (const occ of events) {
    const w = occ.event.allDay ? undefined : windowAt(occ.start.valueOf());
    const target = w ? byName.get(w.name) : undefined;
    (target ? target.events : anytime.events).push(occ);
  }

  const plans = [...byName.values()];
  for (const plan of plans) {
    plan.tasks.sort(sortTasks);
    // Свободное время — «возможность наполнить его благом»: длина окна (для
    // текущего — остаток) минус запланированные длительности задач и событий.
    // Ночное окно не считаем: там сон.
    if (plan.status === 'past' || plan.window.name === 'isha_fajr') continue;
    const start = Math.max(new Date(plan.window.start).getTime(), nowMs);
    const end = new Date(plan.window.end).getTime();
    let busy = plan.tasks.reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0);
    for (const occ of plan.events) {
      const s = Math.max(occ.start.valueOf(), start);
      const e = Math.min(occ.end.valueOf(), end);
      if (e > s) busy += (e - s) / 60000;
    }
    plan.freeMinutes = Math.max(0, Math.round((end - start) / 60000 - busy));
  }

  anytime.tasks.sort(sortTasks);
  return { anytime, windows: plans };
}

/** Сколько минут осталось до конца окна. */
export function minutesLeft(window: NamazWindow, now: Date): number {
  return Math.max(0, Math.ceil((new Date(window.end).getTime() - now.getTime()) / 60000));
}

/** Доля прошедшего времени окна, 0..1. */
export function windowProgress(window: NamazWindow, now: Date): number {
  const s = new Date(window.start).getTime();
  const e = new Date(window.end).getTime();
  if (e <= s) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - s) / (e - s)));
}

