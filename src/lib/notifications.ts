// Локальные напоминания через expo-notifications (ТЗ §8). Работают в обычном
// Expo Go на SDK 57 (в отличие от push-уведомлений). На вебе — no-op.
//
// Идентификаторы уведомлений строятся детерминированно из сущности
// (`task:<id>:…`, `event:<id>:…`, `habit:<id>:…`), поэтому id уведомлений не
// хранятся в данных: чтобы снять напоминания сущности, отменяем все
// запланированные уведомления с её префиксом.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import dayjs, { Dayjs } from 'dayjs';

import type { CalendarEvent, Habit, Reminder, Task } from './types';
import { ALL_DAY_REMINDER_HOUR, DATE_FORMAT, dueMoment, formatDue, parseTime } from './dates';
import { occurrencesBetween } from './recurrence';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

// iOS хранит не больше 64 запланированных уведомлений на приложение.
const MAX_SCHEDULED = 60;
const MAX_HABIT_SLOTS = 30;
// Повторяющиеся события раскрываем на две недели вперёд; горизонт
// сдвигается при каждом открытии приложения (resyncAllNotifications).
const EVENT_HORIZON_DAYS = 14;

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let channelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Напоминания SirahDo',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// ---------- Что и когда напоминать ----------

type Planned =
  | { identifier: string; title: string; body?: string; url?: string; date: Date }
  | { identifier: string; title: string; body?: string; url?: string; daily: { hour: number; minute: number } }
  | {
      identifier: string;
      title: string;
      body?: string;
      url?: string;
      weekly: { weekday: number; hour: number; minute: number };
    };

function reminderFireTime(reminder: Reminder, base: Dayjs): Dayjs {
  return reminder.kind === 'at' ? dayjs(reminder.at) : base.subtract(reminder.minutes, 'minute');
}

function planTask(task: Task, now: Dayjs): Planned[] {
  if (task.status !== 'active') return [];
  const base = task.due ? dueMoment(task.due) : undefined;
  const result: Planned[] = [];
  task.reminders.forEach((r, i) => {
    if (r.kind === 'offset' && !base) return; // смещение без срока не к чему привязать
    const at = reminderFireTime(r, base ?? now);
    if (!at.isAfter(now)) return;
    result.push({
      identifier: `task:${task.id}:${i}`,
      title: task.title,
      body: task.due ? `Срок: ${formatDue(task.due)}` : task.description || 'Напоминание о задаче',
      url: `/task/${task.id}`,
      date: at.toDate(),
    });
  });
  return result;
}

function planEvent(event: CalendarEvent, now: Dayjs): Planned[] {
  const start = dayjs(event.start);
  const startTime = event.allDay
    ? { hour: ALL_DAY_REMINDER_HOUR, minute: 0 }
    : { hour: start.hour(), minute: start.minute() };

  const dates = event.recurrence
    ? occurrencesBetween(
        event.recurrence,
        start.format(DATE_FORMAT),
        now.format(DATE_FORMAT), // напоминания бывают только «до» начала, прошедшие вхождения не нужны
        now.add(EVENT_HORIZON_DAYS, 'day').format(DATE_FORMAT)
      )
    : [start.format(DATE_FORMAT)];

  const result: Planned[] = [];
  for (const date of dates) {
    const occurrenceStart = dayjs(date).hour(startTime.hour).minute(startTime.minute).second(0);
    event.reminders.forEach((r, i) => {
      // Абсолютное напоминание относится только к первому вхождению.
      if (r.kind === 'at' && date !== start.format(DATE_FORMAT)) return;
      const at = reminderFireTime(r, occurrenceStart);
      if (!at.isAfter(now)) return;
      result.push({
        identifier: `event:${event.id}:${date}:${i}`,
        title: event.title,
        body: [event.allDay ? 'Весь день' : occurrenceStart.format('HH:mm'), event.location].filter(Boolean).join(' · '),
        date: at.toDate(),
      });
    });
  }
  return result;
}

