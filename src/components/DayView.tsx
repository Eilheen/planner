import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck, Clock, Inbox, List, PartyPopper, Wand2 } from 'lucide-react';
import type { Task } from '@/types';
import type { StoreApi } from '@/hooks/useStore';
import type { ToastAction } from '@/hooks/useToasts';
import type { Parsed } from '@/utils/parse';
import { addDaysISO, dayIndex, DAY_NAMES_SHORT, fromISO, plural, todayISO, weekDaysISO } from '@/utils/date';
import { dayStats, fmtDur, fmtMin, smartSort } from '@/utils/plan';
import { readPref, writePref } from '@/utils/storage';
import { btn, btnPrimary, card, sectionTitle } from '@/ui';
import { FirstStep } from './FirstStep';
import { QuickAdd } from './QuickAdd';
import { TaskRow } from './TaskRow';
import { Timeline } from './Timeline';
import { ProgressBar } from './Bits';

interface Props {
  api: StoreApi;
  date: string;
  setDate: (iso: string) => void;
  openNew: (defaults: Partial<Task>) => void;
  openEdit: (id: string) => void;
  toast: (text: string, action?: ToastAction) => void;
  undoable: (text: string, fn: () => void) => void;
  goTasks: () => void;
  addParsed: (p: Parsed, fallbackDate: string | null) => void;
}

type Mode = 'list' | 'hours';

