# Технологический стек

Источник истины о том, НА ЧЁМ строится приложение. Точные версии — в `package.json`; здесь — то, что важно для решений.
Почему выбрано именно так — [DECISIONS.md](DECISIONS.md). Как устроен код — [ARCHITECTURE.md](ARCHITECTURE.md).

## Основа

| Что | Технология | Зачем / важное |
|---|---|---|
| Платформа | **Expo SDK 57** (`expo ~57.0.25`), React Native 0.86, React 19.2 | Один код для iOS/Android/web; проверка на телефоне через **Expo Go** |
| Язык | TypeScript ~6.0, `strict: true` | Весь код в `src/` — `.ts/.tsx` |
| Навигация | **Expo Router** (файловые маршруты в `src/app/`) | Stack (корень); главный экран — своя оболочка с верхней панелью и пейджером вкладок (не Tabs); модалки — `presentation: 'modal'` |
| Хранилище | `@react-native-async-storage/async-storage` **2.2.0** | Единственное хранилище данных, только на устройстве. Версия закреплена под Expo Go SDK 57 (3.x там не работает) |
| Состояние | React Context (`AppDataContext`) | Единая точка правды для экранов; без Redux/Zustand |
| Backend / БД / авторизация | **нет** | Облачная синхронизация — вне MVP (`src/lib/firebase.ts` — заглушка с планом) |

## Ключевые библиотеки

| Библиотека | Назначение |
|---|---|
| `adhan` | Офлайн-расчёт времён намаза по координатам, методу и мазхабу |
| `dayjs` (+ локаль `ru`) | Даты. Даты дней хранятся строками `YYYY-MM-DD` в локальном времени |
| `expo-notifications` | Локальные напоминания (задачи, события, привычки); работают в Expo Go |
| `expo-location` | GPS, обратный геокодинг (подпись места), геокодинг города (только iOS/Android) |
| `lucide-react-native` + `react-native-svg` | Line-иконки интерфейса (оба пакета есть в Expo Go) |
| `expo-splash-screen` | Заставка; держится, пока грузятся данные |
| `react-native-gesture-handler` ~2.32 | Жесты: свайп вкладок, листание дат, закрытие меню свайпом. Версия SDK 57 (в Expo Go); без явной зависимости npm ставил 3.x как peer expo-router — несовместимо с Expo Go |
| `react-native-reanimated` 4.5.1 + `react-native-worklets` 0.10.1 | Анимации жестов и таблеток (worklets, `scheduleOnRN`); плагин Babel подключает `babel-preset-expo`. **Закреплены версиями SDK 57**, иначе npm тянет несовместимые и `npm ci` на EAS падает |
| `expo-font`, `expo-linking`, `expo-constants`, `expo-status-bar`, `react-native-screens`, `react-native-safe-area-context`, `react-native-web`/`react-dom` | Стандартная обвязка Expo / веб-сборка |

Собственные компоненты вместо библиотек: пикеры даты/времени, сетки календаря, markdown-редактор (без WebView), нижние листы, сворачиваемые секции (`Animated`), пейджер вкладок и свайп-листание периодов (gesture-handler + Reanimated).
Правило: новые нативные зависимости — только из состава Expo Go, иначе нужен dev build (предупреждать пользователя).

## Качество

- Проверка типов: `npx tsc --noEmit`.
- Линтер: `npx expo lint` (ESLint 9, `eslint-config-expo`, flat config `eslint.config.js`). В правилах есть проверки React Compiler/хуков: ручные `useMemo`, которые компилятор не может сохранить, убирать; `setState` в эффектах и доступ к `ref` при рендере запрещены.
- Сборка: `npx expo export -p web` — быстрая проверка, что всё бандлится.
- Совместимость зависимостей: `npx expo-doctor`, исправление — `npx expo install --fix`.
- Автотестов (Jest и т.п.) **нет**. Чистая логика (`recurrence`, `dates`, `habits`, `filters`, `projects`, `prayerTimes`, `markdown`, `timeline`) проверялась разовыми node-скриптами; UI — в веб-сборке во встроенном браузере.
- Форматтер (Prettier) не подключён.

## Сборка и поставка

- **EAS Build** (`eas.json`): профили `preview` (Android APK, внутреннее распространение) и `production` (autoIncrement); общий `base` с `node: 24.21.0`. `appVersionSource: remote`.
- EAS-проект: **@sirahdo/SirahDo** (организация `sirahdo`, аккаунт `kemranh`), projectId `c11c7017-2b5b-456f-b296-48fe1b753d55`.
- Идентификатор приложения: `com.sirahdo.app` (iOS и Android). Ключ подписи Android хранится в EAS (remote credentials).
- Команды: `npx --cache ~/.npm-eas eas-cli@latest build -p android --profile preview --non-interactive` (сборка), `… build:view <id> --json` (статус).
- iOS-сборка требует платного Apple Developer аккаунта — не настраивалась.
- CNG: папок `ios/` и `android/` нет — нативная конфигурация только через `app.json` и config plugins (`expo-router`, `expo-font`, `expo-splash-screen`, `expo-location` с текстом разрешения).

## Окружение разработки

- Node **24.21.0 LTS** локально и на EAS; npm 11.
- Запуск: `npx expo start --tunnel` (телефон и Mac в разных сетях) — если `npx` зависает, `./node_modules/.bin/expo start --tunnel --clear`.
- Веб-превью для визуальной проверки: `.claude/launch.json` → конфигурация `expo-web` (порт 8082).
- `app.json`: `userInterfaceStyle: dark`, `scheme: sirahdo`, `orientation: portrait`.
