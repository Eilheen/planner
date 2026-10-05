import type { ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { View } from '@/types';
import { btn, btnPrimary, iconBtn } from '@/ui';
import { ProgressBar } from './Bits';
import { VIEWS } from './views';

interface Props {
  view: View;
  onView: (v: View) => void;
  title: string;
  subtitle: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  showToday: boolean;
  progress: { done: number; total: number; pct: number } | null;
  onNew: () => void;
  right: ReactNode;
}


export function Header({ view, onView, title, subtitle, onPrev, onNext, onToday, showToday, progress, onNew, right }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 xl:flex-none">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 xl:w-64">
            <h1 className="truncate text-base font-bold leading-tight text-slate-800 dark:text-white sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          </div>
        </div>

        <nav className="hidden shrink-0 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 md:flex" aria-label="Разделы">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              aria-current={view === id ? 'page' : undefined}
              title={label}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                view === id ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 xl:ml-auto">
          {onPrev && (
            <button type="button" onClick={onPrev} className={iconBtn} aria-label="Назад" title="Назад (←)">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {onToday && showToday && (
            <button type="button" onClick={onToday} className="hidden rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-700 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:block" title="Сегодня (T)">
              Сегодня
            </button>
          )}
          {onNext && (
            <button type="button" onClick={onNext} className={iconBtn} aria-label="Вперёд" title="Вперёд (→)">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {progress && progress.total > 0 && (
            <div className="ml-2 hidden items-center gap-2.5 xl:flex" title="Выполнено">
              <span className="text-sm font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {progress.done}/{progress.total}
              </span>
              <ProgressBar pct={progress.pct} className="!h-2 w-24 xl:w-32" />
              <span className="w-9 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">{progress.pct}%</span>
            </div>
          )}

          <button type="button" onClick={onNew} className={`${btnPrimary} ml-1 hidden md:inline-flex`} title="Новая задача (N)">
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Задача</span>
          </button>
          {right}
        </div>
      </div>
      {onToday && showToday && (
        <div className="px-4 pb-2 sm:hidden">
          <button type="button" onClick={onToday} className={`${btn} w-full !py-1.5 text-xs`}>
            Вернуться к сегодня
          </button>
        </div>
      )}
    </header>
  );
}
