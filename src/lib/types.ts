// Общие типы данных приложения — модель данных; описание — docs/ARCHITECTURE.md.
// Версия схемы хранилища: см. SCHEMA_VERSION и миграции в storage.ts.

import { CATEGORY_COLORS, palette } from '../theme/colors';

// ---------- Справочники ----------

export type SphereId =
  | 'faith' // Вера
  | 'health' // Здоровье
  | 'rizq' // Ризк
  | 'family' // Семья
  | 'charity' // Благотворительность
  | 'other'; // Цели / Идеи / Прочее

export const SPHERES: { id: SphereId; title: string }[] = [
  { id: 'faith', title: 'Вера' },
  { id: 'health', title: 'Здоровье' },
  { id: 'rizq', title: 'Ризк' },
  { id: 'family', title: 'Семья' },
  { id: 'charity', title: 'Благотворительность' },
  { id: 'other', title: 'Цели / Идеи / Прочее' },
];

// Теги по намерению — фиксированный список (docs/SPEC.md). Не путать со свободными
// пользовательскими тегами (Tag) и с полем «Намерение» проекта/раздела.
export type IntentionTagId = 'ibada' | 'dunya' | 'obligation';

export const INTENTION_TAGS: { id: IntentionTagId; title: string }[] = [
  { id: 'ibada', title: 'Ибада' },
  { id: 'dunya', title: 'Дунья' },
  { id: 'obligation', title: 'Обязательство' },
];

// Приоритет как в Todoist: 1 — высший, 4 — «без приоритета» (по умолчанию).
export type Priority = 1 | 2 | 3 | 4;

export const DEFAULT_PRIORITY: Priority = 4;

export const PRIORITIES: { id: Priority; title: string; color: string }[] = [
  { id: 1, title: 'П1', color: palette.accentRed },
  { id: 2, title: 'П2', color: palette.accentYellow },
  { id: 3, title: 'П3', color: palette.accentBlue },
  { id: 4, title: 'П4', color: palette.textTertiary },
];

// ---------- Намаз ----------

// Окно намаза: промежуток между двумя соседними намазами (docs/spec/prayer-profile.md).
export type NamazWindowName =
  | 'fajr_dhuhr'
  | 'dhuhr_asr'
  | 'asr_maghrib'
  | 'maghrib_isha'
  | 'isha_fajr';

export const NAMAZ_WINDOW_TITLES: Record<NamazWindowName, string> = {
  fajr_dhuhr: 'Фаджр → Зухр',
  dhuhr_asr: 'Зухр → Аср',
  asr_maghrib: 'Аср → Магриб',
  maghrib_isha: 'Магриб → Иша',
  isha_fajr: 'Иша → Фаджр',
};

// Намаз, которым окно заканчивается — для «до Асра осталось …».
export const NAMAZ_WINDOW_END_PRAYER: Record<NamazWindowName, string> = {
  fajr_dhuhr: 'Зухра',
  dhuhr_asr: 'Асра',
  asr_maghrib: 'Магриба',
  maghrib_isha: 'Иши',
  isha_fajr: 'Фаджра',
};

// Намаз, которым окно начинается — подпись разделителя в ленте дня.
export const NAMAZ_WINDOW_START_PRAYER: Record<NamazWindowName, string> = {
  fajr_dhuhr: 'Фаджр',
  dhuhr_asr: 'Зухр',
  asr_maghrib: 'Аср',
  maghrib_isha: 'Магриб',
  isha_fajr: 'Иша',
};

// Пять намазов — для блока «До следующего намаза» на экране «Сегодня».
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_ORDER: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_TITLES: Record<PrayerName, string> = {
  fajr: 'Фаджр',
  dhuhr: 'Зухр',
  asr: 'Аср',
  maghrib: 'Магриб',
  isha: 'Иша',
};

// Родительный падеж: «До Асра», «До Иши».
export const PRAYER_TITLES_GENITIVE: Record<PrayerName, string> = {
  fajr: 'Фаджра',
  dhuhr: 'Зухра',
  asr: 'Асра',
  maghrib: 'Магриба',
  isha: 'Иши',
};

export const NAMAZ_WINDOW_ORDER: NamazWindowName[] = [
  'fajr_dhuhr',
  'dhuhr_asr',
  'asr_maghrib',
  'maghrib_isha',
  'isha_fajr',
];

export interface NamazWindow {
  id: string; // `${date}_${name}`
  date: string; // YYYY-MM-DD (дата начала окна)
  name: NamazWindowName;
  title: string; // "Фаджр → Зухр"
  start: string; // ISO-строка
  end: string; // ISO-строка
}

export interface PrayerTimesForDay {
  date: string; // YYYY-MM-DD
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

// ---------- Общие блоки: повторение и напоминания ----------

export type RecurrenceFreq = 'day' | 'week' | 'month' | 'year';

// Правило повторения (docs/SPEC.md, «Повторение») — общее для события и задачи.
export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number; // каждые N единиц freq, >= 1
  weekdays?: number[]; // только для freq='week': ISO-дни недели, 1=Пн … 7=Вс
  until?: string; // YYYY-MM-DD включительно
  count?: number; // сколько всего повторов (включая первое)
}

