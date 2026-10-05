import { X } from 'lucide-react';
import type { Toast } from '@/hooks/useToasts';

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl ${
            t.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          }`}
        >
          <span className="min-w-0 flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.fn();
                onDismiss(t.id);
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-blue-300 hover:bg-white/10 dark:text-blue-600 dark:hover:bg-slate-100"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" onClick={() => onDismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
