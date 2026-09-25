// Единая тема приложения — Notion Dark. Все цвета берутся отсюда; хексы в
// компонентах не хардкодим. Тёмная тема — единственная (светлую не делаем).
// Правило Notion: никакого чистого чёрного и чистого белого, никаких теней —
// глубина создаётся только фоном: bgPrimary → bgSecondary → bgElevated.

export const palette = {
  bgPrimary: '#191919', // фон приложения
  bgSecondary: '#202020', // карточки, панели, модалки, поля ввода
  bgHover: '#2A2A2A', // нажатие/выбор, фон чипов
  bgElevated: '#252525', // всплывающие меню, поповеры, плашки
  border: '#2F2F2F', // тонкие разделители и обводки
  borderSubtle: 'rgba(255,255,255,0.055)',

  textPrimary: '#E8E6E3', // основной текст (не чистый белый)
  textSecondary: '#9B9B9B', // описания, даты, счётчики
  textTertiary: '#6F6F6F', // плейсхолдеры, неактивные подписи
  textDisabled: '#4D4D4D',

  accentBlue: '#529CCA', // ссылки, активные элементы
  accentGreen: '#4DAB9A', // выполнено
  accentRed: '#E06C75', // ошибки, удаление, просрочка
  accentYellow: '#C9A227', // предупреждения, акценты намаза
  accentPurple: '#9A6DD7', // теги, ИИ-заглушки
} as const;

/** Хекс #RRGGBB → rgba с заданной прозрачностью. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Цвет текста/значка поверх заливки цветом категории: тёмный, а на тёмных тонах (коричневый) — светлый. */
export function readableOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return palette.bgPrimary;
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.35 ? palette.textPrimary : palette.bgPrimary;
}

/** Фон «тега» в стиле Notion: цвет категории на 15% прозрачности. */
export const tagBackground = (color: string) => withAlpha(color, 0.15);

/**
 * Семантические имена, которыми пользуются компоненты. Старые ключи
 * (background, card, text, muted …) сохранены, чтобы экраны читали тему
 * единообразно.
 */
export const COLORS = {
  ...palette,
  background: palette.bgPrimary,
  card: palette.bgSecondary,
  hover: palette.bgHover,
  elevated: palette.bgElevated,
  text: palette.textPrimary,
  muted: palette.textSecondary,
  tertiary: palette.textTertiary,
  disabled: palette.textDisabled,
  separator: palette.border,
  subtle: palette.borderSubtle,
  primary: palette.accentBlue,
  success: palette.accentGreen,
  danger: palette.accentRed,
  warning: palette.accentYellow,
  ai: palette.accentPurple,
  aiBackground: withAlpha(palette.accentPurple, 0.12),
  /** Текст/значок поверх светлой или акцентной заливки. */
  onAccent: palette.bgPrimary,
  /** Затемнение под модальными листами. */
  overlay: 'rgba(12,12,12,0.72)',
} as const;

/** Радиусы Notion: 6–8 px везде, кроме кругов. */
export const RADIUS = { sm: 6, md: 8 } as const;

/** Палитра для календарей, тегов и цвета событий — приглушённые тона Notion. */
export const CATEGORY_COLORS = [
  palette.accentBlue,
  palette.accentGreen,
  palette.accentYellow,
  palette.accentRed,
  palette.accentPurple,
  '#D9730D', // оранжевый Notion
  '#64473A', // коричневый Notion
  palette.textSecondary, // серый
] as const;
