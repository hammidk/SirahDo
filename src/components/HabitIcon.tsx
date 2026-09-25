// Иконка привычки: id из набора HABIT_ICONS (lib/habits.ts) → line-иконка Lucide.
// Неизвестный id (например, из будущих данных) рисуется нейтральным кругом.

import type { ColorValue } from 'react-native';
import {
  Activity,
  BedDouble,
  BookOpen,
  Brush,
  Check,
  CigaretteOff,
  Circle,
  Coffee,
  Dumbbell,
  Flag,
  Footprints,
  GlassWater,
  Laptop,
  MoonStar,
  Music,
  NotebookPen,
  Pill,
  Salad,
  Smartphone,
  Star,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { COLORS } from '../theme/colors';

const HABIT_ICON_COMPONENTS: Record<string, LucideIcon> = {
  water: GlassWater,
  sleep: BedDouble,
  sport: Dumbbell,
  book: BookOpen,
  prayer: MoonStar,
  food: Salad,
  cardio: Activity,
  money: Wallet,
  study: Laptop,
  tea: Coffee,
  'no-smoking': CigaretteOff,
  phone: Smartphone,
  walk: Footprints,
  pills: Pill,
  cleaning: Brush,
  music: Music,
  journal: NotebookPen,
  star: Star,
  check: Check,
  dot: Circle,
  flag: Flag,
};

export function HabitIcon({ id, size = 20, color = COLORS.text }: { id: string; size?: number; color?: ColorValue }) {
  const Component = HABIT_ICON_COMPONENTS[id] ?? Circle;
  return <Component size={size} color={color as string} strokeWidth={1.75} />;
}
