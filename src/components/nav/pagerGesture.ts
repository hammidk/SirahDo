// Жест листания вкладок (TabPager). Внутренние листалки дат (SwipePager) берут его из
// контекста и блокируют, пока сами обрабатывают горизонтальный свайп.

import { createContext, useContext } from 'react';
import type { GestureType } from 'react-native-gesture-handler';

export const TabPagerGestureContext = createContext<GestureType | null>(null);

export function useTabPagerGesture(): GestureType | null {
  return useContext(TabPagerGestureContext);
}
