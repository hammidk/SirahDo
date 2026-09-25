// Общий контекст данных приложения — единая точка правды. Экраны читают/пишут
// только через useAppData(), а не напрямую через storage.ts: так локальное
// хранилище можно будет подменить на Firebase (см. src/lib/firebase.ts),
// не трогая экраны. Здесь же — побочные эффекты сохранения (напоминания,
// следующее вхождение повторяющейся задачи, каскадные удаления).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import type {
  Calendar,
  CalendarEvent,
  DiaryEntry,
  Filter,
  Habit,
  HabitLog,
  Project,
  Section,
  Tag,
  Task,
  UserSettings,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import * as storage from './storage';
import { nextOccurrenceAfter } from './recurrence';
import {
  cancelNotificationsFor,
  resyncAllNotifications,
  syncEventNotifications,
  syncHabitNotifications,
  syncTaskNotifications,
} from './notifications';

export type TaskInput = Parameters<typeof storage.tasks.upsert>[0];
export type ProjectInput = Parameters<typeof storage.projects.upsert>[0];
export type SectionInput = Parameters<typeof storage.sections.upsert>[0];
export type TagInput = Parameters<typeof storage.tags.upsert>[0];
export type FilterInput = Parameters<typeof storage.filters.upsert>[0];
export type CalendarInput = Parameters<typeof storage.calendars.upsert>[0];
export type EventInput = Parameters<typeof storage.events.upsert>[0];
export type HabitInput = Parameters<typeof storage.habits.upsert>[0];

export type DiaryPatch = Partial<Pick<DiaryEntry, 'text' | 'wentWell' | 'changeTomorrow' | 'gratitude'>>;

export interface CompleteTaskExtra {
  comment?: string;
  startedAt?: string;
  endedAt?: string;
}

/** Результат выполнения задачи — всё нужное, чтобы его отменить. */
export interface CompletionResult {
  previous: Task; // задача до выполнения (с правилом повтора)
  nextTaskId?: string; // следующее вхождение повторяющейся задачи, если создано
}

interface AppDataContextValue {
  loading: boolean;
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  tags: Tag[];
  filters: Filter[];
  calendars: Calendar[];
  events: CalendarEvent[];
  habits: Habit[];
  habitLogs: HabitLog[];
  diary: DiaryEntry[];
  settings: UserSettings;
  locationError: string | null;

  refresh: () => Promise<UserSettings>;

  addOrUpdateTask: (task: TaskInput) => Promise<Task>;
  completeTask: (id: string, extra?: CompleteTaskExtra) => Promise<CompletionResult | undefined>;
  undoCompleteTask: (result: CompletionResult) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  startTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;

  addOrUpdateProject: (project: ProjectInput) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
  addOrUpdateSection: (section: SectionInput) => Promise<Section>;
  removeSection: (id: string) => Promise<void>;

  addOrUpdateTag: (tag: TagInput) => Promise<Tag>;
  removeTag: (id: string) => Promise<void>;
  addOrUpdateFilter: (filter: FilterInput) => Promise<Filter>;
  removeFilter: (id: string) => Promise<void>;

  addOrUpdateCalendar: (calendar: CalendarInput) => Promise<Calendar>;
  removeCalendar: (id: string) => Promise<boolean>;
  addOrUpdateEvent: (event: EventInput) => Promise<CalendarEvent>;
  removeEvent: (id: string) => Promise<void>;

  addOrUpdateHabit: (habit: HabitInput) => Promise<Habit>;
  removeHabit: (id: string) => Promise<void>;
  setHabitCount: (habitId: string, date: string, count: number) => Promise<void>;

  saveDiaryEntry: (date: string, patch: DiaryPatch) => Promise<DiaryEntry>;
  removeDiaryEntry: (date: string) => Promise<void>;

