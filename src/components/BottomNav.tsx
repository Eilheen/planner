import { Plus } from 'lucide-react';
import type { View } from '@/types';
import { VIEWS } from './views';

interface Props {
  view: View;
  onView: (v: View) => void;
  onNew: () => void;
  badge: number;
}

/** Нижняя панель для телефона: разделы + большая кнопка «добавить» под большим пальцем */
export function BottomNav({ view, onView, onNew, badge }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onNew}
        aria-label="Новая задача"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 transition-transform active:scale-90 md:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90 md:hidden"
        aria-label="Разделы"
      >
        <div className="grid grid-cols-3">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              aria-current={view === id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                view === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${view === id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                <Icon className="h-5 w-5" />
              </span>
              {label}
              {id === 'tasks' && badge > 0 && (
                <span className="absolute left-1/2 top-1.5 ml-2 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
