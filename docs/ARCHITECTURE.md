# Архитектура

Как устроен код. Что делает продукт — [SPEC.md](SPEC.md); технологии — [TECH_STACK.md](TECH_STACK.md).

## Структура `src/`

```
src/
  app/                    маршруты Expo Router (каждый файл — экран)
    _layout.tsx           корень: GestureHandlerRoot → SafeArea → AppDataProvider → LoadingGate (онбординг) → TaskSheetProvider → Stack
    index.tsx             главный экран: AppShell (верхняя панель + пейджер 4 вкладок из components/pages)
    task/[id]  event/[id]  habit/[id]   полные формы (modal); id="new" — создание
    project/[id] tag/[id] filter/[id]   экраны сущностей (filter/[id] — один из 4 фиксированных фильтров)
    inbox  archive  profile  prayer-settings  notifications  help  filters-tags  habit/stats
    diary/index  diary/[date]  history/index  history/[date]
  components/
    pages/                страницы вкладок: TodayPage, TrackerPage, CalendarPage, ProjectsPage (не маршруты)
    nav/                  AppShell (пейджер вкладок), TopBar (аватар + таблетки), AvatarMenu, pagerGesture (контекст жеста)
                          остальное — переиспользуемый UI (ui.tsx, themed.tsx, Icon.tsx, HabitIcon.tsx, TaskSheet.tsx,
                          TaskCard.tsx, today.tsx, calendar/*, NavList, Collapsible, SwipePager, поля: DueField,
                          RecurrenceField, RemindersField, TimeField, DateTimePickerField, CalendarGrid,
                          ChecklistEditor, TagsField, MarkdownEditor/View, IntentionBlock, ProjectSheets, pickers, Fab,
                          LocationSection, Onboarding)
  lib/                    данные и чистая логика (без UI)
  theme/                  colors.ts (токены), navigation.ts (опции шапок)
```

## Слой данных

**Поток:** экран → `useAppData()` (`lib/AppDataContext.tsx`) → `lib/storage.ts` (AsyncStorage). Экраны никогда не ходят в `storage.ts` напрямую — чтобы позже заменить хранилище (Firebase) только в `storage.ts`.

- `storage.ts`: универсальная `collection(key, defaults)` → `getAll / upsert / remove / removeWhere / updateWhere`. `upsert` — частичное обновление по `id` или создание (генерирует `id` и значения по умолчанию). Запись с заданным, но несуществующим `id` создаётся (так работают `HabitLog` и `DiaryEntry`). Все операции по одному ключу сериализуются замком — параллельные сохранения не теряются. Ключи: `sirahdo:<коллекция>`, `sirahdo:settings`, `sirahdo:schemaVersion`.
- **Миграции:** `SCHEMA_VERSION` (сейчас **4**), `migrate()` вызывается при старте до чтения, идемпотентна. v1→v2 — новая модель задачи (срок, П1–П4, теги-сущности, окно по имени), календарь «Личный» по умолчанию. v2→v3 — старые яркие цвета календарей/тегов/событий → палитра Notion. v3→v4 — у привычек эмодзи → id line-иконки, добавлен цвет, убрана сфера; ключ `sirahdo:filters` (пользовательские фильтры) удаляется. Любое изменение формата хранимых данных = новая миграция.
- `AppDataContext` хранит все коллекции в state и даёт операции: задачи (`addOrUpdateTask`, `completeTask` → `CompletionResult`, `undoCompleteTask`, `reopenTask`, `startTask`, `removeTask`), проекты/разделы (с каскадами), теги (уникальность имени), календари, события, привычки (`setHabitCount`), дневник (`saveDiaryEntry` — одна запись на дату), настройки, геолокация. Побочные эффекты сохранения живут здесь: планирование уведомлений, следующее вхождение повторяющейся задачи, `postponedFrom` при переносе, каскадные удаления.
- Старт: миграция → загрузка всего → снятие заставки → пересборка уведомлений. Если онбординг не пройден и координат нет — `LoadingGate` показывает `Onboarding` вместо навигации (решение принимается один раз после загрузки). Ошибка хранилища не вешает приложение (пустое состояние + лог).
- **Расширенный режим:** проверка только через `useAdvancedMode()` из `AppDataContext` (компоненты не читают `settings.advancedMode` напрямую). Скрытие полей не трогает данные.
- **Окно по времени:** `addOrUpdateTask` при сохранении срока со временем ставит `namazWindow = namazWindowAt(date, time)` (`lib/prayerTimes`).

## Модель данных (`lib/types.ts`)

- **Task:** title, description (markdown), checklist[], due {date YYYY-MM-DD, time? HH:mm}, durationMinutes, recurrence, reminders[], priority 1–4, tagIds[], intentionTag, projectId?/sectionId? (нет проекта = Входящие), sphere, namazWindow (имя окна), value, expectedResult, status active|done, createdAt, startedAt, endedAt, comment, postponeReason, postponedFrom[].
- **Project:** title, parentProjectId, sphere, intentionTag, intention, favorite, order, archived. **Section:** projectId, title, intention, order.
- **Tag:** name, color, favorite. Фильтры в данных не хранятся — 4 фиксированных по сроку (`FIXED_FILTERS` в `lib/filters.ts`).
- **Calendar:** name, color, visible, order. **CalendarEvent:** title, allDay, start/end (ISO; для allDay end — начало последнего дня), recurrence, calendarId, colorOverride, reminders[], location, description, links[].
- **Habit:** name, icon (id из `HABIT_ICONS` в `lib/habits.ts`), color (из `CATEGORY_COLORS`), description, targetCountPerDay, weekdays (ISO 1–7), reminders [{time}], archived, order, createdAt. **HabitLog:** id `${habitId}_${date}`, completedCount.
- **DiaryEntry:** id = date, text, wentWell, changeTomorrow, gratitude.
- **Recurrence:** freq day|week|month|year, interval, weekdays?, until?, count?. **Reminder:** {kind:'offset', minutes} | {kind:'at', at}.
- **UserSettings:** userName, latitude, longitude, locationLabel, calculationMethod, madhab, hijriOffset, calendarView, showTasksInCalendar, advancedMode, onboardingDone. Новые поля настроек — со значением по умолчанию в `DEFAULT_SETTINGS`: сохранённые настройки сливаются с ним при чтении, миграция для них не нужна.
- Справочники (`SPHERES`, `INTENTION_TAGS`, `PRIORITIES`, `NAMAZ_WINDOW_*`, `PRAYER_*`, `CALENDAR_COLORS`) — константы в `types.ts`.

