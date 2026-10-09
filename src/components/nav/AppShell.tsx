// Оболочка приложения (docs/spec/navigation.md): верхняя панель (аватар + 4 таблетки)
// и горизонтальный пейджер вкладок Сегодня / Трекер / Календарь / Проекты.
// Вкладки листаются свайпом по экрану (контент идёт за пальцем, таблетки
// анимируются синхронно) и тапом по таблетке. На краях — упругий отскок.
//
// Пейджер — свой, на react-native-gesture-handler + Reanimated, а не
// react-native-pager-view: у pager-view нет веба, а внутренние листалки дат
// (SwipePager) должны блокировать жест вкладок через blocksExternalGesture —
// это возможно, только если оба жеста живут в gesture-handler (docs/DECISIONS.md, D28).

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../theme/colors';
import { useAppData } from '../../lib/AppDataContext';
import { useWebDragClickGuard } from '../SwipePager';
import { TabPagerGestureContext } from './pagerGesture';
import { TopBar } from './TopBar';
import type { TabItem } from './TopBar';
import { AvatarMenu } from './AvatarMenu';

const ACTIVATE_DISTANCE = 15;
const EDGE_RESISTANCE = 0.3; // «резина» за краем первой и последней вкладки
const FLING_VELOCITY = 500; // px/с — быстрый рывок листает даже при малом сдвиге

export function AppShell({ tabs, pages }: { tabs: TabItem[]; pages: ReactNode[] }) {
  const insets = useSafeAreaInsets();
  const { settings } = useAppData();
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageWidth, setPageWidth] = useState(() => Dimensions.get('window').width);
  const count = pages.length;

  const width = useSharedValue(pageWidth);
  const offset = useSharedValue(0); // сдвиг ленты страниц: −index × ширина
  const start = useSharedValue(0);
  const progress = useDerivedValue(() => -offset.get() / Math.max(1, width.get()));

  const hostRef = useRef<View>(null);
  useWebDragClickGuard(hostRef);

  const goTo = (i: number) => {
    setIndex(i);
    offset.set(withTiming(-i * width.get(), { duration: 250, easing: Easing.out(Easing.cubic) }));
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ACTIVATE_DISTANCE, ACTIVATE_DISTANCE])
        .failOffsetY([-12, 12]) // вертикальная прокрутка страниц важнее
        .onStart(() => {
          start.set(offset.get());
        })
        .onUpdate((e) => {
          const min = -(count - 1) * width.get();
          let x = start.get() + e.translationX;
          if (x > 0) x *= EDGE_RESISTANCE;
          else if (x < min) x = min + (x - min) * EDGE_RESISTANCE;
          offset.set(x);
        })
        .onEnd((e) => {
          const w = width.get();
          const current = -offset.get() / w;
          let target = Math.round(current);
          if (Math.abs(e.velocityX) > FLING_VELOCITY) target = e.velocityX < 0 ? Math.ceil(current) : Math.floor(current);
          target = Math.max(0, Math.min(count - 1, target));
          offset.set(withSpring(-target * w, { damping: 24, stiffness: 220, mass: 0.9 }));
          scheduleOnRN(setIndex, target);
        }),
    [count, offset, start, width]
  );

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const initial = settings.userName?.trim().charAt(0).toUpperCase() || undefined;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TabPagerGestureContext.Provider value={pan}>
        <GestureDetector gesture={pan}>
          <View ref={hostRef} style={styles.flex}>
            <TopBar
              tabs={tabs}
              index={index}
              progress={progress}
              initial={initial}
              onSelect={goTo}
              onAvatar={() => setMenuOpen(true)}
            />
            <View
              style={styles.viewport}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - pageWidth) > 0.5) {
                  setPageWidth(w);
                  width.set(w);
                  offset.set(-index * w);
                }
              }}
            >
              <Animated.View style={[styles.strip, { width: pageWidth * count }, stripStyle]}>
                {pages.map((page, i) => (
                  <View
                    key={tabs[i].key}
                    style={{ width: pageWidth }}
                    // Скрытые страницы не читаются экранным диктором.
                    accessibilityElementsHidden={i !== index}
                    importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
                  >
                    {page}
                  </View>
                ))}
              </Animated.View>
            </View>
          </View>
        </GestureDetector>
      </TabPagerGestureContext.Provider>
      <AvatarMenu visible={menuOpen} top={insets.top + 56} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1, userSelect: 'none' },
  viewport: { flex: 1, overflow: 'hidden' },
  strip: { flex: 1, flexDirection: 'row' },
});
