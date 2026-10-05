export type Category = 'work' | 'study' | 'personal' | 'sport' | 'other';
export type Priority = 'must' | 'should' | 'could';
export type View = 'day' | 'week' | 'tasks';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Task {
  id: string;
  text: string;
  done: boolean;
  date: string | null; // "YYYY-MM-DD" или null — задача во «Входящих»
  time?: string; // "HH:MM"
  duration?: number; // минуты
  category: Category;
  priority: Priority;
  note?: string;
  order: number;
  createdAt: number;
  doneAt?: number;
  sample?: boolean; // пример, который можно удалить одной кнопкой
}

export interface Settings {
  dayLimit: number; // минут, после которых день считается перегруженным
}

export interface Store {
  version: 2;
  tasks: Task[];
  notes: Record<string, string>; // дата понедельника -> заметки недели
  activeId: string | null;
  activeSince: number | null;
  settings: Settings;
}

export interface CategoryMeta {
  id: Category;
  label: string;
  dot: string;
  badge: string;
  block: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'work',
    label: 'Работа',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    block: 'border-blue-300 bg-blue-50 dark:border-blue-700/70 dark:bg-blue-950/70',
  },
  {
    id: 'study',
    label: 'Учёба',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    block: 'border-amber-300 bg-amber-50 dark:border-amber-700/70 dark:bg-amber-950/60',
  },
  {
    id: 'personal',
    label: 'Личное',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    block: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/70 dark:bg-emerald-950/60',
  },
  {
    id: 'sport',
    label: 'Спорт',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    block: 'border-rose-300 bg-rose-50 dark:border-rose-700/70 dark:bg-rose-950/60',
  },
  {
    id: 'other',
    label: 'Другое',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    block: 'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800',
  },
];

export const CATEGORY_MAP = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<Category, CategoryMeta>
);

export interface PriorityMeta {
  id: Priority;
  label: string;
  badge: string;
}

export const PRIORITIES: PriorityMeta[] = [
  { id: 'must', label: 'Обязательно', badge: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
  { id: 'should', label: 'Важно', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  {
    id: 'could',
    label: 'Если успею',
    badge: 'border border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500',
  },
];

export const PRIORITY_MAP = PRIORITIES.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<Priority, PriorityMeta>
);
