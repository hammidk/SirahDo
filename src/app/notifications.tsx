// Уведомления (меню аватара): состояние разрешения и как работают напоминания.
// Сами напоминания настраиваются у задачи, события и привычки.

import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/themed';
import { useAppData } from '../lib/AppDataContext';
import { ensureNotificationPermission, getNotificationStatus } from '../lib/notifications';
import type { NotificationStatus } from '../lib/notifications';
import { COLORS } from '../theme/colors';

const STATUS_TEXT: Record<NotificationStatus, string> = {
  granted: 'Разрешены — напоминания приходят.',
  undetermined: 'Ещё не разрешены.',
  denied: 'Запрещены в настройках телефона — напоминания не придут.',
  unsupported: 'В веб-версии напоминаний нет — они работают в приложении на телефоне.',
};

export default function NotificationsScreen() {
  const { resyncNotifications } = useAppData();
  const [status, setStatus] = useState<NotificationStatus | null>(null);

  useEffect(() => {
    getNotificationStatus().then(setStatus);
  }, []);

  const allow = async () => {
    if (await ensureNotificationPermission()) resyncNotifications();
    setStatus(await getNotificationStatus());
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.sectionLabel}>Разрешение</Text>
      <View style={styles.block}>
        <Text style={styles.blockText}>{status ? STATUS_TEXT[status] : 'Проверяем…'}</Text>
        {status === 'undetermined' ? (
          <Pressable style={styles.button} onPress={allow} accessibilityRole="button">
            <Text style={styles.buttonText}>Разрешить уведомления</Text>
          </Pressable>
        ) : null}
        {status === 'denied' ? (
          <Pressable style={styles.button} onPress={() => Linking.openSettings()} accessibilityRole="button">
            <Text style={styles.buttonText}>Открыть настройки телефона</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>Как работают напоминания</Text>
      <View style={styles.block}>
        <Text style={styles.blockText}>• Задача — «Напоминание» в карточке: в момент срока, за N минут или в точное время.</Text>
        <Text style={styles.blockText}>• Событие календаря — по умолчанию за 10 минут до начала.</Text>
        <Text style={styles.blockText}>• Привычка — время суток в её дни недели.</Text>
        <Text style={styles.hint}>Напоминания приходят с самого телефона, интернет для них не нужен.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6, marginTop: 18 },
  block: { backgroundColor: COLORS.card, borderRadius: 8, padding: 8 },
  blockText: { fontSize: 15, color: COLORS.text, padding: 4, lineHeight: 21 },
  hint: { fontSize: 12, color: COLORS.muted, padding: 4 },
  button: { margin: 4, marginTop: 8, backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: COLORS.onAccent, fontWeight: '600' },
});
