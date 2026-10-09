// Помощь (меню аватара): коротко о том, как устроено приложение.

import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '../components/themed';
import { COLORS } from '../theme/colors';

const TOPICS: { title: string; text: string }[] = [
  {
    title: 'Вкладки',
    text: 'Сегодня, Трекер, Календарь и Проекты. Переключайте их свайпом влево-вправо по экрану или тапом по значку вверху. В Календаре и на неделе Трекера свайп по датам листает дни и недели — вкладки там переключаются свайпом по верхней панели.',
  },
  {
    title: 'Сегодня',
    text: 'Сверху — сколько осталось до следующего намаза. Ниже — задачи без времени и расписание дня. «+» внизу добавляет задачу на сегодня.',
  },
  {
    title: 'Задачи',
    text: 'Нажмите на задачу, чтобы открыть её, кружок слева — чтобы отметить выполненной. Если указать время, окно намаза подставится само. Описание, приоритет, теги и повтор — под кнопкой «Ещё».',
  },
  {
    title: 'Трекер привычек',
    text: 'Каждое выполнение заполняет карточку привычки цветом. Пропуск не обнуляет путь — рядом с текущей серией всегда видна лучшая.',
  },
  {
    title: 'Расширенный режим',
    text: 'Включается в меню аватара. Добавляет разделы и Намерение в проектах, Ценность и Ожидаемый результат в задачах, фильтры и теги. Выключение только прячет поля — ничего не удаляется.',
  },
  {
    title: 'Где хранятся данные',
    text: 'Только на вашем телефоне. Время намазов считается без интернета — по городу и методу расчёта из «Настроек намаза».',
  },
];

export default function HelpScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {TOPICS.map((t) => (
        <View key={t.title} style={styles.block}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.text}>{t.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  block: { backgroundColor: COLORS.card, borderRadius: 8, padding: 14, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  text: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
});
