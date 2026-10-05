import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ClipboardCheck, Search, X } from 'lucide-react';
import type { Category, Task } from '@/types';
import { CATEGORIES } from '@/types';
import type { StoreApi } from '@/hooks/useStore';
import type { Parsed } from '@/utils/parse';
import { addDaysISO, dayIndex, dayLabel, formatDayLong, todayISO } from '@/utils/date';
import { smartSort } from '@/utils/plan';
import { btn, card, input, sectionTitle } from '@/ui';
import { QuickAdd } from './QuickAdd';
import { TaskRow } from './TaskRow';

interface Props {
  api: StoreApi;
  openNew: (defaults: Partial<Task>) => void;
  openEdit: (id: string) => void;
  addParsed: (p: Parsed, fallbackDate: string | null) => void;
  undoable: (text: string, fn: () => void) => void;
}

interface Group {
  key: string;
  title: string;
  tone?: 'danger';
  tasks: Task[];
  action?: { label: string; fn: () => void };
}

/** Задачник: все задачи сразу — просроченные, без даты, сегодня, дальше */
export function TasksView({ api, openNew, openEdit, addParsed, undoable }: Props) {
  const { store } = api;
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [showDone, setShowDone] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return store.tasks.filter(
      (t) =>
        (cat === 'all' || t.category === cat) &&
        (!needle || t.text.toLowerCase().includes(needle) || (t.note ?? '').toLowerCase().includes(needle))
    );
  }, [store.tasks, q, cat]);

  const groups = useMemo(() => {
    const open = filtered.filter((t) => !t.done);
    const g: Group[] = [];
    const overdue = smartSort(open.filter((t) => t.date && t.date < today));
    if (overdue.length)
      g.push({
        key: 'overdue',
        title: 'Просрочено',
        tone: 'danger',
        tasks: overdue,
        action: { label: 'Всё на сегодня', fn: () => undoable('Перенесли на сегодня', () => api.moveMany(overdue.map((t) => t.id), today)) },
      });
    const inbox = smartSort(open.filter((t) => t.date === null));
    g.push({ key: 'inbox', title: 'Входящие · без даты', tasks: inbox });
    const todays = smartSort(open.filter((t) => t.date === today));
    if (todays.length) g.push({ key: 'today', title: `Сегодня · ${formatDayLong(today)}`, tasks: todays });
    const tom = smartSort(open.filter((t) => t.date === tomorrow));
    if (tom.length) g.push({ key: 'tomorrow', title: `Завтра · ${formatDayLong(tomorrow)}`, tasks: tom });
    const later = open.filter((t) => t.date && t.date > tomorrow).sort((a, b) => a.date!.localeCompare(b.date!));
    if (later.length) g.push({ key: 'later', title: 'Дальше', tasks: later });
    if (showDone) {
      const done = filtered.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)).slice(0, 50);
      if (done.length) g.push({ key: 'done', title: 'Выполнено', tasks: done });
    }
    return g;
  }, [filtered, today, tomorrow, showDone, api, undoable]);

  const openCount = store.tasks.filter((t) => !t.done).length;
  const nothing = groups.every((g) => g.tasks.length === 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <QuickAdd
        placeholder="Новая задача во входящие…"
        onAdd={(p) => addParsed(p, null)}
        onDetails={(p) => openNew({ text: p.text, time: p.time, duration: p.duration, category: p.category, priority: p.priority, date: p.date ?? null })}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="task-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по задачам" className={`${input} pl-9`} type="search" />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" aria-label="Очистить поиск">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <input type="checkbox" id="show-done" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4 rounded accent-blue-500" />
          Показывать выполненные
        </label>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" data-noswipe>
        <button
          type="button"
          onClick={() => setCat('all')}
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${cat === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
        >
          Все · {openCount}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              cat === c.id ? c.badge : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            {c.label}
          </button>
        ))}
      </div>

      {nothing && (
        <div className={`${card} flex flex-col items-center gap-2 px-6 py-10 text-center`}>
          <ClipboardCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">{q || cat !== 'all' ? 'Ничего не нашлось' : 'Все задачи закрыты'}</p>
          <p className="text-sm text-slate-400">{q || cat !== 'all' ? 'Попробуй другой запрос или сбрось фильтр.' : 'Добавь новую задачу в строке выше.'}</p>
        </div>
      )}

      {!nothing &&
        groups.map((g) => (
          <section key={g.key} className={`${card} p-3 sm:p-4`}>
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <h2 className={`${sectionTitle} ${g.tone === 'danger' ? '!text-rose-600 dark:!text-rose-400' : ''}`}>
                {g.title} <span className="ml-1 font-medium text-slate-400">{g.tasks.length}</span>
              </h2>
              {g.action && (
                <button type="button" className={btn} onClick={g.action.fn}>
                  {g.action.label}
                </button>
              )}
            </div>
            {g.tasks.length === 0 ? (
              <p className="px-1 py-2 text-sm text-slate-400">Пусто. Сюда попадают задачи без даты, их удобно разбирать по утрам.</p>
            ) : (
              <ul className="space-y-0.5">
                {g.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    showDate={g.key === 'overdue' || g.key === 'later' || g.key === 'done'}
                    onToggle={() => api.toggleDone(t.id)}
                    onOpen={() => openEdit(t.id)}
                    actions={!t.done ? <ScheduleMenu task={t} onPick={(d) => api.updateTask(t.id, { date: d })} onCustom={() => openEdit(t.id)} /> : undefined}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  );
}

function ScheduleMenu({ task, onPick, onCustom }: { task: Task; onPick: (d: string | null) => void; onCustom: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = todayISO();
  const nextMonday = addDaysISO(today, 7 - dayIndex(today));

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const options: [string, string | null][] = [
    ['Сегодня', today],
    ['Завтра', addDaysISO(today, 1)],
    ['Послезавтра', addDaysISO(today, 2)],
    [`Следующий пн (${dayLabel(nextMonday)})`, nextMonday],
    ['Без даты', null],
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 can-hover:opacity-0 can-hover:group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-label={`Перенести: ${task.text}`}
        aria-expanded={open}
        title="Перенести"
      >
        <CalendarClock className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 animate-scale-in rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {options
            .filter(([, d]) => d !== task.date)
            .map(([label, d]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onPick(d);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {label}
              </button>
            ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCustom();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            Другая дата…
          </button>
        </div>
      )}
    </div>
  );
}
