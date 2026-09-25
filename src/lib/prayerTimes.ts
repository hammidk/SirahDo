// Расчёт времён намаза и построение 5 окон дня.
// Библиотека `adhan` считает локально по координатам — работает офлайн,
// без обращения к внешнему API. См. "ТЗ - Исламское дополнение", п.1.

import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Madhab,
} from 'adhan';
import dayjs from 'dayjs';
import type {
  CalculationMethodId,
  MadhabId,
  NamazWindow,
  NamazWindowName,
  PrayerTimesForDay,
  UserSettings,
} from './types';
import { NAMAZ_WINDOW_TITLES } from './types';

function resolveCalculationMethod(id: CalculationMethodId) {
  const map: Record<CalculationMethodId, () => ReturnType<typeof CalculationMethod.Other>> = {
    MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
    Egyptian: CalculationMethod.Egyptian,
    Karachi: CalculationMethod.Karachi,
    UmmAlQura: CalculationMethod.UmmAlQura,
    Dubai: CalculationMethod.Dubai,
    MoonsightingCommittee: CalculationMethod.MoonsightingCommittee,
    NorthAmerica: CalculationMethod.NorthAmerica,
    Kuwait: CalculationMethod.Kuwait,
    Qatar: CalculationMethod.Qatar,
    Singapore: CalculationMethod.Singapore,
    Tehran: CalculationMethod.Tehran,
    Turkey: CalculationMethod.Turkey,
  };
  return (map[id] ?? CalculationMethod.MuslimWorldLeague)();
}

function resolveMadhab(id: MadhabId) {
  return id === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
}

/** Считает 5 времён намаза на конкретную календарную дату. */
export function calculatePrayerTimesForDate(
  date: Date,
  settings: UserSettings
): PrayerTimesForDay | null {
  if (settings.latitude == null || settings.longitude == null) {
    return null; // локация ещё не настроена — см. экран "Профиль"
  }
  const coordinates = new Coordinates(settings.latitude, settings.longitude);
  const params = resolveCalculationMethod(settings.calculationMethod);
  params.madhab = resolveMadhab(settings.madhab);
  const times = new PrayerTimes(coordinates, date, params);

  return {
    date: dayjs(date).format('YYYY-MM-DD'),
    fajr: times.fajr.toISOString(),
    dhuhr: times.dhuhr.toISOString(),
    asr: times.asr.toISOString(),
    maghrib: times.maghrib.toISOString(),
    isha: times.isha.toISOString(),
  };
}

/**
 * Строит 5 окон дня из времён намаза текущего и следующего дня
 * (последнее окно "Иша → Фаджр" уходит за полночь).
 */
export function buildNamazWindows(
  today: PrayerTimesForDay,
  tomorrowFajrIso: string
): NamazWindow[] {
  const order: { name: NamazWindowName; start: string; end: string }[] = [
    { name: 'fajr_dhuhr', start: today.fajr, end: today.dhuhr },
    { name: 'dhuhr_asr', start: today.dhuhr, end: today.asr },
    { name: 'asr_maghrib', start: today.asr, end: today.maghrib },
    { name: 'maghrib_isha', start: today.maghrib, end: today.isha },
    { name: 'isha_fajr', start: today.isha, end: tomorrowFajrIso },
  ];

  return order.map(({ name, start, end }) => ({
    id: `${today.date}_${name}`,
    date: today.date,
    name,
    title: NAMAZ_WINDOW_TITLES[name],
    start,
    end,
  }));
}

/** Возвращает окно, в которое попадает переданный момент времени, если оно есть. */
export function findCurrentWindow(
  windows: NamazWindow[],
  at: Date = new Date()
): NamazWindow | undefined {
  const ts = at.getTime();
  return windows.find((w) => ts >= new Date(w.start).getTime() && ts < new Date(w.end).getTime());
}

/** 5 окон намаза на календарную дату (YYYY-MM-DD или Date); пусто, если локация не задана. */
export function namazWindowsForDate(date: string | Date, settings: UserSettings): NamazWindow[] {
  const day = dayjs(date).startOf('day').hour(12); // полдень — чтобы не зацепить соседние сутки при переходе на летнее время
  const today = calculatePrayerTimesForDate(day.toDate(), settings);
  if (!today) return [];
  const tomorrow = calculatePrayerTimesForDate(day.add(1, 'day').toDate(), settings);
  return buildNamazWindows(today, tomorrow ? tomorrow.fajr : today.isha);
}

export interface PrayerDayContext {
  dayKey: string; // YYYY-MM-DD — «сегодня» для ленты
  windows: NamazWindow[]; // 5 окон сегодняшнего дня
  yesterdayWindows: NamazWindow[];
  current?: NamazWindow; // окно, которое идёт сейчас (после полуночи — вчерашнее «Иша → Фаджр»)
}

/** Окна сегодняшнего дня и текущее окно на момент now. */
export function prayerDayContext(now: Date, settings: UserSettings): PrayerDayContext {
  const day = dayjs(now);
  const dayKey = day.format('YYYY-MM-DD');
  const windows = namazWindowsForDate(dayKey, settings);
  const yesterdayWindows = namazWindowsForDate(day.subtract(1, 'day').format('YYYY-MM-DD'), settings);
  const current = findCurrentWindow([...yesterdayWindows, ...windows], now);
  return { dayKey, windows, yesterdayWindows, current };
}
