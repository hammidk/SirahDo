// Общие настройки шапок экранов (Stack и Tabs) под тёмную тему Notion:
// шапка сливается с фоном, без тени и линии-разделителя.

import { COLORS } from './colors';

export const headerOptions = {
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: COLORS.background },
  headerShadowVisible: false,
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontSize: 16, fontWeight: '600' as const },
};
