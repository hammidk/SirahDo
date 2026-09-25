// Раскладка элементов дня по времени (режимы «День» и «Неделя»): позиция по
// вертикали и колонки для пересекающихся событий, как в Google Calendar.

export interface TimedItem {
  key: string;
  startMin: number; // минуты от начала дня, 0..1440
  endMin: number;
}

export interface PlacedItem extends TimedItem {
  col: number; // колонка внутри группы пересечений
  cols: number; // сколько колонок в группе
}

export const MIN_BLOCK_MINUTES = 20; // короткие элементы рисуем не ниже этой высоты

/** Группирует пересекающиеся элементы и раздаёт им колонки (жадно, по времени начала). */
export function layoutDay(items: TimedItem[]): PlacedItem[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result: PlacedItem[] = [];
  let group: PlacedItem[] = [];
  let groupEnd = -1;
  let colEnds: number[] = [];

  const flush = () => {
    const cols = colEnds.length || 1;
    for (const it of group) it.cols = cols;
    result.push(...group);
    group = [];
    colEnds = [];
  };

  for (const item of sorted) {
    const end = Math.max(item.endMin, item.startMin + MIN_BLOCK_MINUTES);
    if (group.length && item.startMin >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    let col = colEnds.findIndex((e) => e <= item.startMin);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(end);
    } else {
      colEnds[col] = end;
    }
    group.push({ ...item, col, cols: 1 });
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length) flush();
  return result;
}
