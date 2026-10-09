// Горизонтальный свайп для перелистывания периода (день / неделя / месяц): контент
// едет за пальцем, при достаточном сдвиге уезжает, а новый период въезжает с
// другой стороны. react-native-gesture-handler + Reanimated (оба есть в Expo Go).
// Приоритет жестов (docs/spec/navigation.md): внутри этой области свайп листает
// даты — жест листания вкладок ждёт, пока этот не откажется (blocksExternalGesture).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTabPagerGesture } from './nav/pagerGesture';

const START_DISTANCE = 12; // px до того, как считаем движение горизонтальным жестом
const SWIPE_RATIO = 0.22; // доля ширины, после которой листаем
const SWIPE_VELOCITY = 500; // или достаточно быстрый рывок, px/с

// Актуальные колбэки для жеста, созданного один раз (изменяемый объект, а не ref:
// читается только во время жеста).
class SwipeTargets {
  private prev: () => void = () => {};
  private next: () => void = () => {};
  update(onPrev: () => void, onNext: () => void) {
    this.prev = onPrev;
    this.next = onNext;
  }
  go(dir: number) {
    if (dir === 1) this.next();
    else this.prev();
  }
}

// Минимум DOM-API, который нужен на вебе (без зависимости от lib "dom" в tsconfig).
type WebPointer = { clientX: number; stopPropagation: () => void; preventDefault: () => void };
type WebNode = {
  addEventListener: (type: string, handler: (e: WebPointer) => void, capture: boolean) => void;
  removeEventListener: (type: string, handler: (e: WebPointer) => void, capture: boolean) => void;
};

/** Веб: onPress в react-native-web срабатывает от системного click даже после перетаскивания — гасим его. */
export function useWebDragClickGuard(hostRef: RefObject<View | null>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = hostRef.current as unknown as WebNode | null;
    if (!node?.addEventListener) return;
    let startX = 0;
    const onDown = (e: WebPointer) => {
      startX = e.clientX;
    };
    const onClick = (e: WebPointer) => {
      if (Math.abs(e.clientX - startX) > START_DISTANCE) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    node.addEventListener('mousedown', onDown, true);
    node.addEventListener('click', onClick, true);
    return () => {
      node.removeEventListener('mousedown', onDown, true);
      node.removeEventListener('click', onClick, true);
    };
  }, [hostRef]);
}

export function SwipePager({
  onPrev,
  onNext,
  children,
  style,
}: {
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const tabPager = useTabPagerGesture();
  const tx = useSharedValue(0);
  const width = useSharedValue(320);
  const [targets] = useState(() => new SwipeTargets());
  useEffect(() => {
    targets.update(onPrev, onNext);
  });

  const hostRef = useRef<View>(null);
  useWebDragClickGuard(hostRef);

  const gesture = useMemo(() => {
    const go = (dir: number) => targets.go(dir);
    const pan = Gesture.Pan()
      .activeOffsetX([-START_DISTANCE, START_DISTANCE])
      .failOffsetY([-START_DISTANCE, START_DISTANCE])
      .onUpdate((e) => {
        tx.set(e.translationX);
      })
      .onEnd((e) => {
        const w = width.get();
        const passed = Math.abs(e.translationX) > w * SWIPE_RATIO || Math.abs(e.velocityX) > SWIPE_VELOCITY;
        if (!passed || e.translationX === 0) {
          tx.set(withSpring(0, { damping: 20, stiffness: 220 }));
          return;
        }
        const dir = e.translationX < 0 ? 1 : -1; // влево — следующий период
        tx.set(
          withTiming(-dir * w, { duration: 160, easing: Easing.in(Easing.quad) }, (finished) => {
            if (!finished) return;
            scheduleOnRN(go, dir);
            // Новый период въезжает с противоположной стороны.
            tx.set(dir * w * 0.35);
            tx.set(withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
          })
        );
      });
    return tabPager ? pan.blocksExternalGesture(tabPager) : pan;
  }, [tabPager, targets, tx, width]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }] }));

  // Внешний слой неподвижен (ловит жест и обрезает края), внутренний — едет.
  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={hostRef}
        style={[styles.pager, style]}
        onLayout={(e) => {
          if (e.nativeEvent.layout.width > 0) width.set(e.nativeEvent.layout.width);
        }}
      >
        <Animated.View style={[styles.content, animated]}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Веб: без выделения текста, иначе перетаскивание мышью выделяет числа, а не листает.
  pager: { overflow: 'hidden', userSelect: 'none' },
  content: { flexGrow: 1 },
});