  updateSettings: (settings: UserSettings) => Promise<void>;
  requestLocation: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

function putInto<T extends { id: string }>(set: Setter<T>, item: T) {
  set((prev) => {
    const idx = prev.findIndex((x) => x.id === item.id);
    if (idx === -1) return [...prev, item];
    const copy = [...prev];
    copy[idx] = item;
    return copy;
  });
}

function dropFrom<T extends { id: string }>(set: Setter<T>, ids: string[]) {
  if (ids.length === 0) return;
  const s = new Set(ids);
  set((prev) => prev.filter((x) => !s.has(x.id)));
}

const RESYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Актуальные данные для колбэков, которым нужно прочитать состояние без
  // пересоздания (завершение задачи, каскадные удаления, пересборка напоминаний).
  const latest = useRef({ tasks, projects, sections, events, habits, diary, settings });
  useLayoutEffect(() => {
    latest.current = { tasks, projects, sections, events, habits, diary, settings };
  });

  const refresh = useCallback(async () => {
    const [t, p, sec, tg, f, c, e, h, hl, d, s] = await Promise.all([
      storage.tasks.getAll(),
      storage.projects.getAll(),
      storage.sections.getAll(),
      storage.tags.getAll(),
      storage.filters.getAll(),
      storage.calendars.getAll(),
      storage.events.getAll(),
      storage.habits.getAll(),
      storage.habitLogs.getAll(),
      storage.diary.getAll(),
      storage.getSettings(),
    ]);
    setTasks(t);
    setProjects(p);
    setSections(sec);
    setTags(tg);
    setFilters(f);
    setCalendars(c);
    setEvents(e);
    setHabits(h);
    setHabitLogs(hl);
    setDiary(d);
    setSettings(s);
    latest.current = { tasks: t, projects: p, sections: sec, events: e, habits: h, diary: d, settings: s };
    return s;
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Доступ к геолокации не выдан. Город можно выбрать вручную в Профиле.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      // Подпись места («Казань, Россия») — по возможности; без неё всё работает.
      let locationLabel: string | undefined;
      try {
        const [addr] = await Location.reverseGeocodeAsync(pos.coords);
        locationLabel = [addr?.city ?? addr?.subregion ?? addr?.region, addr?.country].filter(Boolean).join(', ') || undefined;
      } catch {
        locationLabel = undefined;
      }
      const next: UserSettings = {
        ...latest.current.settings,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationLabel,
      };
      await storage.saveSettings(next);
      setSettings(next);
    } catch {
      setLocationError('Не удалось определить местоположение.');
    }
  }, []);

  const lastResync = useRef(0);
  const resyncNotifications = useCallback(() => {
    lastResync.current = Date.now();
    const { tasks: t, events: e, habits: h } = latest.current;
    resyncAllNotifications({ tasks: t, events: e, habits: h }).catch((err) =>
      console.warn('Не удалось пересобрать напоминания', err)
    );
  }, []);

  useEffect(() => {
    (async () => {
      let loaded: UserSettings = DEFAULT_SETTINGS;
      try {
        await storage.migrate();
        loaded = await refresh();
        resyncNotifications();
      } catch (e) {
        // Хранилище недоступно — показываем пустое приложение, а не вечную загрузку.
        console.error('Не удалось загрузить данные', e);
      } finally {
        setLoading(false);
      }
      // Локация ещё не задана — сразу предлагаем определить её для времён намаза.
      if (loaded.latitude == null) requestLocation();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Возврат в приложение: горизонт напоминаний повторяющихся событий мог сдвинуться.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastResync.current > RESYNC_INTERVAL_MS) resyncNotifications();
    });
    return () => sub.remove();
  }, [resyncNotifications]);

  // ---------- Задачи ----------

  const addOrUpdateTask = useCallback(async (input: TaskInput) => {
    // Перенос срока активной задачи на более позднюю дату запоминаем для Истории.
    if (input.id && input.due) {
      const prev = (await storage.tasks.getAll()).find((t) => t.id === input.id);
      if (prev?.status === 'active' && prev.due && input.due.date > prev.due.date) {
        const from = prev.postponedFrom ?? [];
        input = { ...input, postponedFrom: from.includes(prev.due.date) ? from : [...from, prev.due.date] };
      }
    }
    let saved = await storage.tasks.upsert(input);
    // Повтор без срока не имеет смысла, раздел — без проекта.
    if ((saved.recurrence && !saved.due) || (saved.sectionId && !saved.projectId)) {
      saved = await storage.tasks.upsert({
        id: saved.id,
        recurrence: saved.due ? saved.recurrence : undefined,
        sectionId: saved.projectId ? saved.sectionId : undefined,
      });
    }
    putInto(setTasks, saved);
    syncTaskNotifications(saved);
    return saved;
  }, []);

  const completeTask = useCallback(async (id: string, extra?: CompleteTaskExtra) => {
    // Читаем из хранилища: задачу могли только что сохранить, а состояние ещё не обновилось.
    const task = (await storage.tasks.getAll()).find((t) => t.id === id);
    if (!task || task.status === 'done') return undefined;
    let nextTaskId: string | undefined;

    // Повторяющаяся задача: текущее вхождение уходит в историю как выполненное,
    // а следующее создаётся новой задачей с той же настройкой.
    if (task.recurrence && task.due) {
      const nextDate = nextOccurrenceAfter(task.recurrence, task.due.date, task.due.date);
      if (nextDate) {
        const { id: _omit, createdAt: _c, status: _s, startedAt: _st, endedAt: _e, comment: _cm, postponeReason: _p, postponedFrom: _pf, ...rest } = task;
        const recurrence = task.recurrence.count
          ? { ...task.recurrence, count: task.recurrence.count - 1 }
          : task.recurrence;
        const next = await addOrUpdateTask({
          ...rest,
          due: { ...task.due, date: nextDate },
          recurrence: recurrence.count === 0 ? undefined : recurrence,
          checklist: task.checklist.map((c) => ({ ...c, done: false })),
        });
        nextTaskId = next.id;
      }
    }

    const done = await storage.tasks.upsert({
      id,
      status: 'done',
      recurrence: undefined,
      endedAt: extra?.endedAt ?? new Date().toISOString(),
      startedAt: extra?.startedAt ?? task.startedAt,
      comment: extra?.comment ?? task.comment,
    });
    putInto(setTasks, done);
    cancelNotificationsFor('task', id);
    return { previous: task, nextTaskId };
  }, [addOrUpdateTask]);

  /** «Отменить» сразу после выполнения: возвращает задачу как была и убирает созданное следующее вхождение. */
  const undoCompleteTask = useCallback(async ({ previous, nextTaskId }: CompletionResult) => {
    if (nextTaskId) {
      await storage.tasks.remove(nextTaskId);
      dropFrom(setTasks, [nextTaskId]);
      cancelNotificationsFor('task', nextTaskId);
    }
    // Полная замена записи снимком: поля, которых не было до выполнения (endedAt), исчезают.
    await storage.tasks.remove(previous.id);
    const restored = await storage.tasks.upsert({ ...previous });
    putInto(setTasks, restored);
    syncTaskNotifications(restored);
  }, []);

  const reopenTask = useCallback(async (id: string) => {
    const saved = await storage.tasks.upsert({ id, status: 'active', endedAt: undefined });
    putInto(setTasks, saved);
    syncTaskNotifications(saved);
  }, []);

  /** Отметка «начал выполнять» — время начала для анализа после завершения. */
  const startTask = useCallback(async (id: string) => {
    const saved = await storage.tasks.upsert({ id, startedAt: new Date().toISOString() });
    putInto(setTasks, saved);
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await storage.tasks.remove(id);
    dropFrom(setTasks, [id]);
    cancelNotificationsFor('task', id);
  }, []);

  // ---------- Проекты и разделы ----------

  const addOrUpdateProject = useCallback(async (project: ProjectInput) => {
    const saved = await storage.projects.upsert(project);
    putInto(setProjects, saved);
    return saved;
  }, []);

  // Допущение: удаление проекта удаляет его подпроекты, разделы и задачи (как в
  // Todoist). Экран обязан спросить подтверждение с количеством задач.
  const removeProject = useCallback(async (id: string) => {
    const all = latest.current.projects;
    const ids = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of all) {
        if (p.parentProjectId && ids.has(p.parentProjectId) && !ids.has(p.id)) {
          ids.add(p.id);
          grew = true;
        }
      }
    }
    const removedTasks = await storage.tasks.removeWhere((t) => !!t.projectId && ids.has(t.projectId));
    const removedSections = await storage.sections.removeWhere((s) => ids.has(s.projectId));
    await storage.projects.removeWhere((p) => ids.has(p.id));
    dropFrom(setTasks, removedTasks.map((t) => t.id));
    dropFrom(setSections, removedSections.map((s) => s.id));
    dropFrom(setProjects, [...ids]);
    removedTasks.forEach((t) => cancelNotificationsFor('task', t.id));
  }, []);

  const addOrUpdateSection = useCallback(async (section: SectionInput) => {
    const saved = await storage.sections.upsert(section);
    putInto(setSections, saved);
    return saved;
  }, []);

  // Допущение: задачи удалённого раздела не удаляются, а остаются в проекте без раздела.
  const removeSection = useCallback(async (id: string) => {
    const moved = await storage.tasks.updateWhere(
      (t) => t.sectionId === id,
      (t) => ({ ...t, sectionId: undefined })
    );
    await storage.sections.remove(id);
    moved.forEach((t) => putInto(setTasks, t));
    dropFrom(setSections, [id]);
  }, []);

  // ---------- Теги и фильтры ----------

  const addOrUpdateTag = useCallback(async (tag: TagInput) => {
    if (!tag.id && tag.name) {
      // Имена тегов уникальны без учёта регистра: повторное создание возвращает существующий.
      const all = await storage.tags.getAll();
      const existing = all.find((t) => t.name.toLowerCase() === tag.name!.trim().toLowerCase());
      if (existing) return existing;
    }
    const saved = await storage.tags.upsert(tag.name ? { ...tag, name: tag.name.trim() } : tag);
    putInto(setTags, saved);
    return saved;
  }, []);

  const removeTag = useCallback(async (id: string) => {
    const changedTasks = await storage.tasks.updateWhere(
      (t) => t.tagIds.includes(id),
      (t) => ({ ...t, tagIds: t.tagIds.filter((x) => x !== id) })
    );
    const changedFilters = await storage.filters.updateWhere(
      (f) => !!f.criteria.tagIds?.includes(id),
      (f) => ({ ...f, criteria: { ...f.criteria, tagIds: f.criteria.tagIds!.filter((x) => x !== id) } })
    );
    await storage.tags.remove(id);
    changedTasks.forEach((t) => putInto(setTasks, t));
    changedFilters.forEach((f) => putInto(setFilters, f));
    dropFrom(setTags, [id]);
  }, []);

  const addOrUpdateFilter = useCallback(async (filter: FilterInput) => {
    const saved = await storage.filters.upsert(filter);
    putInto(setFilters, saved);
    return saved;
  }, []);

  const removeFilter = useCallback(async (id: string) => {
    await storage.filters.remove(id);
    dropFrom(setFilters, [id]);
  }, []);

  // ---------- Календари и события ----------

  const addOrUpdateCalendar = useCallback(async (calendar: CalendarInput) => {
    const saved = await storage.calendars.upsert(calendar);
    putInto(setCalendars, saved);
    return saved;
  }, []);

  /** Удаляет календарь вместе с его событиями. Последний календарь удалить нельзя — вернёт false. */
  const removeCalendar = useCallback(async (id: string) => {
    const all = await storage.calendars.getAll();
    if (all.length <= 1) return false;
    const removedEvents = await storage.events.removeWhere((e) => e.calendarId === id);
    await storage.calendars.remove(id);
    dropFrom(setEvents, removedEvents.map((e) => e.id));
    dropFrom(setCalendars, [id]);
    removedEvents.forEach((e) => cancelNotificationsFor('event', e.id));
    return true;
  }, []);

  const addOrUpdateEvent = useCallback(async (event: EventInput) => {
    const saved = await storage.events.upsert(event);
    putInto(setEvents, saved);
    syncEventNotifications(saved);
    return saved;
  }, []);

  const removeEvent = useCallback(async (id: string) => {
    await storage.events.remove(id);
    dropFrom(setEvents, [id]);
    cancelNotificationsFor('event', id);
  }, []);

  // ---------- Привычки ----------

  const addOrUpdateHabit = useCallback(async (habit: HabitInput) => {
    const saved = await storage.habits.upsert(habit);
    putInto(setHabits, saved);
    syncHabitNotifications(saved);
    return saved;
  }, []);

  const removeHabit = useCallback(async (id: string) => {
    const removedLogs = await storage.habitLogs.removeWhere((l) => l.habitId === id);
    await storage.habits.remove(id);
    dropFrom(setHabitLogs, removedLogs.map((l) => l.id));
    dropFrom(setHabits, [id]);
    cancelNotificationsFor('habit', id);
  }, []);

  /** Устанавливает число выполнений привычки за день (0 — снять отметку). */
  const setHabitCount = useCallback(async (habitId: string, date: string, count: number) => {
    const id = `${habitId}_${date}`;
    const safe = Math.max(0, Math.floor(count));
    if (safe === 0) {
      await storage.habitLogs.remove(id);
      dropFrom(setHabitLogs, [id]);
      return;
    }
    const saved = await storage.habitLogs.upsert({ id, habitId, date, completedCount: safe });
    putInto(setHabitLogs, saved);
  }, []);

  // ---------- Дневник ----------

  const saveDiaryEntry = useCallback(async (date: string, patch: DiaryPatch) => {
    const updatedAt = new Date().toISOString();
    const exists = latest.current.diary.some((d) => d.id === date);
    // Одна запись на день: id записи = дата.
    const saved = await storage.diary.upsert(
      exists ? { ...patch, id: date, updatedAt } : { text: '', ...patch, id: date, date, updatedAt }
    );
    putInto(setDiary, saved);
    return saved;
  }, []);

  const removeDiaryEntry = useCallback(async (date: string) => {
    await storage.diary.remove(date);
    dropFrom(setDiary, [date]);
  }, []);

  // ---------- Настройки ----------

  const updateSettings = useCallback(async (next: UserSettings) => {
    await storage.saveSettings(next);
    setSettings(next);
  }, []);

  const value = useMemo<AppDataContextValue>(() => ({
    loading,
    tasks,
    projects,
    sections,
    tags,
    filters,
    calendars,
    events,
    habits,
    habitLogs,
    diary,
    settings,
    locationError,
    refresh,
    addOrUpdateTask,
    completeTask,
    undoCompleteTask,
    reopenTask,
    startTask,
    removeTask,
    addOrUpdateProject,
    removeProject,
    addOrUpdateSection,
    removeSection,
    addOrUpdateTag,
    removeTag,
    addOrUpdateFilter,
    removeFilter,
    addOrUpdateCalendar,
    removeCalendar,
    addOrUpdateEvent,
    removeEvent,
    addOrUpdateHabit,
    removeHabit,
    setHabitCount,
    saveDiaryEntry,
    removeDiaryEntry,
    updateSettings,
    requestLocation,
  }), [
    loading, tasks, projects, sections, tags, filters, calendars, events, habits, habitLogs, diary,
    settings, locationError, refresh, addOrUpdateTask, completeTask, undoCompleteTask, reopenTask, startTask, removeTask,
    addOrUpdateProject, removeProject, addOrUpdateSection, removeSection, addOrUpdateTag, removeTag,
    addOrUpdateFilter, removeFilter, addOrUpdateCalendar, removeCalendar, addOrUpdateEvent, removeEvent,
    addOrUpdateHabit, removeHabit, setHabitCount, saveDiaryEntry, removeDiaryEntry, updateSettings, requestLocation,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