function planHabit(habit: Habit): Planned[] {
  if (habit.archived) return [];
  const everyDay = new Set(habit.weekdays).size >= 7;
  const result: Planned[] = [];
  habit.reminders.forEach((r, i) => {
    const t = parseTime(r.time);
    if (!t) return;
    const title = `${habit.icon} ${habit.name}`.trim();
    const body = habit.description || 'Время для привычки';
    if (everyDay) {
      result.push({ identifier: `habit:${habit.id}:${i}`, title, body, daily: t });
      return;
    }
    for (const iso of habit.weekdays) {
      // expo-notifications: 1 = воскресенье … 7 = суббота; у нас ISO 1 = понедельник.
      const weekday = (iso % 7) + 1;
      result.push({ identifier: `habit:${habit.id}:${i}:${iso}`, title, body, weekly: { weekday, ...t } });
    }
  });
  return result;
}

// ---------- Планирование ----------

async function schedule(items: Planned[]): Promise<void> {
  if (items.length === 0) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  await ensureAndroidChannel();
  const channelId = Platform.OS === 'android' ? 'default' : undefined;

  for (const item of items) {
    let trigger: Notifications.NotificationTriggerInput;
    if ('date' in item) {
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId };
    } else if ('daily' in item) {
      trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...item.daily, channelId };
    } else {
      trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, ...item.weekly, channelId };
    }
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: item.identifier,
        content: { title: item.title, body: item.body, data: item.url ? { url: item.url } : undefined },
        trigger,
      });
    } catch (e) {
      console.warn('Не удалось запланировать напоминание', item.identifier, e);
    }
  }
}

async function cancelByPrefix(prefix: string): Promise<void> {
  if (!SUPPORTED) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // уже отменено или не найдено — не критично
  }
}

// Операции над уведомлениями выполняются строго по очереди, чтобы
// «отменить старые → поставить новые» для одной сущности не перемешивалось с
// полной пересборкой при старте приложения.
let queue: Promise<unknown> = Promise.resolve();
function enqueue(fn: () => Promise<void>): Promise<void> {
  const next = queue.catch(() => undefined).then(fn);
  queue = next;
  return next;
}

/** Пересобирает напоминания задачи (после создания/изменения/завершения). */
export function syncTaskNotifications(task: Task): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  return enqueue(async () => {
    await cancelByPrefix(`task:${task.id}:`);
    await schedule(planTask(task, dayjs()));
  });
}

export function syncEventNotifications(event: CalendarEvent): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  return enqueue(async () => {
    await cancelByPrefix(`event:${event.id}:`);
    await schedule(planEvent(event, dayjs()));
  });
}

export function syncHabitNotifications(habit: Habit): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  return enqueue(async () => {
    await cancelByPrefix(`habit:${habit.id}:`);
    await schedule(planHabit(habit));
  });
}

export type NotificationOwner = 'task' | 'event' | 'habit';

/** Снимает все напоминания удалённой/выполненной сущности. */
export function cancelNotificationsFor(owner: NotificationOwner, id: string): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  return enqueue(() => cancelByPrefix(`${owner}:${id}:`));
}

/**
 * Полная пересборка при старте/возврате в приложение: отменяет всё и ставит
 * заново ближайшие напоминания в пределах лимита iOS. Разрешение не
 * запрашивает — только использует уже выданное.
 */
export function resyncAllNotifications(data: { tasks: Task[]; events: CalendarEvent[]; habits: Habit[] }): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  return enqueue(async () => {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const now = dayjs();
    const habitItems = data.habits.flatMap(planHabit).slice(0, MAX_HABIT_SLOTS);
    const dated = [...data.tasks.flatMap((t) => planTask(t, now)), ...data.events.flatMap((e) => planEvent(e, now))]
      .filter((x): x is Extract<Planned, { date: Date }> => 'date' in x)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, MAX_SCHEDULED - habitItems.length);

    await Notifications.cancelAllScheduledNotificationsAsync();
    await schedule([...habitItems, ...dated]);
  });
}

/** Подписка на тап по уведомлению: отдаёт url экрана из data уведомления. */
export function addNotificationTapListener(onUrl: (url: string) => void): () => void {
  if (!SUPPORTED) return () => {};
  const handle = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') onUrl(url);
  };
  // Приложение могло быть запущено тапом по уведомлению.
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    handle(last);
    Notifications.clearLastNotificationResponse();
  }
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
