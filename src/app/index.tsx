// Главный экран: оболочка с верхней панелью и листаемыми вкладками
// (docs/spec/navigation.md). Экраны вкладок — в components/pages.

import { AppShell } from '../components/nav/AppShell';
import type { TabItem } from '../components/nav/TopBar';
import { TodayPage } from '../components/pages/TodayPage';
import { TrackerPage } from '../components/pages/TrackerPage';
import { CalendarPage } from '../components/pages/CalendarPage';
import { ProjectsPage } from '../components/pages/ProjectsPage';

const TABS: TabItem[] = [
  { key: 'today', title: 'Сегодня', icon: 'home' },
  { key: 'tracker', title: 'Трекер', icon: 'tracker' },
  { key: 'calendar', title: 'Календарь', icon: 'calendar' },
  { key: 'projects', title: 'Проекты', icon: 'inbox' },
];

export default function HomeScreen() {
  return <AppShell tabs={TABS} pages={[<TodayPage key="today" />, <TrackerPage key="tracker" />, <CalendarPage key="calendar" />, <ProjectsPage key="projects" />]} />;
}
