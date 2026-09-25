# Архитектура

Как устроен код. Что делает продукт — [SPEC.md](SPEC.md); технологии — [TECH_STACK.md](TECH_STACK.md).

## Структура `src/`

```
src/
  app/                    маршруты Expo Router (каждый файл — экран)
    _layout.tsx           корень: SafeArea → AppDataProvider → LoadingGate → TaskSheetProvider → Stack
    (tabs)/               вкладки: index (Сегодня), calendar, tracker, overview
    task/[id]  event/[id]  habit/[id]   полные формы (modal); id="new" — создание
    project/[id] tag/[id] filter/[id]   экраны сущностей (filter/new — создание)
    inbox  archive  profile  habit/stats  diary/index  diary/[date]  history/index  history/[date]
  components/             переиспользуемый UI (ui.tsx, themed.tsx, Icon.tsx, TaskSheet.tsx, TaskCard.tsx,
                          today.tsx, calendar/*, поля: DueField, RecurrenceField, RemindersField, TimeField,
                          DateTimePickerField, CalendarGrid, ChecklistEditor, TagsField, MarkdownEditor/View,
                          IntentionBlock, ProjectSheets, pickers, Fab)
  lib/                    данные и чистая логика (без UI)
  theme/                  colors.ts (токены), navigation.ts (опции шапок)
```

## Слой данных

**Поток:** экран → `useAppData()` (`lib/AppDataContext.tsx`) → `lib/storage.ts` (AsyncStorage). Экраны никогда не ходят в `storage.ts` напрямую — чтобы позже заменить хранилище (Firebase) только в `storage.ts`.

- `storage.ts`: универсальная `collection(key, defaults)` → `getAll / upsert / remove / removeWhere / updateWhere`. `upsert` — частичное обновление по `id` или создание (генерирует `id` и значения по умолчанию). Запись с заданным, но несуществующим `id` создаётся (так работают `HabitLog` и `DiaryEntry`). Все операции по одному ключу сериализуются замком — параллельные сохранения не теряются. Ключи: `sirahdo:<коллекция>`, `sirahdo:settings`, `sirahdo:schemaVersion`.
- **Миграции:** `SCHEMA_VERSION` (сейчас **3**), `migrate()` вызывается при старте до чтения, идемпотентна. v1→v2 — новая модель задачи (срок, П1–П4, теги-сущности, окно по имени), календарь «Личный» по умолчанию. v2→v3 — старые яркие цвета календарей/тегов/событий → палитра Notion. Любое изменение формата хранимых данных = новая миграция.
- `AppDataContext` хранит все коллекции в state и даёт операции: задачи (`addOrUpdateTask`, `completeTask` → `CompletionResult`, `undoCompleteTask`, `reopenTask`, `startTask`, `removeTask`), проекты/разделы (с каскадами), теги (уникальность имени), фильтры, календари, события, привычки (`setHabitCount`), дневник (`saveDiaryEntry` — одна запись на дату), настройки, геолокация. Побочные эффекты сохранения живут здесь: планирование уведомлений, следующее вхождение повторяющейся задачи, `postponedFrom` при переносе, каскадные удаления.
- Старт: миграция → загрузка всего → снятие заставки → пересборка уведомлений → запрос геолокации, если координат нет. Ошибка хранилища не вешает приложение (пустое состояние + лог).

## Модель данных (`lib/types.ts`)

