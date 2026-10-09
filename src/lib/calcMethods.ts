// Методы расчёта времени намаза, доступные в настройках, и подсказка метода по стране
// (онбординг, docs/spec/prayer-profile.md).

import type { CalculationMethodId } from './types';

export const CALCULATION_METHODS: { id: CalculationMethodId; title: string }[] = [
  { id: 'MuslimWorldLeague', title: 'Muslim World League' },
  { id: 'Egyptian', title: 'Egyptian' },
  { id: 'Karachi', title: 'Karachi' },
  { id: 'UmmAlQura', title: 'Umm al-Qura' },
  { id: 'Dubai', title: 'Dubai' },
  { id: 'MoonsightingCommittee', title: 'Moonsighting Committee' },
  { id: 'NorthAmerica', title: 'ISNA (North America)' },
  { id: 'Turkey', title: 'Turkey (Diyanet)' },
];

// Страна (как её пишет встроенный список городов или системный геокодер: по-русски,
// по-английски или по-турецки) → принятый там метод. Остальным — Muslim World League.
const BY_COUNTRY: { match: RegExp; method: CalculationMethodId }[] = [
  { match: /турц|turk|türk/i, method: 'Turkey' },
  { match: /сауд|saudi|arabia/i, method: 'UmmAlQura' },
  { match: /оаэ|emirates|uae/i, method: 'Dubai' },
  { match: /египет|egypt/i, method: 'Egyptian' },
  { match: /пакистан|pakistan|инди|india|бангладеш|bangladesh|афганистан|afghanistan/i, method: 'Karachi' },
  { match: /сша|usa|united states|канада|canada/i, method: 'NorthAmerica' },
];

/** Подсказка метода расчёта по подписи места («Стамбул, Турция»). */
export function suggestMethod(locationLabel?: string): CalculationMethodId {
  if (!locationLabel) return 'MuslimWorldLeague';
  return BY_COUNTRY.find((c) => c.match.test(locationLabel))?.method ?? 'MuslimWorldLeague';
}