export function DayView({ api, date, setDate, openNew, openEdit, toast, undoable, goTasks, addParsed }: Props) {
  const { store } = api;
  const limit = store.settings.dayLimit;
  const today = todayISO();
  const isToday = date === today;
  const [mode, setModeState] = useState<Mode>(() => readPref('planner:dayMode', ['list', 'hours'] as const, 'list'));
  const setMode = (m: Mode) => {
    setModeState(m);
    writePref('planner:dayMode', m);
  };
  const [skip, setSkip] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const stats = useMemo(() => dayStats(store.tasks, date, limit), [store.tasks, date, limit]);
  const queue = useMemo(() => smartSort(stats.list.filter((t) => !t.done)), [stats.list]);
  const doneList = stats.list.filter((t) => t.done);
  const active = queue.find((t) => t.id === store.activeId);
  const first = active ?? queue[skip % Math.max(1, queue.length)];
  const rest = queue.filter((t) => t !== first);
  const top = rest.slice(0, 2);
  const others = rest.slice(2);
  const overdue = isToday ? store.tasks.filter((t) => !t.done && t.date != null && t.date < today) : [];
  const inbox = store.tasks.filter((t) => t.date === null && !t.done).slice(0, 3);
  const week = weekDaysISO(date);

  const finish = (id: string) => {
    api.toggleDone(id);
    setSkip(0);
    const next = queue.find((t) => t.id !== id);
    toast(next ? `Готово! Дальше: ${next.text}` : 'Готово! На этот день всё.');
  };

  const simplify = () => {
    const move = queue.filter((t) => t.priority !== 'must');
    if (!move.length) {
      toast('Тут уже только обязательные дела. Перенеси что-то вручную или поменяй важность.');
      return;
    }
    const tomorrow = addDaysISO(date, 1);
    undoable(
      `Перенесли на завтра ${move.length} ${plural(move.length, 'задачу', 'задачи', 'задач')}. Остались обязательные.`,
      () => api.moveMany(move.map((t) => t.id), tomorrow)
    );
  };

  // свайп влево/вправо на телефоне — соседний день
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-noswipe],input,textarea')) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) setDate(addDaysISO(date, dx < 0 ? 1 : -1));
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* основная колонка */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* полоска дней недели */}
        <div className="grid grid-cols-7 gap-1.5" data-noswipe>
          {week.map((iso) => {
            const s = dayStats(store.tasks, iso, limit);
            const sel = iso === date;
            const tdy = iso === today;
            const left = s.total - s.done;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setDate(iso);
                  setSkip(0);
                }}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition-all active:scale-95 ${
                  sel
                    ? 'border-transparent bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : `bg-white/70 hover:border-slate-300 dark:bg-slate-900/50 ${tdy ? 'border-blue-300 dark:border-blue-700' : 'border-slate-200/70 dark:border-slate-800'}`
                }`}
                aria-label={`${DAY_NAMES_SHORT[dayIndex(iso)]} ${fromISO(iso).getDate()}, задач: ${left}`}
                aria-pressed={sel}
              >
                <span className={`text-[11px] font-semibold ${sel ? 'text-white/80' : dayIndex(iso) >= 5 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'}`}>
                  {DAY_NAMES_SHORT[dayIndex(iso)]}
                </span>
                <span className={`text-lg font-bold leading-none ${sel ? '' : tdy ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                  {fromISO(iso).getDate()}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {s.total === 0 ? (
                    <span className={`h-1 w-1 rounded-full ${sel ? 'bg-white/40' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  ) : s.over && left ? (
                    <span className={`h-1.5 w-4 rounded-full ${sel ? 'bg-amber-300' : 'bg-amber-400'}`} />
                  ) : left === 0 ? (
                    <span className={`h-1.5 w-4 rounded-full ${sel ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                  ) : (
                    Array.from({ length: Math.min(4, left) }, (_, i) => (
                      <span key={i} className={`h-1 w-1 rounded-full ${sel ? 'bg-white' : 'bg-blue-500'}`} />
                    ))
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <QuickAdd
          placeholder={isToday ? 'Что нужно сделать сегодня?' : 'Добавить задачу на этот день'}
          onAdd={(p) => addParsed(p, date)}
          onDetails={(p) => openNew({ text: p.text, time: p.time, duration: p.duration, category: p.category, priority: p.priority, date: p.date ?? date })}
        />

        {/* первый шаг */}
        {first ? (
          <FirstStep
            key={first.id}
            task={first}
            active={first.id === store.activeId}
            since={store.activeSince}
            left={rest.length}
            onStart={() => api.startTask(first.id)}
            onPause={() => api.startTask(null)}
            onDone={() => finish(first.id)}
            onSkip={() => setSkip((s) => s + 1)}
            onOpen={() => openEdit(first.id)}
          />
        ) : stats.total > 0 ? (
          <section className="flex animate-slide-up flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 px-6 py-8 text-center text-white shadow-xl shadow-emerald-500/25">
            <PartyPopper className="h-8 w-8" />
            <h2 className="text-xl font-bold">Всё сделано!</h2>
            <p className="text-sm text-white/85">
              {stats.done} {plural(stats.done, 'задача закрыта', 'задачи закрыты', 'задач закрыто')}. Можно отдохнуть со спокойной совестью.
            </p>
          </section>
        ) : (
          <section className={`${card} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-900/30">
              <CalendarCheck className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">На этот день задач нет</h2>
            <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Добавь первую задачу в строке выше{inbox.length ? ' или возьми что-нибудь из входящих' : ''}.
            </p>
            {inbox.length > 0 && (
              <ul className="mt-2 w-full max-w-md space-y-1.5 text-left">
                {inbox.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <Inbox className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 break-words text-slate-700 dark:text-slate-200">{t.text}</span>
                    <button type="button" className={btn} onClick={() => api.moveTask(t.id, date)}>
                      Взять
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* перегруз */}
        {stats.over && queue.length > 0 && (
          <div className="flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-900/15">
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <b className="text-amber-700 dark:text-amber-400">День перегружен.</b>{' '}
                {stats.conflicts.size > 0 &&
                  `${stats.conflicts.size} ${plural(stats.conflicts.size, 'задача пересекается', 'задачи пересекаются', 'задач пересекаются')} по времени. `}
                {stats.load > limit && `Запланировано ${fmtDur(stats.load)} при лимите ${fmtDur(limit)}. `}
                Можно оставить только обязательное.
              </p>
            </div>
            <button
              type="button"
              onClick={simplify}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition-all hover:bg-amber-600 active:scale-95"
            >
              <Wand2 className="h-4 w-4" />
              Упростить день
            </button>
          </div>
        )}

        {/* просроченное */}
        {overdue.length > 0 && (
          <div className="flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <p className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <b>{overdue.length}</b> {plural(overdue.length, 'задача осталась', 'задачи остались', 'задач осталось')} с прошлых дней
              </span>
            </p>
            <div className="flex gap-2">
              <button type="button" className={btn} onClick={goTasks}>
                Посмотреть
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => undoable('Перенесли на сегодня', () => api.moveMany(overdue.map((t) => t.id), today))}
              >
                На сегодня
              </button>
            </div>
          </div>
        )}

        {/* план: список или по часам */}
        {stats.total > 0 && (
          <section className={`${card} p-3 sm:p-4`}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className={sectionTitle}>{mode === 'list' ? 'План на день' : 'По часам'}</h2>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Вид плана">
                {([['list', 'Главное', List], ['hours', 'По часам', Clock]] as const).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      mode === m ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'list' ? (
              <>
                {top.length > 0 && (
                  <>
                    <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Следом за первым шагом</p>
                    <ol className="space-y-0.5">
                      {top.map((t, i) => (
                        <TaskRow key={t.id} task={t} index={i + 2} conflict={stats.conflicts.has(t.id)} onToggle={() => finish(t.id)} onOpen={() => openEdit(t.id)} />
                      ))}
                    </ol>
                  </>
                )}
                {others.length > 0 && (
                  <>
                    <p className="px-1 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Остальное</p>
                    <ul className="space-y-0.5">
                      {others.map((t) => (
                        <TaskRow key={t.id} task={t} conflict={stats.conflicts.has(t.id)} onToggle={() => finish(t.id)} onOpen={() => openEdit(t.id)} />
                      ))}
                    </ul>
                  </>
                )}
                {queue.length === 1 && (
                  <p className="px-1 py-3 text-sm text-slate-400">Кроме первого шага, на сегодня ничего. Красота.</p>
                )}
              </>
            ) : (
              <>
                <Timeline
                  tasks={stats.list}
                  conflicts={stats.conflicts}
                  isToday={isToday}
                  activeId={store.activeId}
                  onOpen={openEdit}
                  onToggle={(id) => api.toggleDone(id)}
                  onCreateAt={(time) => openNew({ date, time, duration: 60 })}
                />
                {queue.some((t) => !t.time) && (
                  <>
                    <p className="px-1 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Без времени</p>
                    <ul className="space-y-0.5">
                      {queue
                        .filter((t) => !t.time)
                        .map((t) => (
                          <TaskRow key={t.id} task={t} onToggle={() => finish(t.id)} onOpen={() => openEdit(t.id)} />
                        ))}
                    </ul>
                  </>
                )}
              </>
            )}

            {doneList.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                <button type="button" onClick={() => setShowDone((v) => !v)} className="flex w-full items-center justify-between px-1 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <span>Сделано · {doneList.length}</span>
                  <ArrowRight className={`h-3.5 w-3.5 transition-transform ${showDone ? 'rotate-90' : ''}`} />
                </button>
                {showDone && (
                  <ul className="animate-fade-in space-y-0.5">
                    {doneList.map((t) => (
                      <TaskRow key={t.id} task={t} onToggle={() => api.toggleDone(t.id)} onOpen={() => openEdit(t.id)} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* боковая панель: сводка дня */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <section className={`${card} space-y-4 p-4`}>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Прогресс</span>
              <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                {stats.done}/{stats.total}
              </span>
            </div>
            <ProgressBar pct={stats.pct} />
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Нагрузка</span>
              <span className={`text-sm font-bold tabular-nums ${stats.load > limit ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {fmtDur(stats.load)} <span className="font-medium text-slate-400">из {fmtDur(limit)}</span>
              </span>
            </div>
            <ProgressBar pct={(stats.load / limit) * 100} tone={stats.load > limit ? 'warn' : 'default'} />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Свободные окна</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {stats.gaps.length ? (
                stats.gaps.map(([s, e]) => (
                  <span key={s} className="rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {fmtMin(s)}–{fmtMin(e)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Между делами окон нет</span>
              )}
            </div>
          </div>
        </section>
        {!isToday && (
          <button type="button" className={btn} onClick={() => setDate(today)}>
            <CalendarCheck className="h-4 w-4" />
            Вернуться к сегодня
          </button>
        )}
      </aside>
    </div>
  );
}