- **Task:** title, description (markdown), checklist[], due {date YYYY-MM-DD, time? HH:mm}, durationMinutes, recurrence, reminders[], priority 1–4, tagIds[], intentionTag, projectId?/sectionId? (нет проекта = Входящие), sphere, namazWindow (имя окна), value, expectedResult, status active|done, createdAt, startedAt, endedAt, comment, postponeReason, postponedFrom[].
- **Project:** title, parentProjectId, sphere, intentionTag, intention, favorite, order, archived. **Section:** projectId, title, intention, order.
- **Tag:** name, color, favorite. **Filter:** name, criteria {spheres, tagIds, intentionTags, priorities, due}, favorite, order.
- **Calendar:** name, color, visible, order. **CalendarEvent:** title, allDay, start/end (ISO; для allDay end — начало последнего дня), recurrence, calendarId, colorOverride, reminders[], location, description, links[].
- **Habit:** name, icon (эмодзи), description, sphere, targetCountPerDay, weekdays (ISO 1–7), reminders [{time}], archived, order, createdAt. **HabitLog:** id `${habitId}_${date}`, completedCount.
- **DiaryEntry:** id = date, text, wentWell, changeTomorrow, gratitude.
- **Recurrence:** freq day|week|month|year, interval, weekdays?, until?, count?. **Reminder:** {kind:'offset', minutes} | {kind:'at', at}.
- **UserSettings:** latitude, longitude, locationLabel, calculationMethod, madhab, hijriOffset, calendarView, showTasksInCalendar.
- Справочники (`SPHERES`, `INTENTION_TAGS`, `PRIORITIES`, `NAMAZ_WINDOW_*`, `CALENDAR_COLORS`) — константы в `types.ts`.

## Уведомления (`lib/notifications.ts`)

- Идентификатор уведомления детерминирован (`task:<id>:<n>`, `event:<id>:<date>:<n>`, `habit:<id>:<n>[:<weekday>]`) — id уведомлений в данных не хранятся, снятие — по префиксу.
- Задача: DATE-триггеры по её напоминаниям (только текущее вхождение). Событие: вхождения на 14 дней вперёд. Привычка: DAILY или WEEKLY-триггеры.
- Лимит iOS 64: при полной пересборке — не больше 60, из них привычкам ≤ 30, остальное — ближайшие по времени. Полная пересборка при старте и при возврате в приложение раз в 6 часов; разрешение запрашивается только при первом реальном напоминании.
- Все операции идут в одной очереди. На вебе — no-op. Тап по уведомлению задачи → `router.push(url)` из `data.url`.

## Чистая логика (`lib/`)

`recurrence` (пресеты, описание, вхождения, следующее вхождение), `dates` (ISO-день недели, срок, форматирование), `prayerTimes` (adhan, окна дня, контекст «сейчас» с учётом вчерашней ночи), `hijri` (Intl Умм аль-Кура с проверкой на известной дате + табличный запасной), `dayPlan` (раскладка задач/событий по окнам, свободное время), `dayFocus` (правила Фокуса дня), `events` (вхождения событий на дату), `calendarData`/`timeline` (данные дня и колонки пересечений для шкалы), `habits` (расписание, серии, статистика), `history`, `filters`, `projects` (дерево, глубина, путь), `markdown` (разбор, операции панели форматирования, продолжение списков, позиция курсора), `cities` (офлайн-список), `hooks` (`useNow`).

## UI-система

- `theme/colors.ts` — все цвета (палитра Notion Dark, `COLORS` с семантическими именами, `withAlpha`, `tagBackground`, `RADIUS`, `CATEGORY_COLORS`). Хексов в компонентах нет.
- `components/themed.tsx` — `Text` (светлый по умолчанию), `TextInput` (тёмная клавиатура, плейсхолдер tertiary, синяя обводка в фокусе; `plain` — без обводки), `Switch`. **Импортировать их, а не одноимённые из `react-native`.**
- `components/Icon.tsx` — семантические имена → иконки Lucide (`<Icon name="calendar" />`, `filled` для звезды).
- `components/ui.tsx` — `FieldLabel`, `Chip`/`ChipsRow`, `FieldRow` (строка-свойство), `Sheet` (нижний лист над клавиатурой), `Button` (primary/secondary/danger), `confirmDestructive` (на вебе — `confirm()`), `sharedStyles`; реэкспорт `COLORS`, `RADIUS`.
- `theme/navigation.ts` — общие опции шапок; Stack и Tabs в тёмной теме.
- `components/TaskSheet.tsx` — провайдер `useTaskSheet()`: `openTask({taskId?|defaults})` (компактный вид), `completeWithFeedback` (плашка «Итог / Отменить»), лист «Итог».
- Вложенные кнопки не делать (ломают доступность на вебе): доп. действия — соседями основной области (`TaskCard` с `trailing`).
