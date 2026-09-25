// Иконки — тонкие line-иконки Lucide (ближе всего к Notion), монохромные.
// Имена — семантические (исторически совпадают с прежним набором), чтобы экраны
// не зависели от конкретной библиотеки.

import type { ColorValue } from 'react-native';
import {
  Archive,
  BookOpen,
  Calendar,
  CalendarDays,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleArrowRight,
  CircleCheck,
  CirclePlus,
  CircleX,
  Clock,
  Ellipsis,
  Eye,
  Flag,
  Folder,
  FolderOpen,
  Funnel,
  History,
  Inbox,
  LayoutGrid,
  Link,
  List,
  MapPin,
  Maximize2,
  Menu,
  Minus,
  Plus,
  Repeat,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Tag,
  Timer,
  Trash2,
  X,
  Bell,
  Hash,
  ListChecks,
  Moon,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { COLORS } from '../theme/colors';

const ICONS = {
  // навигация
  today: Sun,
  calendar: Calendar,
  'calendar-day': CalendarDays,
  tracker: CircleCheck,
  overview: LayoutGrid,
  settings: Settings,
  menu: Menu,
  // стрелки
  'chevron-back': ChevronLeft,
  'chevron-forward': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'arrow-circle': CircleArrowRight,
  // действия
  add: Plus,
  'add-circle': CirclePlus,
  remove: Minus,
  close: X,
  'close-circle': CircleX,
  check: Check,
  edit: SquarePen,
  trash: Trash2,
  more: Ellipsis,
  options: SlidersHorizontal,
  expand: Maximize2,
  eye: Eye,
  link: Link,
  archive: Archive,
  search: Search,
  // сущности
  inbox: Inbox,
  diary: BookOpen,
  history: History,
  folder: Folder,
  'folder-open': FolderOpen,
  filter: Funnel,
  tag: Tag,
  hash: Hash,
  star: Star,
  flag: Flag,
  bell: Bell,
  clock: Clock,
  timer: Timer,
  repeat: Repeat,
  location: MapPin,
  sparkles: Sparkles,
  stats: ChartColumn,
  list: List,
  checklist: ListChecks,
  grid: LayoutGrid,
  circle: Circle,
  moon: Moon,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = COLORS.muted,
  filled = false,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  /** Заливка (например, звезда «в избранном»). */
  filled?: boolean;
  strokeWidth?: number;
}) {
  const Component = ICONS[name];
  return <Component size={size} color={color as string} fill={filled ? (color as string) : 'none'} strokeWidth={strokeWidth} />;
}
