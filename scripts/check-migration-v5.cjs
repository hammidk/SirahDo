// Проверка миграции данных v4 → v5 на искусственном наборе (docs/ARCHITECTURE.md,
// «План миграции v4 → v5»). Запуск: node scripts/check-migration-v5.cjs
// Грузит настоящий src/lib/storage.ts, подменяя AsyncStorage хранилищем в памяти.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(out.outputText, filename);
};

const mem = new Map();
const AsyncStorage = {
  getItem: async (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: async (k, v) => void mem.set(k, String(v)),
  removeItem: async (k) => void mem.delete(k),
};
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return { __esModule: true, default: AsyncStorage };
  return originalLoad.call(this, request, ...rest);
};

const storage = require(path.join(__dirname, '..', 'src', 'lib', 'storage.ts'));

const K = (name) => `sirahdo:${name}`;
const put = (name, value) => mem.set(K(name), JSON.stringify(value));
const get = (name) => JSON.parse(mem.get(K(name)) ?? 'null');
const snapshot = () => new Map(mem);

function seedV4() {
  mem.clear();
  mem.set(K('schemaVersion'), '4');
  put('projects', [
    { id: 'B', title: 'Работа', order: 1, favorite: true },
    { id: 'A', title: 'Дом', order: 0, intention: 'Ради семьи', sphere: 'family' },
    { id: 'A2', title: 'Старое', order: 1, parentProjectId: 'A', archived: true },
    { id: 'A1', title: 'Ремонт', order: 0, parentProjectId: 'A', intentionTag: 'dunya' },
    { id: 'A1x', title: 'Кухня', order: 0, parentProjectId: 'A1' },
    { id: 'A2a', title: 'Чердак', order: 0, parentProjectId: 'A2' },
    { id: 'A3', title: 'Заметки', order: 2, parentProjectId: 'A' },
    { id: 'B1', title: 'Заметки', order: 0, parentProjectId: 'B' },
    { id: 'D', title: 'Сирота', order: 2, parentProjectId: 'нет-такого' },
    { id: 'E', title: 'Цикл 1', order: 3, parentProjectId: 'F' },
    { id: 'F', title: 'Цикл 2', order: 4, parentProjectId: 'E' },
  ]);
  put('sections', [
    { id: 's1', projectId: 'A1', title: 'Материалы', intention: 'Не переплатить', order: 0 },
    { id: 's2', projectId: 'B', title: 'Отчёты', order: 0 },
  ]);
  put('tags', [{ id: 't1', name: 'срочно', color: '#529CCA', favorite: true }]);
  put('tasks', [
    {
      id: 'k1', title: 'Купить плитку', checklist: [{ id: 'c1', text: 'Замерить', done: true }], reminders: [],
      priority: 1, tagIds: ['t1'], intentionTag: 'obligation', projectId: 'A1', sectionId: 's1', sphere: 'family',
      durationMinutes: 45, value: 'Уют', expectedResult: 'Плитка дома', namazWindow: 'dhuhr_asr',
      due: { date: '2026-10-10', time: '14:00' }, status: 'active', createdAt: '2026-10-01T10:00:00.000Z',
      postponedFrom: ['2026-10-05'], postponeReason: 'Не успел',
    },
    {
      id: 'k2', title: 'Отчёт', checklist: [], reminders: [{ kind: 'offset', minutes: 10 }], priority: 4, tagIds: [],
      projectId: 'B', sectionId: 's2', status: 'done', createdAt: '2026-10-01T10:00:00.000Z',
      startedAt: '2026-10-02T09:00:00.000Z', endedAt: '2026-10-02T10:00:00.000Z', comment: 'Сдал',
    },
    { id: 'k3', title: 'Во входящих', checklist: [], reminders: [], priority: 4, tagIds: [], status: 'active', createdAt: '2026-10-03T10:00:00.000Z' },
    { id: 'k4', title: 'На чердаке', checklist: [], reminders: [], priority: 2, tagIds: [], projectId: 'A2a', status: 'active', createdAt: '2026-10-03T10:00:00.000Z' },
  ]);
  put('calendars', [{ id: 'default', name: 'Личный', color: '#529CCA', visible: true, order: 0 }]);
  put('events', [{ id: 'e1', title: 'Джума', allDay: false, start: '2026-10-09T11:00:00.000Z', end: '2026-10-09T12:00:00.000Z', calendarId: 'default', reminders: [], links: [], createdAt: '2026-10-01T10:00:00.000Z' }]);
  put('habits', [{ id: 'h1', name: 'Коран', icon: 'book', color: '#4DAB9A', targetCountPerDay: 1, weekdays: [1, 2, 3, 4, 5, 6, 7], reminders: [{ time: '06:30' }], order: 0, createdAt: '2026-09-01T10:00:00.000Z' }]);
  put('habitLogs', [{ id: 'h1_2026-10-08', habitId: 'h1', date: '2026-10-08', completedCount: 1 }]);
  put('diary', [{ id: '2026-10-08', date: '2026-10-08', text: 'Хороший день', wentWell: 'Намаз вовремя', changeTomorrow: 'Раньше встать', gratitude: 'Семья', createdAt: '2026-10-08T20:00:00.000Z', updatedAt: '2026-10-08T20:00:00.000Z' }]);
  put('settings', { calculationMethod: 'Turkey', madhab: 'Hanafi', advancedMode: true, calendarView: 'agenda', onboardingDone: true, latitude: 41.0, longitude: 28.9 });
}

