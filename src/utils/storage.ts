import type { Category, Store, Task, ThemeMode } from '@/types';
import { addDaysISO, todayISO, weekStartISO } from './date';

export const STORE_KEY = 'planner:v2';
const THEME_KEY = 'planner:theme';
const CATS: Category[] = ['work', 'study', 'personal', 'sport', 'other'];

export const SAMPLE_NOTE = 'Цель недели: закрыть релиз и спокойно подготовиться к контрольной.';

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyStore(): Store {
  return { version: 2, tasks: [], notes: {}, activeId: null, activeSince: null, settings: { dayLimit: 360 } };
}

function isStore(x: unknown): x is Store {
  const s = x as Store;
  return !!s && s.version === 2 && Array.isArray(s.tasks) && typeof s.notes === 'object';
}

function normalize(s: Store): Store {
  const base = emptyStore();
  return { ...base, ...s, settings: { ...base.settings, ...(s.settings ?? {}) } };
}

export function loadStore(): { store: Store; notice?: string } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch {
    return { store: seedStore() };
  }
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStore(parsed)) return { store: normalize(parsed) };
    } catch {
      /* ниже сохраняем копию */
    }
    try {
      localStorage.setItem(`${STORE_KEY}:broken`, raw);
    } catch {
      /* нет места — ничего не поделать */
    }
    return {
      store: emptyStore(),
      notice: 'Сохранённые данные повреждены. Копия отложена, начинаем с чистого листа.',
    };
  }
  const legacy = migrateLegacy();
  if (legacy) return { store: legacy, notice: 'Задачи из прошлой версии планировщика перенесены.' };
  return { store: seedStore() };
}

export function saveStore(s: Store): boolean {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/* ---------- перенос из первой версии (ключи planner:YYYY-MM-DD) ---------- */

interface LegacyTask {
  id?: string;
  text?: string;
  done?: boolean;
  time?: string;
  category?: string;
}
interface LegacyWeek {
  tasks?: Record<string, LegacyTask[]>;
  notes?: string;
}

function legacyToStore(weeks: Record<string, LegacyWeek>): Store {
  const s = emptyStore();
  for (const [key, wk] of Object.entries(weeks)) {
    const monday = key.replace('planner:', '');
    if (wk?.notes) s.notes[monday] = wk.notes;
    for (const [date, list] of Object.entries(wk?.tasks ?? {})) {
      (list ?? []).forEach((t, i) =>
        s.tasks.push({
          id: t.id || genId(),
          text: String(t.text ?? ''),
          done: !!t.done,
          date,
          time: t.time,
          category: CATS.includes(t.category as Category) ? (t.category as Category) : 'other',
          priority: 'should',
          order: i,
          createdAt: Date.now(),
        })
      );
    }
  }
  return s;
}

function migrateLegacy(): Store | null {
  try {
    const weeks: Record<string, LegacyWeek> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^planner:\d{4}-\d{2}-\d{2}$/.test(k)) {
        const v = localStorage.getItem(k);
        if (v) weeks[k] = JSON.parse(v);
      }
    }
    if (!Object.keys(weeks).length) return null;
    const s = legacyToStore(weeks);
    return s.tasks.length || Object.keys(s.notes).length ? s : null;
  } catch {
    return null;
  }
}

/* ---------- экспорт / импорт ---------- */

export function exportJSON(s: Store): string {
  return JSON.stringify({ app: 'planner', exportedAt: new Date().toISOString(), ...s }, null, 2);
}

export function parseImport(json: string): Store {
  const d = JSON.parse(json);
  if (isStore(d)) {
    return normalize({ ...d, activeId: null, activeSince: null });
  }
  if (d && typeof d.weeks === 'object') return legacyToStore(d.weeks);
  throw new Error('Неверный формат файла');
}

/* ---------- тема ---------- */

export function loadTheme(): ThemeMode {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {
    /* хранилище недоступно */
  }
  return 'system';
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* хранилище недоступно */
  }
}

export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* хранилище недоступно */
  }
}

/* ---------- примеры для первого запуска ---------- */

export function seedStore(): Store {
  const s = emptyStore();
  const T = todayISO();
  const d = (n: number) => addDaysISO(T, n);
  let order = 0;
  const add = (p: Partial<Task> & { text: string }) =>
    s.tasks.push({
      id: genId(),
      done: false,
      date: null,
      category: 'other',
      priority: 'should',
      createdAt: Date.now(),
      sample: true,
      ...p,
      order: order++,
    });

  add({ text: 'Отправить отчёт за сентябрь', date: d(-1), category: 'work', priority: 'must' });
  add({ text: 'Утренняя пробежка', date: T, time: '07:30', duration: 30, category: 'sport', done: true, doneAt: Date.now() });
  add({ text: 'Отправить правки к макету главной страницы', date: T, time: '09:00', duration: 60, category: 'work', priority: 'must' });
  add({ text: 'Созвон с командой по релизу', date: T, time: '09:30', duration: 30, category: 'work' });
  add({ text: 'Подготовить конспект по статистике', date: T, time: '11:30', duration: 60, category: 'study', priority: 'must' });
  add({ text: 'Оплатить интернет', date: T, category: 'personal', priority: 'must', duration: 10 });
  add({ text: 'Разобрать входящие письма', date: T, category: 'work', priority: 'could', duration: 30 });
  add({ text: 'Забрать продукты из пункта выдачи', date: T, time: '17:30', duration: 30, category: 'personal' });
  add({ text: 'Тренировка: спина и пресс', date: T, time: '18:30', duration: 60, category: 'sport' });
  add({ text: 'Контрольная по статистике', date: d(1), time: '10:00', duration: 90, category: 'study', priority: 'must' });
  add({ text: 'Позвонить маме', date: d(1), time: '19:00', duration: 15, category: 'personal' });
  add({ text: 'Бассейн', date: d(2), time: '08:00', duration: 60, category: 'sport' });
  add({ text: 'Сдать лабораторную по физике', date: d(4), time: '12:00', duration: 45, category: 'study', priority: 'must' });
  add({ text: 'Выбрать подарок на день рождения Ани', category: 'personal' });
  add({ text: 'Записаться к стоматологу', category: 'personal', priority: 'must' });
  add({ text: 'Прочитать статью про индексы в Postgres', category: 'study', priority: 'could' });

  s.notes[weekStartISO(T)] = SAMPLE_NOTE;
  return s;
}
