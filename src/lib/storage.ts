// Локальный слой хранения (AsyncStorage). Оффлайн-first на MVP.
// Синхронизация с Firebase — см. src/lib/firebase.ts (заглушка, бэклог):
// при переходе меняется только этот файл, экраны и контекст остаются как есть.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Calendar,
  CalendarEvent,
  DiaryEntry,
  Filter,
  Habit,
  HabitLog,
  NamazWindowName,
  Priority,
  Project,
  Reminder,
  Section,
  Tag,
  Task,
  UserSettings,
} from './types';
import { CALENDAR_COLORS, DEFAULT_PRIORITY, DEFAULT_SETTINGS, NAMAZ_WINDOW_ORDER } from './types';
import { CATEGORY_COLORS } from '../theme/colors';
import { toDateKey } from './dates';

const KEYS = {
  schemaVersion: 'sirahdo:schemaVersion',
  tasks: 'sirahdo:tasks',
  projects: 'sirahdo:projects',
  sections: 'sirahdo:sections',
  tags: 'sirahdo:tags',
  filters: 'sirahdo:filters',
  calendars: 'sirahdo:calendars',
  events: 'sirahdo:events',
  habits: 'sirahdo:habits',
  habitLogs: 'sirahdo:habitLogs',
  diary: 'sirahdo:diary',
  settings: 'sirahdo:settings',
};

export const SCHEMA_VERSION = 3;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Все записи по одному ключу идут последовательно: read-modify-write двух
// параллельных сохранений иначе может потерять одно из них.
const keyLocks = new Map<string, Promise<unknown>>();

function withKeyLock<R>(key: string, fn: () => Promise<R>): Promise<R> {
  const prev = keyLocks.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  keyLocks.set(key, next);
  return next;
}

// ---------- Универсальная коллекция ----------

type WithId = { id: string };

/** Вход для сохранения: частичное обновление по id или новая запись без служебных полей. */
export type UpsertInput<T extends WithId, Generated extends keyof T> =
  | (Partial<T> & { id: string })
  | (Omit<T, 'id' | Generated> & Partial<Pick<T, Generated>> & { id?: undefined });

function collection<T extends WithId, Generated extends keyof T>(
  key: string,
  makeDefaults: (all: T[], input: Omit<T, 'id' | Generated>) => Omit<Pick<T, Generated>, 'id'>
) {
  const getAll = () => readJson<T[]>(key, []);

  const upsert = (input: UpsertInput<T, Generated>): Promise<T> =>
    withKeyLock(key, async () => {
      const all = await getAll();
      if (input.id) {
        const idx = all.findIndex((x) => x.id === input.id);
        if (idx >= 0) {
          const updated = { ...all[idx], ...input } as T;
          all[idx] = updated;
          await writeJson(key, all);
          return updated;
        }
        // Запись с заранее заданным id, которой ещё нет (напр. HabitLog): создаём.
        const created = { ...makeDefaults(all, input as Omit<T, 'id' | Generated>), ...input } as unknown as T;
        all.push(created);
        await writeJson(key, all);
        return created;
      }
      const created = {
        ...makeDefaults(all, input as Omit<T, 'id' | Generated>),
        ...input,
        id: makeId(),
      } as unknown as T;
      all.push(created);
      await writeJson(key, all);
      return created;
    });

  const removeWhere = (pred: (x: T) => boolean): Promise<T[]> =>
    withKeyLock(key, async () => {
      const all = await getAll();
      const removed = all.filter(pred);
      if (removed.length > 0) await writeJson(key, all.filter((x) => !pred(x)));
      return removed;
    });

  const updateWhere = (pred: (x: T) => boolean, patch: (x: T) => T): Promise<T[]> =>
    withKeyLock(key, async () => {
      const all = await getAll();
      const changed: T[] = [];
      const next = all.map((x) => {
        if (!pred(x)) return x;
        const y = patch(x);
        changed.push(y);
        return y;
      });
      if (changed.length > 0) await writeJson(key, next);
      return changed;
    });

  return {
    getAll,
    upsert,
    remove: (id: string) => removeWhere((x) => x.id === id),
    removeWhere,
    updateWhere,
  };
}

const nowIso = () => new Date().toISOString();
const nextOrder = <T extends { order: number }>(items: T[]) =>
  items.reduce((max, x) => Math.max(max, x.order), -1) + 1;

// ---------- Коллекции ----------

export const tasks = collection<Task, 'createdAt' | 'status' | 'checklist' | 'reminders' | 'tagIds' | 'priority'>(
  KEYS.tasks,
  () => ({
    createdAt: nowIso(),
    status: 'active',
    checklist: [],
    reminders: [],
    tagIds: [],
    priority: DEFAULT_PRIORITY,
  })
);

export const projects = collection<Project, 'order'>(KEYS.projects, (all, input) => ({
  order: nextOrder(all.filter((p) => p.parentProjectId === input.parentProjectId)),
}));

export const sections = collection<Section, 'order'>(KEYS.sections, (all, input) => ({
  order: nextOrder(all.filter((s) => s.projectId === input.projectId)),
}));

export const tags = collection<Tag, never>(KEYS.tags, () => ({}));

export const filters = collection<Filter, 'order'>(KEYS.filters, (all) => ({ order: nextOrder(all) }));

export const calendars = collection<Calendar, 'order' | 'visible'>(KEYS.calendars, (all) => ({
  order: nextOrder(all),
  visible: true,
}));

export const events = collection<CalendarEvent, 'createdAt' | 'reminders' | 'links'>(KEYS.events, () => ({
  createdAt: nowIso(),
  reminders: [],
  links: [],
}));

