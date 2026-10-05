/** Работа с датами. Неделя начинается с понедельника, даты хранятся как "YYYY-MM-DD". */

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISODate(new Date());
export const addDaysISO = (iso: string, n: number) => toISODate(addDays(fromISO(iso), n));
export const weekStartISO = (iso: string) => toISODate(startOfWeek(fromISO(iso)));
export const weekDaysISO = (iso: string) => {
  const monday = startOfWeek(fromISO(iso));
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));
};
export const dayIndex = (iso: string) => (fromISO(iso).getDay() + 6) % 7;
export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const DAY_NAMES_LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export function formatWeekRange(iso: string): string {
  const monday = startOfWeek(fromISO(iso));
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()} – ${sunday.getDate()} ${MONTHS_GEN[sunday.getMonth()]}`;
  }
  return `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS_SHORT[sunday.getMonth()]}`;
}

export function formatDayLong(iso: string): string {
  const d = fromISO(iso);
  return `${DAY_NAMES_LONG[dayIndex(iso)]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatDayShort(iso: string): string {
  const d = fromISO(iso);
  return `${DAY_NAMES_SHORT[dayIndex(iso)]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** «Сегодня», «Завтра», «Вчера» или null */
export function relativeDay(iso: string, today = todayISO()): string | null {
  const d = diffDays(iso, today);
  if (d === 0) return 'Сегодня';
  if (d === 1) return 'Завтра';
  if (d === 2) return 'Послезавтра';
  if (d === -1) return 'Вчера';
  return null;
}

export const dayLabel = (iso: string, today = todayISO()) => relativeDay(iso, today) ?? formatDayShort(iso);

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
