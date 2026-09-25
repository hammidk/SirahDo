// «Фокус дня» (ТЗ §9) — детерминированные напоминания по календарю: день недели,
// дата по хиджре и время относительно намазов. Никакой генерации и никакого ИИ:
// это статичные правила. Формулировки мягкие — приложение напоминает, а не требует.
// Тексты — общеизвестные сунны; команда проекта может их выверить/дополнить здесь.

import dayjs from 'dayjs';

import type { NamazWindow } from './types';
import type { HijriDate } from './hijri';
import { isoWeekday } from './dates';

export interface FocusItem {
  id: string;
  icon: string;
  title: string;
  text: string;
}

interface Input {
  now: Date;
  hijri: HijriDate; // дата по хиджре на сегодня (с учётом поправки)
  windows: NamazWindow[]; // 5 окон сегодняшнего дня (пусто, если локация не задана)
  yesterdayWindows: NamazWindow[]; // нужны после полуночи, когда идёт вчерашнее «Иша → Фаджр»
  currentWindow?: NamazWindow;
}

const time = (iso: string) => dayjs(iso).format('HH:mm');

export function getDayFocus({ now, hijri, windows, yesterdayWindows, currentWindow }: Input): FocusItem[] {
  const items: FocusItem[] = [];
  const weekday = isoWeekday(dayjs(now)); // 1 = Пн … 7 = Вс
  const w = (name: NamazWindow['name']) => windows.find((x) => x.name === name);
  const maghrib = w('maghrib_isha')?.start;
  const afterMaghrib = maghrib ? now.getTime() >= new Date(maghrib).getTime() : false;
  const { month, day } = hijri;

  // ---------- Особые дни года по хиджре ----------
  if (month === 9) {
    const fajr = w('fajr_dhuhr')?.start;
    items.push({
      id: 'ramadan',
      icon: '🌙',
      title: `Рамадан, ${day}-й день`,
      text: fajr && maghrib ? `Сухур — до Фаджра (${time(fajr)}), ифтар — в Магриб (${time(maghrib)}).` : 'Сухур до Фаджра, ифтар в Магриб.',
    });
    if (day >= 20) {
      items.push({
        id: 'qadr',
        icon: '✨',
        title: 'Последние десять ночей',
        text: 'Время искать Ляйлят аль-Кадр: ночной намаз, Коран, дуа.',
      });
    }
  }
  if (month === 10 && day === 1) {
    items.push({ id: 'fitr', icon: '🎉', title: 'Ид аль-Фитр', text: 'Праздник разговения. Праздничный намаз, закят аль-фитр — до намаза.' });
  } else if (month === 10) {
    items.push({ id: 'shawwal', icon: '🌱', title: 'Шесть дней Шавваля', text: 'Сунна — поститься шесть дней в месяце Шавваль.' });
  }
  if (month === 12 && day >= 1 && day <= 7) {
    items.push({ id: 'dhulhijja', icon: '🕋', title: 'Первые дни Зуль-хиджа', text: 'Лучшие дни года: такбир, зикр, благие дела.' });
  }
  if (month === 12 && day === 8) {
    items.push({ id: 'arafa-eve', icon: '🕋', title: 'Завтра — день Арафа', text: 'Для не совершающих хадж — желательный пост.' });
  }
  if (month === 12 && day === 9) {
    items.push({ id: 'arafa', icon: '🕋', title: 'День Арафа', text: 'Пост для не совершающих хадж, больше дуа и зикра.' });
  }
  if (month === 12 && day === 10) {
    items.push({ id: 'adha', icon: '🐑', title: 'Ид аль-Адха', text: 'Праздничный намаз и курбан.' });
  }
  if (month === 12 && day >= 11 && day <= 13) {
    items.push({ id: 'tashriq', icon: '📿', title: 'Дни ташрика', text: 'Такбир после обязательных намазов.' });
  }
  if (month === 1 && day === 1) {
    items.push({ id: 'new-year', icon: '🗓', title: 'Новый год по хиджре', text: 'Начался месяц Мухаррам.' });
  }
  if (month === 1 && (day === 9 || day === 10)) {
    items.push({ id: 'ashura', icon: '🌿', title: day === 10 ? 'День Ашура' : 'Тасуа — канун Ашуры', text: 'Сунна-пост 9 и 10 Мухаррама.' });
  }

  // Дни, в которые пост запрещён: Ид аль-Фитр (1 Шавваля), Ид аль-Адха и ташрик
  // (10–13 Зуль-хиджа). Про добровольный пост на эти даты не напоминаем.
  const noFasting = (m: number, d: number) => (m === 10 && d === 1) || (m === 12 && d >= 10 && d <= 13);
  // Завтрашняя дата по хиджре — приблизительно (месяц может быть 29 или 30 дней).
  const tomorrowForbidden = noFasting(month, day + 1) || (month === 9 && day >= 29);

  // ---------- Белые дни (13–15 числа) ----------
  if (month !== 9) {
    if (day === 12 && !tomorrowForbidden) {
      items.push({ id: 'white-eve', icon: '🤍', title: 'Завтра начинаются «белые дни»', text: '13, 14 и 15 числа — сунна-пост.' });
    } else if (day >= 13 && day <= 15 && !noFasting(month, day)) {
      items.push({ id: 'white', icon: '🤍', title: '«Белые дни»', text: '13–15 числа месяца по хиджре — сунна-пост.' });
    }
  }

  // ---------- Неделя ----------
  if (weekday === 5) {
    items.push({
      id: 'jumuah',
      icon: '🕌',
      title: 'Сегодня Джума',
      text: 'Гусль, сура «аль-Кахф», больше салавата на Пророка ﷺ. Последний час перед Магрибом — время дуа.',
    });
  }
  if (weekday === 4 && afterMaghrib) {
    items.push({ id: 'jumuah-night', icon: '🌙', title: 'Ночь на пятницу', text: 'Хорошее время для салавата и суры «аль-Кахф».' });
  }
  if ((weekday === 7 || weekday === 3) && month !== 9 && !tomorrowForbidden) {
    items.push({
      id: 'monday-thursday',
      icon: '🍽',
      title: `Завтра ${weekday === 7 ? 'понедельник' : 'четверг'}`,
      text: 'День сунна-поста. Намерение можно сделать с вечера.',
    });
  }

  // ---------- Время суток ----------
  const name = currentWindow?.name;
  if (name === 'fajr_dhuhr') {
    items.push({ id: 'morning-adhkar', icon: '🌅', title: 'Утренние азкары', text: 'Лучшее время — после Фаджра.' });
  } else if (name === 'asr_maghrib') {
    items.push({ id: 'evening-adhkar', icon: '🌇', title: 'Вечерние азкары', text: 'Лучшее время — после Асра и до Магриба.' });
  } else if (name === 'isha_fajr' || name === 'maghrib_isha') {
    const start = currentWindow && lastThirdStart([...yesterdayWindows, ...windows], currentWindow);
    if (start) {
      items.push({
        id: 'last-third',
        icon: '⭐',
        title: now >= start ? 'Сейчас последняя треть ночи' : `Последняя треть ночи — с ${dayjs(start).format('HH:mm')}`,
        text: 'Время тахаджуда и дуа.',
      });
    }
    items.push({
      id: 'before-sleep',
      icon: '🛌',
      title: 'Перед сном',
      text: 'Аят аль-Курси, последние аяты «аль-Бакара», короткий разбор дня в дневнике.',
    });
  }

  return items;
}

/** Начало последней трети ночи: ночь = от Магриба до Фаджра следующего дня. */
function lastThirdStart(all: NamazWindow[], current: NamazWindow): Date | undefined {
  const maghrib = all.find((w) => w.date === current.date && w.name === 'maghrib_isha');
  const night = all.find((w) => w.date === current.date && w.name === 'isha_fajr');
  if (!maghrib || !night) return undefined;
  const start = new Date(maghrib.start).getTime();
  const end = new Date(night.end).getTime();
  return new Date(start + ((end - start) * 2) / 3);
}
