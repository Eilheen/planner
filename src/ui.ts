/** Общие классы кнопок и карточек — один стиль на всё приложение */

export const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40';

export const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200';

export const iconBtn =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 active:scale-90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200';

export const card =
  'rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/50';

export const input =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';

export const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4';

export const sectionTitle = 'text-sm font-bold text-slate-700 dark:text-slate-200';
