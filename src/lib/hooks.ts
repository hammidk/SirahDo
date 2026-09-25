// Общие хуки.

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Текущее время, обновляется раз в intervalMs и при возврате в приложение —
 * для таймеров «до конца окна» и смены дня в полночь.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
