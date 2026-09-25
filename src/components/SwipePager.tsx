// Горизонтальный свайп для перелистывания периода (день / неделя / месяц): контент
// едет за пальцем, при достаточном сдвиге уезжает, а новый период въезжает с
// другой стороны. Встроенные PanResponder + Animated — без нативных зависимостей,
// работает в Expo Go и на вебе (мышью). Вертикальная прокрутка внутри не мешает:
// жест забираем, только когда движение явно горизонтальное.

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

const START_DISTANCE = 12; // px до того, как считаем движение жестом
const SWIPE_RATIO = 0.22; // доля ширины, после которой листаем
const SWIPE_VELOCITY = 0.45; // или достаточно быстрый рывок

// Актуальные колбэки и ширина для обработчиков жеста, созданных один раз
// (изменяемый объект, а не ref: обработчики читают его только во время жеста).
class GestureTargets {
  width = 320;
  setWidth(w: number) {
    if (w > 0) this.width = w;
  }
  private prev: () => void = () => {};
  private next: () => void = () => {};
  update(onPrev: () => void, onNext: () => void) {
    this.prev = onPrev;
    this.next = onNext;
  }
  go(dir: 1 | -1) {
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
  const [tx] = useState(() => new Animated.Value(0));
  const [targets] = useState(() => new GestureTargets());
  useEffect(() => {
    targets.update(onPrev, onNext);
  });

  // Веб: onPress в react-native-web срабатывает от системного click, даже если
  // мышь перетаскивали. После горизонтального перетаскивания гасим этот click,
  // чтобы свайп не открывал, например, новое событие по часу под курсором.
  const hostRef = useRef<View>(null);
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
  }, []);

  const [responder] = useState(() => {
    const isHorizontal = (dx: number, dy: number) => Math.abs(dx) > START_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5;
    const settle = () =>
      Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => isHorizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_, g) => isHorizontal(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => tx.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const { width } = targets;
        const passed = Math.abs(g.dx) > width * SWIPE_RATIO || Math.abs(g.vx) > SWIPE_VELOCITY;
        if (!passed || g.dx === 0) {
          settle();
          return;
        }
        const dir: 1 | -1 = g.dx < 0 ? 1 : -1; // влево — следующий период
        Animated.timing(tx, {
          toValue: -dir * width,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          targets.go(dir);
          // Новый период въезжает с противоположной стороны.
          tx.setValue(dir * width * 0.35);
          Animated.timing(tx, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        });
      },
      onPanResponderTerminate: settle,
    });
  });

  // Внешний слой неподвижен (ловит жест и обрезает края), внутренний — едет.
  return (
    <View
      ref={hostRef}
      style={[styles.pager, style]}
      onLayout={(e) => {
        targets.setWidth(e.nativeEvent.layout.width);
      }}
      {...responder.panHandlers}
    >
      <Animated.View style={[styles.content, { transform: [{ translateX: tx }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Веб: без выделения текста, иначе перетаскивание мышью выделяет числа, а не листает.
  pager: { overflow: 'hidden', userSelect: 'none' },
  content: { flexGrow: 1 },
});
