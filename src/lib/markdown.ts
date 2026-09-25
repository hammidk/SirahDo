// Лёгкий markdown для описания задачи (docs/spec/tasks.md): **жирный**, _курсив_,
// [ссылка](https://…), списки «- » и «1. ». Без WebView и сторонних
// библиотек: разбор в блоки для отображения + операции панели форматирования.

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'link'; text: string; url: string };

export type Block =
  | { type: 'paragraph'; inline: InlineNode[] }
  | { type: 'bullet'; inline: InlineNode[] }
  | { type: 'numbered'; index: number; inline: InlineNode[] };

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const NUMBERED_RE = /^\s*(\d+)[.)]\s+(.*)$/;

/** Разбор строки на инлайновые узлы. Незакрытая разметка остаётся текстом. */
export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) nodes.push({ type: 'text', text: buf });
    buf = '';
  };

  while (i < src.length) {
    // [текст](url)
    if (src[i] === '[') {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(src.slice(i));
      if (m) {
        flush();
        nodes.push({ type: 'link', text: m[1], url: m[2] });
        i += m[0].length;
        continue;
      }
    }
    // **жирный**
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        nodes.push({ type: 'bold', children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    // _курсив_ или *курсив*
    if (src[i] === '_' || src[i] === '*') {
      const ch = src[i];
      const end = src.indexOf(ch, i + 1);
      // Не считаем курсивом «snake_case» внутри слова.
      const prevIsWord = i > 0 && /[0-9A-Za-zА-Яа-яЁё]/.test(src[i - 1]);
      if (end > i + 1 && !prevIsWord) {
        flush();
        nodes.push({ type: 'italic', children: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += src[i];
    i++;
  }
  flush();
  return nodes;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  for (const line of src.replace(/\r\n/g, '\n').split('\n')) {
    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      blocks.push({ type: 'bullet', inline: parseInline(bullet[1]) });
      continue;
    }
    const numbered = NUMBERED_RE.exec(line);
    if (numbered) {
      blocks.push({ type: 'numbered', index: Number(numbered[1]), inline: parseInline(numbered[2]) });
      continue;
    }
    blocks.push({ type: 'paragraph', inline: parseInline(line) });
  }
  // Пустые строки в конце не рисуем.
  while (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    if (last.type === 'paragraph' && last.inline.length === 0) blocks.pop();
    else break;
  }
  return blocks;
}

function inlineToPlain(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === 'text' ? n.text : n.type === 'link' ? n.text : inlineToPlain(n.children)))
    .join('');
}

/** Текст без разметки — для превью в списках. */
export function stripMarkdown(src: string): string {
  return parseMarkdown(src)
    .map((b) => (b.type === 'bullet' ? '• ' : b.type === 'numbered' ? `${b.index}. ` : '') + inlineToPlain(b.inline))
    .filter((line) => line.trim())
    .join(' ');
}

// ---------- Операции панели форматирования ----------

export interface Selection {
  start: number;
  end: number;
}

export type FormatKind = 'bold' | 'italic' | 'link' | 'bullet' | 'numbered';

export interface FormatResult {
  text: string;
  selection: Selection;
}

function wrap(text: string, sel: Selection, left: string, right: string, placeholder: string): FormatResult {
  const selected = text.slice(sel.start, sel.end);
  const before = text.slice(0, sel.start);
  const after = text.slice(sel.end);
  // Повторное нажатие на уже обёрнутый фрагмент снимает разметку.
  if (selected && before.endsWith(left) && after.startsWith(right)) {
    return {
      text: before.slice(0, -left.length) + selected + after.slice(right.length),
      selection: { start: sel.start - left.length, end: sel.end - left.length },
    };
  }
  const inner = selected || placeholder;
  return {
    text: before + left + inner + right + after,
    selection: { start: sel.start + left.length, end: sel.start + left.length + inner.length },
  };
}

/** Применяет форматирование к выделению; для списков — к строкам выделения. */
export function applyFormat(text: string, sel: Selection, kind: FormatKind): FormatResult {
  const start = Math.min(sel.start, sel.end);
  const end = Math.max(sel.start, sel.end);
  const s = { start, end };
  switch (kind) {
    case 'bold':
      return wrap(text, s, '**', '**', 'текст');
    case 'italic':
      return wrap(text, s, '_', '_', 'текст');
    case 'link': {
      const selected = text.slice(start, end);
      const isUrl = /^https?:\/\//.test(selected);
      const label = isUrl ? 'ссылка' : selected || 'ссылка';
      const url = isUrl ? selected : 'https://';
      const inserted = `[${label}](${url})`;
      const urlStart = start + label.length + 3;
      return {
        text: text.slice(0, start) + inserted + text.slice(end),
        // Курсор на адресе, чтобы сразу его вписать.
        selection: { start: urlStart, end: urlStart + url.length },
      };
    }
    case 'bullet':
    case 'numbered': {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const nextBreak = text.indexOf('\n', end);
      const lineEnd = nextBreak === -1 ? text.length : nextBreak;
      const lines = text.slice(lineStart, lineEnd).split('\n');
      const re = kind === 'bullet' ? BULLET_RE : NUMBERED_RE;
      const allMarked = lines.every((l) => re.test(l));
      const stripAny = (l: string) => {
        const b = BULLET_RE.exec(l);
        if (b) return b[1];
        const n = NUMBERED_RE.exec(l);
        return n ? n[2] : l;
      };
      const next = lines.map((l, idx) => {
        const content = stripAny(l);
        if (allMarked) return content; // повторное нажатие — снять список
        return kind === 'bullet' ? `- ${content}` : `${idx + 1}. ${content}`;
      });
      const replaced = next.join('\n');
      const newText = text.slice(0, lineStart) + replaced + text.slice(lineEnd);
      const cursor = lineStart + replaced.length;
      return { text: newText, selection: { start: cursor, end: cursor } };
    }
  }
}

/** Продолжение списка по Enter: «- пункт⏎» → «- пункт\n- ». Пустой пункт завершает список. */
export function continueList(prev: string, next: string): FormatResult | null {
  if (next.length !== prev.length + 1) return null;
  // Находим, где вставили один символ, и проверяем, что это перевод строки.
  let i = 0;
  while (i < prev.length && prev[i] === next[i]) i++;
  if (next[i] !== '\n') return null;
  const lineStart = prev.lastIndexOf('\n', i - 1) + 1;
  const line = prev.slice(lineStart, i);
  const bullet = /^(\s*[-*•]\s+)(.*)$/.exec(line);
  const numbered = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(line);
  if (bullet) {
    if (!bullet[2].trim()) {
      const text = prev.slice(0, lineStart) + prev.slice(i);
      return { text, selection: { start: lineStart, end: lineStart } };
    }
    const insert = `\n${bullet[1]}`;
    const text = prev.slice(0, i) + insert + prev.slice(i);
    const pos = i + insert.length;
    return { text, selection: { start: pos, end: pos } };
  }
  if (numbered) {
    if (!numbered[4].trim()) {
      const text = prev.slice(0, lineStart) + prev.slice(i);
      return { text, selection: { start: lineStart, end: lineStart } };
    }
    const insert = `\n${numbered[1]}${Number(numbered[2]) + 1}${numbered[3]}`;
    const text = prev.slice(0, i) + insert + prev.slice(i);
    const pos = i + insert.length;
    return { text, selection: { start: pos, end: pos } };
  }
  return null;
}

/**
 * Позиция курсора после правки текста — по разнице старого и нового текста
 * (конец вставленного фрагмента). Нужна там, где платформа не сообщает
 * выделение при наборе (веб).
 */
export function caretAfterEdit(prev: string, next: string): number {
  // Сначала общий префикс: при наборе в конце текста это всегда верно,
  // в неоднозначных случаях («aa» → «aaa») курсор уходит вправо.
  const max = Math.min(prev.length, next.length);
  let prefix = 0;
  while (prefix < max && prev[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  return next.length - suffix;
}