## Уведомления (`lib/notifications.ts`)

- Идентификатор уведомления детерминирован (`task:<id>:<n>`, `event:<id>:<date>:<n>`, `habit:<id>:<n>[:<weekday>]`) — id уведомлений в данных не хранятся, снятие — по префиксу.
- Задача: DATE-триггеры по её напоминаниям (только текущее вхождение). Событие: вхождения на 14 дней вперёд. Привычка: DAILY или WEEKLY-триггеры.
- Лимит iOS 64: при полной пересборке — не больше 60, из них привычкам ≤ 30, остальное — ближайшие по времени. Полная пересборка при старте и при возврате в приложение раз в 6 часов; разрешение запрашивается только при первом реальном напоминании.
- Все операции идут в одной очереди. На вебе — no-op. Тап по уведомлению задачи → `router.push(url)` из `data.url`.

## Чистая логика (`lib/`)

`recurrence` (пресеты, описание, вхождения, следующее вхождение), `dates` (ISO-день недели, срок, склонение `plural`, длительность словами `formatDurationLong`), `prayerTimes` (adhan, окна дня, `prayerStatus` — наступивший и следующий намаз для ориентира на «Сегодня»), `hijri` (Intl Умм аль-Кура с проверкой на известной дате + табличный запасной), `events` (вхождения событий на дату), `calendarData`/`timeline` (данные дня и колонки пересечений для шкалы; шкалу использует и «Сегодня»), `habits` (расписание, серии, статистика, набор иконок), `history`, `filters` (4 фиксированных фильтра), `projects` (дерево, глубина, путь), `markdown` (разбор, операции панели форматирования, продолжение списков, позиция курсора), `cities` (офлайн-список), `calcMethods` (методы расчёта в настройках, подсказка метода по стране), `hooks` (`useNow`).

## UI-система

- `theme/colors.ts` — все цвета (палитра Notion Dark, `COLORS` с семантическими именами, `withAlpha`, `tagBackground`, `readableOn` — цвет текста поверх заливки цветом категории, `RADIUS`, `CATEGORY_COLORS`). Хексов в компонентах нет.
- `components/themed.tsx` — `Text` (светлый по умолчанию), `TextInput` (тёмная клавиатура, плейсхолдер tertiary, синяя обводка в фокусе; `plain` — без обводки), `Switch`. **Импортировать их, а не одноимённые из `react-native`.**
- `components/Icon.tsx` — семантические имена → иконки Lucide (`<Icon name="calendar" />`, `filled` для звезды).
- `components/ui.tsx` — `FieldLabel`, `FormSection` (секция-карточка формы), `Chip`/`ChipsRow`, `FieldRow` (строка-свойство), `Sheet` (нижний лист над клавиатурой), `Button` (primary/secondary/danger), `confirmDestructive` (на вебе — `confirm()`), `sharedStyles`; реэкспорт `COLORS`, `RADIUS`.
- **Жесты** — `react-native-gesture-handler` + Reanimated (worklets; значения — через `.get()`/`.set()` ради React Compiler). `nav/AppShell` — свой пейджер вкладок: Pan-жест по всей оболочке (панель + страницы), лента страниц со сдвигом `translateX`, дробный прогресс для анимации таблеток в `TopBar`; жест кладётся в `TabPagerGestureContext`. `components/SwipePager.tsx` — листание периода; берёт жест вкладок из контекста и вызывает `blocksExternalGesture` — внутри своей области листает даты. `Sheet` (модалка) — свой `GestureHandlerRootView` и пустой контекст жеста. На вебе после перетаскивания мышью гасится системный click (`useWebDragClickGuard`). `components/Collapsible.tsx` — сворачиваемая секция с анимацией высоты. `components/NavList.tsx` — группы строк-ссылок (Проекты, «Фильтры и теги») на одной сетке отступов. `components/HabitIcon.tsx` — id иконки привычки → Lucide.
- `components/calendar/CalendarViews.tsx` — шкала дня/недели, месяц, расписание; `DayTimeline` — шкала одного дня без своей прокрутки (для «Сегодня»), с кружком «выполнить» у задач.
- `theme/navigation.ts` — общие опции шапок Stack в тёмной теме (у главного экрана шапки нет — там `TopBar`).
- `components/TaskSheet.tsx` — провайдер `useTaskSheet()`: `openTask({taskId?|defaults})` (компактный вид), `completeWithFeedback` (плашка «Итог / Отменить»), лист «Итог».
- Вложенные кнопки не делать (ломают доступность на вебе): доп. действия — соседями основной области (`TaskCard` с `trailing`).
