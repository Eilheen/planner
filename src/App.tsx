import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Task, View } from '@/types';
import { useStore } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { useToasts, type ToastAction } from '@/hooks/useToasts';
import type { Parsed } from '@/utils/parse';
import { addDaysISO, dayLabel, formatDayLong, formatWeekRange, plural, relativeDay, todayISO, weekDaysISO, weekStartISO } from '@/utils/date';
import { exportJSON, parseImport, readPref, writePref } from '@/utils/storage';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { BottomNav } from '@/components/BottomNav';
import { DayView } from '@/components/DayView';
import { WeekView } from '@/components/WeekView';
import { TasksView } from '@/components/TasksView';
import { TaskEditor } from '@/components/TaskEditor';
import { Toasts } from '@/components/Toasts';
import { SyncButton, SyncDialog } from '@/components/SyncDialog';
import { useSync } from '@/sync/useSync';

type EditorState = { isNew: true; initial: Partial<Task> } | { isNew: false; id: string };

const VIEW_IDS = ['day', 'week', 'tasks'] as const;

function App() {
  const { theme, setTheme } = useTheme();
  const api = useStore();
  const { store } = api;
  const { toasts, push, dismiss } = useToasts();
  const sync = useSync(api);
  const [syncOpen, setSyncOpen] = useState(false);


  const [view, setViewState] = useState<View>(() => readPref('planner:view', VIEW_IDS, 'day'));
  const [date, setDate] = useState(todayISO);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [hideSampleBanner, setHideSampleBanner] = useState(false);
  const today = todayISO();

  const setView = useCallback((v: View) => {
    setViewState(v);
    writePref('planner:view', v);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (api.notice) push(api.notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api.saveOk) push('Не получилось сохранить: хранилище браузера недоступно или переполнено. Сделай экспорт, чтобы не потерять задачи.', undefined, 'error');
  }, [api.saveOk, push]);

  /** Выполнить действие и дать возможность отменить его */
  const undoable = useCallback(
    (text: string, fn: () => void) => {
      const snap = api.snapshot();
      fn();
      push(text, { label: 'Отменить', fn: () => api.restore(snap) });
    },
    [api, push]
  );
  const toast = useCallback((text: string, action?: ToastAction) => push(text, action), [push]);

  const addParsed = useCallback(
    (p: Parsed, fallback: string | null) => {
      if (!p.text) return;
      const target = p.date ?? fallback;
      api.addTask({
        text: p.text,
        date: target,
        time: p.time,
        duration: p.duration,
        category: p.category ?? 'other',
        priority: p.priority ?? 'should',
      });
      if (target !== fallback) push(`Добавлено: ${target ? dayLabel(target) : 'во входящие'}`);
    },
    [api, push]
  );

  const openNew = useCallback(
    (defaults: Partial<Task> = {}) => setEditor({ isNew: true, initial: { date: view === 'tasks' ? null : date, ...defaults } }),
    [view, date]
  );
  const openEdit = useCallback((id: string) => setEditor({ isNew: false, id }), []);

  const shift = useCallback(
    (dir: 1 | -1) => {
      if (view === 'week') setDate((d) => addDaysISO(d, 7 * dir));
      else if (view === 'day') setDate((d) => addDaysISO(d, dir));
    },
    [view]
  );

  // горячие клавиши (по коду клавиши, поэтому работают и в русской раскладке)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editor || syncOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el instanceof Element && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      switch (e.code) {
        case 'KeyN':
          e.preventDefault();
          openNew();
          break;
        case 'Slash': {
          e.preventDefault();
          const target = document.getElementById('quick-add') ?? document.getElementById(`add-${today}`);
          target?.focus();
          break;
        }
        case 'KeyT':
          setDate(today);
          break;
        case 'ArrowLeft':
          shift(-1);
          break;
        case 'ArrowRight':
          shift(1);
          break;
        case 'Digit1':
          setView('day');
          break;
        case 'Digit2':
          setView('week');
          break;
        case 'Digit3':
          setView('tasks');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, syncOpen, openNew, shift, setView, today]);

  /* ---------- заголовок и прогресс для текущего раздела ---------- */
  const header = useMemo(() => {
    if (view === 'tasks') {
      const open = store.tasks.filter((t) => !t.done).length;
      const overdue = store.tasks.filter((t) => !t.done && t.date && t.date < today).length;
      return {
        title: 'Задачи',
        subtitle: `${open} ${plural(open, 'активная', 'активные', 'активных')}${overdue ? ` · ${overdue} просрочено` : ''}`,
        progress: null,
        showToday: false,
      };
    }
    const days = view === 'week' ? weekDaysISO(date) : [date];
    const list = store.tasks.filter((t) => t.date && days.includes(t.date));
    const done = list.filter((t) => t.done).length;
    const progress = { done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
    if (view === 'week') {
      const thisWeek = weekStartISO(date) === weekStartISO(today);
      return { title: thisWeek ? 'Эта неделя' : 'Неделя', subtitle: formatWeekRange(date), progress, showToday: !thisWeek };
    }
    return { title: relativeDay(date, today) ?? formatDayLong(date).split(',')[0], subtitle: formatDayLong(date), progress, showToday: date !== today };
  }, [view, date, store.tasks, today]);

  /* ---------- меню ---------- */
  const carryOver = () => {
    const days = weekDaysISO(date);
    const n = store.tasks.filter((t) => !t.done && t.date && days.includes(t.date)).length;
    if (!n) {
      push('На этой неделе нет невыполненных задач.');
      return;
    }
    undoable(`Перенесли ${n} ${plural(n, 'задачу', 'задачи', 'задач')} на следующую неделю`, () => api.carryOver(days));
    setDate(addDaysISO(date, 7));
  };

  const doExport = () => {
    try {
      const blob = new Blob([exportJSON(store)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planner-${today}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      push('Файл с задачами сохранён');
    } catch {
      push('Браузер не дал сохранить файл.', undefined, 'error');
    }
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseImport(String(reader.result));
        undoable(`Импортировано: ${next.tasks.length} ${plural(next.tasks.length, 'задача', 'задачи', 'задач')}`, () => api.restore(next));
      } catch {
        push('Не получилось прочитать файл. Нужен JSON, сохранённый через «Экспорт».', undefined, 'error');
      }
    };
    reader.readAsText(file);
  };

  const hasSamples = store.tasks.some((t) => t.sample);
  const overdueCount = store.tasks.filter((t) => !t.done && t.date && t.date < today).length;

  /* ---------- редактор ---------- */
  const editing = editor && !editor.isNew ? store.tasks.find((t) => t.id === editor.id) : undefined;
  useEffect(() => {
    if (editor && !editor.isNew && !editing) setEditor(null);
  }, [editor, editing]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/20">
      <Header
        view={view}
        onView={setView}
        title={header.title}
        subtitle={header.subtitle}
        onPrev={view !== 'tasks' ? () => shift(-1) : undefined}
        onNext={view !== 'tasks' ? () => shift(1) : undefined}
        onToday={view !== 'tasks' ? () => setDate(today) : undefined}
        showToday={header.showToday}
        progress={header.progress}
        onNew={() => openNew()}
        right={
          <>
          <SyncButton sync={sync} onClick={() => setSyncOpen(true)} />
          <Menu
            onSync={sync.enabled ? () => setSyncOpen(true) : undefined}
            syncedEmail={sync.user?.email}
            theme={theme}
            onTheme={setTheme}
            dayLimit={store.settings.dayLimit}
            onDayLimit={(m) => api.setSettings({ dayLimit: m })}
            onCarryOver={carryOver}
            onExport={doExport}
            onImport={doImport}
            hasSamples={hasSamples}
            onClearSamples={() => undoable('Примеры удалены', api.clearSamples)}
          />
          </>
        }
      />

      {hasSamples && !hideSampleBanner && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
          <div className="flex animate-fade-in items-center gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/70 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">Это примеры задач, чтобы было видно, как всё работает.</span>
            <button type="button" onClick={() => undoable('Примеры удалены', api.clearSamples)} className="shrink-0 rounded-lg px-2 py-1 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40">
              Удалить
            </button>
            <button type="button" onClick={() => setHideSampleBanner(true)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Скрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-4 pb-36 pt-4 sm:px-6 md:pb-12">
        {view === 'day' && (
          <DayView
            api={api}
            date={date}
            setDate={setDate}
            openNew={openNew}
            openEdit={openEdit}
            toast={toast}
            undoable={undoable}
            goTasks={() => setView('tasks')}
            addParsed={addParsed}
          />
        )}
        {view === 'week' && (
          <WeekView
            api={api}
            date={date}
            openDay={(iso) => {
              setDate(iso);
              setView('day');
            }}
            openEdit={openEdit}
            addParsed={addParsed}
            undoable={undoable}
          />
        )}
        {view === 'tasks' && <TasksView api={api} openNew={openNew} openEdit={openEdit} addParsed={addParsed} undoable={undoable} />}
      </main>

      <footer className="mx-auto hidden max-w-[1400px] px-6 pb-8 text-center text-xs text-slate-400 dark:text-slate-600 md:block">
        Данные хранятся только в этом браузере. Для переноса на другое устройство используй экспорт и импорт.
        <span className="hidden can-hover:inline"> · N — новая задача, / — быстрый ввод, ← → — листать</span>
      </footer>

      <BottomNav view={view} onView={setView} onNew={() => openNew()} badge={overdueCount} />

      {editor && (editor.isNew || editing) && (
        <TaskEditor
          key={editor.isNew ? 'new' : editor.id}
          isNew={editor.isNew}
          initial={editor.isNew ? editor.initial : editing!}
          onClose={() => setEditor(null)}
          onSave={(data) => {
            if (editor.isNew) {
              api.addTask(data);
              if (data.date !== date || view === 'tasks') push(`Добавлено: ${data.date ? dayLabel(data.date) : 'во входящие'}`);
            } else {
              api.updateTask(editor.id, data);
            }
            setEditor(null);
          }}
          onDelete={
            editing
              ? () => {
                  const t = editing;
                  setEditor(null);
                  undoable(`Удалено: ${t.text}`, () => api.deleteTask(t.id));
                }
              : undefined
          }
          onDuplicate={
            editing
              ? () => {
                  const { text, date: d, time, duration, category, priority, note } = editing;
                  api.addTask({ text, date: d, time, duration, category, priority, note });
                  setEditor(null);
                  push('Копия создана');
                }
              : undefined
          }
        />
      )}

      {syncOpen && (
        <SyncDialog
          sync={sync}
          onClose={() => setSyncOpen(false)}
          onSignedIn={() => {
            setSyncOpen(false);
            push('Готово! Задачи синхронизируются между устройствами.');
          }}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default App;
