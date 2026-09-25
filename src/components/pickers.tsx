// Выбор из фиксированных справочников: сфера жизни, тег намерения, приоритет,
// окно намаза. Общие для задачи, проекта и привычки.

import { INTENTION_TAGS, NAMAZ_WINDOW_ORDER, NAMAZ_WINDOW_TITLES, PRIORITIES, SPHERES } from '../lib/types';
import type { IntentionTagId, NamazWindow, NamazWindowName, Priority, SphereId } from '../lib/types';
import dayjs from 'dayjs';
import { Chip, ChipsRow } from './ui';
import { COLORS } from '../theme/colors';

/** Одиночный выбор с возможностью снять выбор повторным тапом. */
export function SpherePicker({ value, onChange }: { value?: SphereId; onChange: (v: SphereId | undefined) => void }) {
  return (
    <ChipsRow>
      {SPHERES.map((s) => (
        <Chip key={s.id} label={s.title} active={value === s.id} onPress={() => onChange(value === s.id ? undefined : s.id)} />
      ))}
    </ChipsRow>
  );
}

export function IntentionTagPicker({
  value,
  onChange,
}: {
  value?: IntentionTagId;
  onChange: (v: IntentionTagId | undefined) => void;
}) {
  return (
    <ChipsRow>
      {INTENTION_TAGS.map((t) => (
        <Chip
          key={t.id}
          label={t.title}
          active={value === t.id}
          color={COLORS.ai}
          onPress={() => onChange(value === t.id ? undefined : t.id)}
        />
      ))}
    </ChipsRow>
  );
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  return (
    <ChipsRow>
      {PRIORITIES.map((p) => (
        <Chip key={p.id} label={p.title} active={value === p.id} color={p.color} onPress={() => onChange(p.id)} />
      ))}
    </ChipsRow>
  );
}

/**
 * Окно намаза. Если окна на нужную дату посчитаны — показываем их время,
 * иначе только названия (локация ещё не задана).
 */
export function NamazWindowPicker({
  value,
  onChange,
  windows,
}: {
  value?: NamazWindowName;
  onChange: (v: NamazWindowName | undefined) => void;
  windows: NamazWindow[];
}) {
  return (
    <ChipsRow>
      {NAMAZ_WINDOW_ORDER.map((name) => {
        const w = windows.find((x) => x.name === name);
        const label = w
          ? `${NAMAZ_WINDOW_TITLES[name]} · ${dayjs(w.start).format('HH:mm')}`
          : NAMAZ_WINDOW_TITLES[name];
        return <Chip key={name} label={label} active={value === name} color={COLORS.warning} onPress={() => onChange(value === name ? undefined : name)} />;
      })}
    </ChipsRow>
  );
}
