import type { Category, Priority } from '@/types';
import { addDaysISO, dayIndex, todayISO } from './date';

/**
 * Быстрый ввод: «Созвон 14:00 1ч #работа ! завтра»
 *  - время: 14:00, 9.30, диапазон 9:00-10:30
 *  - длительность: 30м, 45 мин, 1ч, 1.5 ч
 *  - категория: #работа #учеба #личное #спорт #другое (можно сокращать: #раб)
 *  - важность: «!» — обязательно, «?» — если успею
 *  - дата: сегодня, завтра, послезавтра, пн…вс, «в пятницу»
 */
export interface Parsed {
  text: string;
  time?: string;
  duration?: number;
  category?: Category;
  priority?: Priority;
  date?: string;
}

const CAT_ALIASES: [RegExp, Category][] = [
  [/^(раб|work)/, 'work'],
  [/^(уч|study)/, 'study'],
  [/^(лич|дом|personal)/, 'personal'],
  [/^(спорт|sport|трен)/, 'sport'],
  [/^(друг|проч|other)/, 'other'],
];

const WEEKDAYS: [RegExp, number][] = [
  [/^(пн|понедельник)$/, 0],
  [/^(вт|вторник)$/, 1],
  [/^(ср|сред[ау])$/, 2],
  [/^(чт|четверг)$/, 3],
  [/^(пт|пятниц[ау])$/, 4],
  [/^(сб|суббот[ау])$/, 5],
  [/^(вс|воскресенье)$/, 6],
];

const pad = (n: string | number) => String(n).padStart(2, '0');

export function parseQuick(input: string): Parsed {
  const out: Parsed = { text: '' };
  const today = todayISO();
  let s = ` ${input} `;

  s = s.replace(/\s#([^\s#]+)/g, (m, tag: string) => {
    const hit = CAT_ALIASES.find(([re]) => re.test(tag.toLowerCase()));
    if (!hit) return m;
    out.category = hit[1];
    return ' ';
  });

  s = s.replace(/\s!{1,3}(?=\s)/g, () => {
    out.priority = 'must';
    return ' ';
  });
  s = s.replace(/\s\?(?=\s)/g, () => {
    out.priority = 'could';
    return ' ';
  });

  s = s.replace(
    /\s(?:в\s)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s?[-–]\s?([01]?\d|2[0-3])[:.]([0-5]\d))?(?=\s)/i,
    (_m, h: string, mi: string, h2?: string, mi2?: string) => {
      out.time = `${pad(h)}:${mi}`;
      if (h2 && mi2) {
        const d = Number(h2) * 60 + Number(mi2) - (Number(h) * 60 + Number(mi));
        if (d > 0) out.duration = d;
      }
      return ' ';
    }
  );

  s = s.replace(/\s(\d+(?:[.,]\d+)?)\s?(ч|час|часа|часов|м|мин|минут|минуты)(?=\s)/i, (_m, n: string, u: string) => {
    const v = parseFloat(n.replace(',', '.'));
    out.duration = Math.round(u.toLowerCase().startsWith('ч') ? v * 60 : v);
    return ' ';
  });

  s = s.replace(/\s(сегодня|завтра|послезавтра)(?=\s)/i, (_m, w: string) => {
    const k = w.toLowerCase();
    out.date = addDaysISO(today, k === 'сегодня' ? 0 : k === 'завтра' ? 1 : 2);
    return ' ';
  });

  s = s.replace(/\s(?:во?\s)?([а-яё]+)(?=\s)/gi, (m, w: string) => {
    if (out.date) return m;
    const hit = WEEKDAYS.find(([re]) => re.test(w.toLowerCase()));
    if (!hit) return m;
    const ahead = (hit[1] - dayIndex(today) + 7) % 7;
    out.date = addDaysISO(today, ahead);
    return ' ';
  });

  out.text = s.replace(/\s+/g, ' ').trim();
  return out;
}
