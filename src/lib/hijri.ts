// Дата по хиджре. Основной источник — календарь Умм аль-Кура через Intl
// (если движок JS его поддерживает: проверяем на известной дате). Запасной —
// табличный (арифметический) календарь, который расходится с Умм аль-Кура на
// 1–2 дня. Фактическое начало месяца зависит от страны и наблюдения луны,
// поэтому в Профиле есть ручная поправка settings.hijriOffset.
// Допущение: сутки по хиджре здесь начинаются в полночь, а не с Магриба.

import dayjs from 'dayjs';

export interface HijriDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..30
}

export const HIJRI_MONTHS = [
  'Мухаррам',
  'Сафар',
  'Раби аль-авваль',
  'Раби ас-сани',
  'Джумада аль-уля',
  'Джумада ас-сания',
  'Раджаб',
  'Шаабан',
  'Рамадан',
  'Шавваль',
  'Зуль-када',
  'Зуль-хиджа',
];

/** Юлианский день для календарной даты (григорианский календарь). */
function julianDay(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440588;
}

let ummAlQura: Intl.DateTimeFormat | null | undefined;

function readParts(f: Intl.DateTimeFormat, utcMs: number): HijriDate | null {
  const parts = f.formatToParts(new Date(utcMs));
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '', 10);
  const h = { year: get('year'), month: get('month'), day: get('day') };
  return Number.isFinite(h.year) && Number.isFinite(h.month) && Number.isFinite(h.day) ? h : null;
}

/** Форматтер Умм аль-Кура, если он действительно считает по хиджре (18.02.2026 = 1 Рамадан 1447). */
function getUmmAlQura(): Intl.DateTimeFormat | null {
  if (ummAlQura !== undefined) return ummAlQura;
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const probe = readParts(f, Date.UTC(2026, 1, 18, 12));
    ummAlQura = probe && probe.year === 1447 && probe.month === 9 && probe.day === 1 ? f : null;
  } catch {
    ummAlQura = null;
  }
  return ummAlQura;
}

/** Дата (YYYY-MM-DD или Date) → дата по хиджре; offsetDays — ручная поправка. */
export function toHijri(date: string | Date, offsetDays = 0): HijriDate {
  const g = dayjs(date).add(offsetDays, 'day');
  const f = getUmmAlQura();
  if (f) {
    const h = readParts(f, Date.UTC(g.year(), g.month(), g.date(), 12));
    if (h) return h;
  }
  return tabularHijri(g.year(), g.month() + 1, g.date());
}

/** Табличный исламский календарь (запасной вариант). */
export function tabularHijri(y: number, m: number, d: number): HijriDate {
  const jd = julianDay(y, m, d);

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { year, month, day };
}

export function formatHijri(h: HijriDate): string {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year}`;
}