const UNTOUCHED = ['sections', 'tags', 'tasks', 'calendars', 'events', 'habits', 'habitLogs', 'diary', 'settings'];

async function main() {
  // 1. Полный набор v4 → v5.
  seedV4();
  const before = snapshot();
  await storage.migrate();

  assert.equal(mem.get(K('schemaVersion')), String(storage.SCHEMA_VERSION));
  assert.equal(storage.SCHEMA_VERSION, 5);
  for (const name of UNTOUCHED) assert.equal(mem.get(K(name)), before.get(K(name)), `коллекция ${name} изменилась`);
  assert.equal(mem.get(K('backup:v4:projects')), before.get(K('projects')), 'копия проектов не равна исходнику');

  const original = JSON.parse(before.get(K('projects')));
  const flat = get('projects');
  assert.equal(flat.length, original.length, 'число проектов изменилось');
  const byId = Object.fromEntries(flat.map((p) => [p.id, p]));

  // Названия-пути и сохранённые исходные названия.
  assert.equal(byId.A.title, 'Дом');
  assert.equal(byId.A.legacyTitle, undefined);
  assert.equal(byId.A1.title, 'Дом / Ремонт');
  assert.equal(byId.A1.legacyTitle, 'Ремонт');
  assert.equal(byId.A1x.title, 'Дом / Ремонт / Кухня');
  assert.equal(byId.A3.title, 'Дом / Заметки');
  assert.equal(byId.B1.title, 'Работа / Заметки');
  assert.equal(byId.D.title, 'Сирота', 'проект с потерянным родителем не переименовывается');
  // Цикл в данных не вешает миграцию и не теряет записи.
  assert.ok(byId.E && byId.F);

  // Архив наследуется от предка; чужой архив не трогается.
  assert.equal(byId.A2.archived, true);
  assert.equal(byId.A2a.archived, true, 'подпроект архивного родителя должен уйти в архив');
  assert.equal(byId.A2a.title, 'Дом / Старое / Чердак');
  assert.ok(!byId.A1.archived && !byId.B1.archived);

  // Наследие на месте: ничего не стёрто.
  for (const p of original) {
    for (const [key, value] of Object.entries(p)) {
      if (key === 'title' || key === 'order' || key === 'archived') continue;
      assert.deepEqual(byId[p.id][key], value, `поле ${key} проекта ${p.id} потеряно`);
    }
  }
  assert.equal(byId.A.intention, 'Ради семьи');
  assert.equal(byId.A1.parentProjectId, 'A');

  // Порядок — обход дерева в глубину, без повторов.
  const order = [...flat].sort((a, b) => a.order - b.order).map((p) => p.id);
  assert.deepEqual(order.slice(0, 9), ['A', 'A1', 'A1x', 'A2', 'A2a', 'A3', 'B', 'B1', 'D']);
  assert.equal(new Set(flat.map((p) => p.order)).size, flat.length, 'order должен быть уникальным');

  // 2. Повторный запуск (версия сброшена на 4) ничего не меняет.
  const afterFirst = snapshot();
  mem.set(K('schemaVersion'), '4');
  await storage.migrate();
  for (const [key, value] of afterFirst) assert.equal(mem.get(key), value, `повторная миграция изменила ${key}`);

  // 3. После миграции пользователь переименовал и вернул из архива бывший подпроект —
  //    повторный запуск не откатывает его правки.
  const edited = get('projects').map((p) => (p.id === 'A2a' ? { ...p, title: 'Чердак (разобрать)', archived: false } : p));
  put('projects', edited);
  mem.set(K('schemaVersion'), '4');
  await storage.migrate();
  assert.deepEqual(get('projects'), edited);

  // 4. Новый список после миграции получает порядок в конце общего списка.
  const created = await storage.projects.upsert({ title: 'Новый список' });
  assert.ok(created.order > Math.max(...edited.map((p) => p.order)));
  assert.equal(created.parentProjectId, undefined);

  // 5. Данные без вложенности: проекты не переписываются, копия не создаётся.
  seedV4();
  put('projects', [{ id: 'A', title: 'Дом', order: 0 }, { id: 'B', title: 'Работа', order: 1 }]);
  const flatBefore = mem.get(K('projects'));
  await storage.migrate();
  assert.equal(mem.get(K('projects')), flatBefore);
  assert.equal(mem.has(K('backup:v4:projects')), false);

  // 6. Пустое хранилище (чистая установка).
  mem.clear();
  await storage.migrate();
  assert.equal(mem.get(K('schemaVersion')), '5');
  assert.equal(mem.has(K('projects')), false);

  console.log('Миграция v5: все проверки пройдены');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