// Напоминание (docs/SPEC.md, «Напоминания»): за N минут до начала/срока или в конкретный момент.
export type Reminder =
  | { kind: 'offset'; minutes: number } // 0 = в момент срока
  | { kind: 'at'; at: string }; // ISO

// Напоминание привычки — время суток в её дни недели.
export interface HabitReminder {
  time: string; // HH:mm
}

// ---------- Todo ----------

// Проект. "Входящие" не является проектом: задачи без projectId лежат во Входящих.
export interface Project {
  id: string;
  title: string;
  parentProjectId?: string; // вложенность папок (UI — до 3 уровней)
  sphere?: SphereId;
  intentionTag?: IntentionTagId;
  intention?: string; // Намерение — зачем этот проект существует
  favorite?: boolean;
  order: number;
  archived?: boolean;
}

// Раздел проекта (секция), как в Todoist.
export interface Section {
  id: string;
  projectId: string;
  title: string;
  intention?: string; // Намерение раздела
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  favorite?: boolean;
}

// Фильтры — фиксированный список из 4 (docs/spec/overview.md), не хранятся в данных.
export type DueFilter = 'today' | 'week' | 'overdue' | 'none';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// Срок задачи. Дата и время хранятся раздельно в локальном времени:
// задача "на 25 сентября без времени" не должна съезжать при смене часового пояса.
export interface TaskDue {
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm; нет — задача на весь день
}

export type TaskStatus = 'active' | 'done';

export interface Task {
  id: string;
  title: string; // Название
  description?: string; // Описание (лёгкий markdown)
  checklist: ChecklistItem[]; // Подзадачи-галочки
  due?: TaskDue; // Срок
  recurrence?: Recurrence; // Повтор (только вместе со сроком)
  reminders: Reminder[]; // Напоминания
  durationMinutes?: number; // Планируемая длительность
  priority: Priority;
  tagIds: string[];
  intentionTag?: IntentionTagId;
  projectId?: string; // Проект (нет — значит во "Входящих")
  sectionId?: string; // Раздел проекта
  sphere?: SphereId; // Сфера
  namazWindow?: NamazWindowName; // Окно намаза в день срока (или сегодня, если срока нет)
  value?: string; // Ценность — ради чего выполняется (на уровне ЗАДАЧИ)
  expectedResult?: string; // Ожидаемый результат

  status: TaskStatus;
  createdAt: string;

  // Поля, заполняемые после завершения (Product Book, п.8)
  startedAt?: string;
  endedAt?: string;
  comment?: string;
  postponeReason?: string; // причина переноса, если задача переносилась
  postponedFrom?: string[]; // даты (YYYY-MM-DD), с которых срок переносили на более поздний — для Истории
}

// ---------- Календарь ----------

export interface Calendar {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  order: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  allDay: boolean;
  start: string; // ISO; для allDay — начало дня
  end: string; // ISO; для allDay — начало последнего дня
  recurrence?: Recurrence;
  calendarId: string;
  colorOverride?: string;
  reminders: Reminder[];
  location?: string;
  description?: string;
  links: string[]; // Вложения: в MVP только ссылки
  createdAt: string;
}

export const CALENDAR_COLORS: string[] = [...CATEGORY_COLORS];

// ---------- Привычки ----------

export interface Habit {
  id: string;
  name: string;
  icon: string; // id иконки из набора HABIT_ICONS (lib/habits.ts)
  color: string; // цвет карточки и заливки прогресса — из CATEGORY_COLORS
  description?: string;
  targetCountPerDay: number; // по умолчанию 1
  weekdays: number[]; // ISO 1..7; все 7 — каждый день
  reminders: HabitReminder[];
  archived?: boolean;
  order: number;
  createdAt: string;
}

export interface HabitLog {
  id: string; // `${habitId}_${date}`
  habitId: string;
  date: string; // YYYY-MM-DD
  completedCount: number;
}

// ---------- Дневник ----------

export interface DiaryEntry {
  id: string; // = date: одна запись на день
  date: string; // YYYY-MM-DD
  text: string;
  wentWell?: string; // что получилось
  changeTomorrow?: string; // что изменить завтра
  gratitude?: string; // за что благодарен
  createdAt: string;
  updatedAt: string;
}

// ---------- Настройки ----------

export type CalculationMethodId =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey';

export type MadhabId = 'Shafi' | 'Hanafi';

export interface UserSettings {
  latitude?: number;
  longitude?: number;
  locationLabel?: string; // например "Berlin, DE" — для отображения
  calculationMethod: CalculationMethodId;
  madhab: MadhabId;
  hijriOffset?: number; // ручная поправка даты по хиджре, дней (−2…+2)
  calendarView?: CalendarViewMode; // последний выбранный режим Календаря
  showTasksInCalendar?: boolean; // слой «Задачи» в Календаре (по умолчанию включён)
}

export type CalendarViewMode = 'agenda' | 'day' | 'week' | 'month';

export const DEFAULT_SETTINGS: UserSettings = {
  calculationMethod: 'MuslimWorldLeague',
  madhab: 'Shafi',
};