export const habits = collection<Habit, 'order' | 'createdAt' | 'reminders' | 'weekdays' | 'targetCountPerDay'>(
  KEYS.habits,
  (all) => ({
    order: nextOrder(all),
    createdAt: nowIso(),
    reminders: [],
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    targetCountPerDay: 1,
  })
);

export const habitLogs = collection<HabitLog, never>(KEYS.habitLogs, () => ({}));

export const diary = collection<DiaryEntry, 'createdAt' | 'updatedAt'>(KEYS.diary, () => ({
  createdAt: nowIso(),
  updatedAt: nowIso(),
}));

// ---------- Settings ----------

export async function getSettings(): Promise<UserSettings> {
  const stored = await readJson<Partial<UserSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await writeJson(KEYS.settings, settings);
}

// ---------- Миграции ----------

export const DEFAULT_CALENDAR_NAME = 'Личный';

/**
 * Приводит сохранённые данные к текущей схеме. Вызывается один раз при старте,
 * до первого чтения. Идемпотентна: повторный запуск ничего не меняет.
 */
export async function migrate(): Promise<void> {
  const version = Number((await AsyncStorage.getItem(KEYS.schemaVersion)) ?? '1');
  if (version < 2) await migrateV1toV2();
  if (version < 3) await migrateV2toV3();
  await AsyncStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION));
}

// Формат задачи в версии 1 (до объединения ТЗ).
interface TaskV1 {
  id: string;
  title: string;
  description?: string;
  sphere?: Task['sphere'];
  projectId?: string;
  sectionId?: string;
  dueDate?: string; // ISO дата/время
  reminderEnabled?: boolean;
  priority?: 'low' | 'medium' | 'high';
  tag?: string;
  plannedDurationMinutes?: number;
  value?: string;
  expectedResult?: string;
  namazWindowId?: string; // `${date}_${name}`
  notificationId?: string;
  status: Task['status'];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  comment?: string;
  postponeReason?: string;
}

const PRIORITY_V1_TO_V2: Record<NonNullable<TaskV1['priority']>, Priority> = {
  high: 1,
  medium: 2,
  low: 3,
};

async function migrateV1toV2(): Promise<void> {
  const oldTasks = await readJson<(TaskV1 | Task)[]>(KEYS.tasks, []);
  const existingTags = await readJson<Tag[]>(KEYS.tags, []);
  const tagByName = new Map(existingTags.map((t) => [t.name.toLowerCase(), t]));

  const migrated: Task[] = oldTasks.map((raw) => {
    if ('checklist' in raw && Array.isArray(raw.checklist)) return raw as Task; // уже v2
    const t = raw as TaskV1;

    const tagIds: string[] = [];
    const tagName = t.tag?.trim().replace(/^#/, '');
    if (tagName) {
      let tag = tagByName.get(tagName.toLowerCase());
      if (!tag) {
        tag = { id: makeId(), name: tagName };
        tagByName.set(tagName.toLowerCase(), tag);
      }
      tagIds.push(tag.id);
    }

    let due: Task['due'];
    if (t.dueDate) {
      const d = new Date(t.dueDate);
      if (!Number.isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        due = { date: toDateKey(d), time: `${hh}:${mm}` };
      }
    }

    const reminders: Reminder[] = t.reminderEnabled && due ? [{ kind: 'offset', minutes: 0 }] : [];

    const windowName = t.namazWindowId
      ? NAMAZ_WINDOW_ORDER.find((n) => t.namazWindowId!.endsWith(`_${n}`))
      : undefined;

    const next: Task = {
      id: t.id,
      title: t.title,
      description: t.description,
      checklist: [],
      due,
      reminders,
      durationMinutes: t.plannedDurationMinutes,
      priority: t.priority ? PRIORITY_V1_TO_V2[t.priority] : DEFAULT_PRIORITY,
      tagIds,
      projectId: t.projectId,
      sectionId: t.sectionId,
      sphere: t.sphere,
      namazWindow: windowName as NamazWindowName | undefined,
      value: t.value,
      expectedResult: t.expectedResult,
      status: t.status,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      comment: t.comment,
      postponeReason: t.postponeReason,
    };
    return next;
  });

  await writeJson(KEYS.tasks, migrated);
  await writeJson(KEYS.tags, [...tagByName.values()]);

  const existingCalendars = await readJson<Calendar[]>(KEYS.calendars, []);
  if (existingCalendars.length === 0) {
    await writeJson<Calendar[]>(KEYS.calendars, [
      { id: 'default', name: DEFAULT_CALENDAR_NAME, color: CALENDAR_COLORS[0], visible: true, order: 0 },
    ]);
  }
}

// Палитра до тёмной темы Notion (v2) → приглушённые цвета той же позиции.
const LEGACY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#00A5A8', '#8E8E93'];

function remapColor(color: string | undefined): string | undefined {
  if (!color) return color;
  const i = LEGACY_COLORS.indexOf(color.toUpperCase());
  return i >= 0 ? CATEGORY_COLORS[i] : color;
}

/** v3: цвета календарей, тегов и событий — из палитры Notion Dark. */
async function migrateV2toV3(): Promise<void> {
  const cals = await readJson<Calendar[]>(KEYS.calendars, []);
  await writeJson(KEYS.calendars, cals.map((c) => ({ ...c, color: remapColor(c.color) ?? c.color })));
  const tagList = await readJson<Tag[]>(KEYS.tags, []);
  await writeJson(KEYS.tags, tagList.map((t) => ({ ...t, color: remapColor(t.color) })));
  const eventList = await readJson<CalendarEvent[]>(KEYS.events, []);
  await writeJson(KEYS.events, eventList.map((e) => ({ ...e, colorOverride: remapColor(e.colorOverride) })));
}
