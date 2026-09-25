// Встроенный список городов для ручного выбора местоположения (docs/spec/prayer-profile.md) —
// работает офлайн и без разрешения на геолокацию. Для остальных городов
// Профиль пробует системный геокодер (expo-location geocodeAsync).

export interface City {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const CITIES: City[] = [
  { name: 'Москва', country: 'Россия', latitude: 55.7558, longitude: 37.6173 },
  { name: 'Санкт-Петербург', country: 'Россия', latitude: 59.9343, longitude: 30.3351 },
  { name: 'Казань', country: 'Россия', latitude: 55.7961, longitude: 49.1064 },
  { name: 'Уфа', country: 'Россия', latitude: 54.7388, longitude: 55.9721 },
  { name: 'Грозный', country: 'Россия', latitude: 43.3178, longitude: 45.6949 },
  { name: 'Махачкала', country: 'Россия', latitude: 42.9849, longitude: 47.5047 },
  { name: 'Дербент', country: 'Россия', latitude: 42.0678, longitude: 48.2899 },
  { name: 'Нальчик', country: 'Россия', latitude: 43.4853, longitude: 43.6071 },
  { name: 'Черкесск', country: 'Россия', latitude: 44.2269, longitude: 42.0467 },
  { name: 'Владикавказ', country: 'Россия', latitude: 43.0205, longitude: 44.6819 },
  { name: 'Назрань', country: 'Россия', latitude: 43.2257, longitude: 44.7645 },
  { name: 'Нижний Новгород', country: 'Россия', latitude: 56.2965, longitude: 43.9361 },
  { name: 'Екатеринбург', country: 'Россия', latitude: 56.8389, longitude: 60.6057 },
  { name: 'Новосибирск', country: 'Россия', latitude: 55.0084, longitude: 82.9357 },
  { name: 'Самара', country: 'Россия', latitude: 53.1959, longitude: 50.1002 },
  { name: 'Ростов-на-Дону', country: 'Россия', latitude: 47.2357, longitude: 39.7015 },
  { name: 'Краснодар', country: 'Россия', latitude: 45.0355, longitude: 38.9753 },
  { name: 'Астрахань', country: 'Россия', latitude: 46.3479, longitude: 48.0336 },
  { name: 'Оренбург', country: 'Россия', latitude: 51.7682, longitude: 55.0969 },
  { name: 'Челябинск', country: 'Россия', latitude: 55.1644, longitude: 61.4368 },
  { name: 'Тюмень', country: 'Россия', latitude: 57.1522, longitude: 65.5272 },
  { name: 'Калининград', country: 'Россия', latitude: 54.7104, longitude: 20.4522 },
  { name: 'Минск', country: 'Беларусь', latitude: 53.9006, longitude: 27.559 },
  { name: 'Баку', country: 'Азербайджан', latitude: 40.4093, longitude: 49.8671 },
  { name: 'Тбилиси', country: 'Грузия', latitude: 41.7151, longitude: 44.8271 },
  { name: 'Ташкент', country: 'Узбекистан', latitude: 41.2995, longitude: 69.2401 },
  { name: 'Самарканд', country: 'Узбекистан', latitude: 39.6542, longitude: 66.9597 },
  { name: 'Бухара', country: 'Узбекистан', latitude: 39.7747, longitude: 64.4286 },
  { name: 'Алматы', country: 'Казахстан', latitude: 43.222, longitude: 76.8512 },
  { name: 'Астана', country: 'Казахстан', latitude: 51.1694, longitude: 71.4491 },
  { name: 'Шымкент', country: 'Казахстан', latitude: 42.3417, longitude: 69.5901 },
  { name: 'Бишкек', country: 'Кыргызстан', latitude: 42.8746, longitude: 74.5698 },
  { name: 'Ош', country: 'Кыргызстан', latitude: 40.5283, longitude: 72.7985 },
  { name: 'Душанбе', country: 'Таджикистан', latitude: 38.5598, longitude: 68.787 },
  { name: 'Ашхабад', country: 'Туркменистан', latitude: 37.9601, longitude: 58.3261 },
  { name: 'Стамбул', country: 'Турция', latitude: 41.0082, longitude: 28.9784 },
  { name: 'Анкара', country: 'Турция', latitude: 39.9334, longitude: 32.8597 },
  { name: 'Мекка', country: 'Саудовская Аравия', latitude: 21.3891, longitude: 39.8579 },
  { name: 'Медина', country: 'Саудовская Аравия', latitude: 24.5247, longitude: 39.5692 },
  { name: 'Эр-Рияд', country: 'Саудовская Аравия', latitude: 24.7136, longitude: 46.6753 },
  { name: 'Дубай', country: 'ОАЭ', latitude: 25.2048, longitude: 55.2708 },
  { name: 'Абу-Даби', country: 'ОАЭ', latitude: 24.4539, longitude: 54.3773 },
  { name: 'Доха', country: 'Катар', latitude: 25.2854, longitude: 51.531 },
  { name: 'Каир', country: 'Египет', latitude: 30.0444, longitude: 31.2357 },
  { name: 'Амман', country: 'Иордания', latitude: 31.9454, longitude: 35.9284 },
  { name: 'Куала-Лумпур', country: 'Малайзия', latitude: 3.139, longitude: 101.6869 },
  { name: 'Джакарта', country: 'Индонезия', latitude: -6.2088, longitude: 106.8456 },
  { name: 'Лондон', country: 'Великобритания', latitude: 51.5072, longitude: -0.1276 },
  { name: 'Берлин', country: 'Германия', latitude: 52.52, longitude: 13.405 },
  { name: 'Париж', country: 'Франция', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Вена', country: 'Австрия', latitude: 48.2082, longitude: 16.3738 },
  { name: 'Нью-Йорк', country: 'США', latitude: 40.7128, longitude: -74.006 },
  { name: 'Торонто', country: 'Канада', latitude: 43.6532, longitude: -79.3832 },
];

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase().replace(/ё/g, 'е');
  if (!q) return [];
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
  const starts = CITIES.filter((c) => norm(c.name).startsWith(q));
  const contains = CITIES.filter((c) => !norm(c.name).startsWith(q) && (norm(c.name).includes(q) || norm(c.country).includes(q)));
  return [...starts, ...contains].slice(0, limit);
}
