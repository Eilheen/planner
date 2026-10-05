import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2, X } from 'lucide-react';
import type { Category, Priority, Task } from '@/types';
import { CATEGORIES, PRIORITIES } from '@/types';
import type { NewTask } from '@/hooks/useStore';
import { addDaysISO, formatDayLong, todayISO } from '@/utils/date';
import { fmtDur } from '@/utils/plan';
import { btn, btnGhost, btnPrimary, input } from '@/ui';

interface Props {
  isNew: boolean;
  initial: Partial<Task>;
  onSave: (data: NewTask) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onClose: () => void;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];
const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400';
const pick = (on: boolean) =>
  `rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
    on
      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
  }`;

/** Форма задачи: модальное окно на компьютере, шторка снизу на телефоне */
export function TaskEditor({ isNew, initial, onSave, onDelete, onDuplicate, onClose }: Props) {
  const [text, setText] = useState(initial.text ?? '');
  const [date, setDate] = useState<string | null>(initial.date === undefined ? todayISO() : initial.date);
  const [time, setTime] = useState(initial.time ?? '');
  const [duration, setDuration] = useState<number | undefined>(initial.duration);
  const [category, setCategory] = useState<Category>(initial.category ?? 'other');
  const [priority, setPriority] = useState<Priority>(initial.priority ?? 'should');
  const [note, setNote] = useState(initial.note ?? '');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const today = todayISO();

  const save = () => {
    if (!text.trim()) {
      textRef.current?.focus();
      return;
    }
    onSave({ text: text.trim(), date, time: time || undefined, duration, category, priority, note: note.trim() || undefined });
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (isNew && window.matchMedia('(pointer: fine)').matches) textRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isNew]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Новая задача' : 'Задача'}
        className="flex max-h-[92dvh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:max-w-lg md:animate-scale-in md:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 md:hidden" />
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">{isNew ? 'Новая задача' : 'Задача'}</h2>
          <button type="button" onClick={onClose} className={btnGhost} aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-2">
          <textarea
            ref={textRef}
            id="task-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                save();
              }
            }}
            rows={2}
            placeholder="Что нужно сделать?"
            className={`${input} resize-none text-base font-medium`}
          />

          <div>
            <span className={label}>Когда</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className={pick(date === today)} onClick={() => setDate(today)}>Сегодня</button>
              <button type="button" className={pick(date === addDaysISO(today, 1))} onClick={() => setDate(addDaysISO(today, 1))}>Завтра</button>
              <button type="button" className={pick(date === null)} onClick={() => setDate(null)}>Без даты</button>
              <input
                id="task-date"
                type="date"
                value={date ?? ''}
                onChange={(e) => setDate(e.target.value || null)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Выбрать дату"
              />
            </div>
            {date && <p className="mt-1.5 text-xs text-slate-400">{formatDayLong(date)}</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
            <div>
              <span className={label}>Время</span>
              <div className="flex items-center gap-1.5">
                <input
                  id="task-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                {time && (
                  <button type="button" onClick={() => setTime('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    убрать
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className={label}>Сколько займёт</span>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" className={pick(duration === d)} onClick={() => setDuration(duration === d ? undefined : d)}>
                    {fmtDur(d)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className={label}>Категория</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    category === c.id ? c.badge : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Важность</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {PRIORITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  aria-pressed={priority === p.id}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                    priority === p.id ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">«Упростить день» оставляет только обязательные задачи.</p>
          </div>

          <div>
            <span className={label}>Заметка</span>
            <textarea id="task-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ссылки, детали, контакты…" className={`${input} resize-y`} />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3.5 dark:border-slate-800">
          {onDelete && (
            <button type="button" onClick={onDelete} className={`${btnGhost} text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20`} aria-label="Удалить задачу">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Удалить</span>
            </button>
          )}
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} className={btnGhost} aria-label="Дублировать задачу" title="Дублировать">
              <Copy className="h-4 w-4" />
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className={btn}>
              Отмена
            </button>
            <button type="button" onClick={save} disabled={!text.trim()} className={btnPrimary}>
              {isNew ? 'Добавить' : 'Сохранить'}
              <kbd className="hidden rounded bg-white/20 px-1 text-[10px] font-medium can-hover:inline">⌘↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
