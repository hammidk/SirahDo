// ЗАГЛУШКА: подключение Firebase для будущей синхронизации.
// На MVP всё хранится локально (см. src/lib/storage.ts). Этот файл — точка
// расширения на будущее, чтобы не переписывать структуру данных, когда
// синхронизация понадобится.
//
// Чтобы включить Firebase:
// 1. npx expo install firebase (или @react-native-firebase/app + /firestore)
// 2. Вставить свои ключи проекта ниже вместо плейсхолдеров
// 3. Заменить вызовы src/lib/storage.ts на чтение/запись в Firestore,
//    оставив ту же сигнатуру функций — экраны менять не придётся.

export const FIREBASE_CONFIG_PLACEHOLDER = {
  apiKey: 'TODO',
  authDomain: 'TODO',
  projectId: 'TODO',
  storageBucket: 'TODO',
  messagingSenderId: 'TODO',
  appId: 'TODO',
};

export const isFirebaseConfigured = false;
