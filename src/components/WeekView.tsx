import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Clock, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { CATEGORY_MAP } from '@/types';
import type { StoreApi } from '@/hooks/useStore';
import type { Parsed } from '@/utils/parse';
import { parseQuick } from '@/utils/parse';
import { DAY_NAMES_SHORT, dayIndex, fromISO, todayISO, weekDaysISO, weekStartISO, formatWeekRange } from '@/utils/date';
import { byOrder, dayStats, fmtDur, timeRange } from '@/utils/plan';
import { Checkbox, ProgressBar } from './Bits';
import { NotesBlock } from './NotesBlock';

interface Props {
  api: StoreApi;
  date: string;
  openDay: (iso: string) => void;
  openEdit: (id: string) => void;
  addParsed: (p: Parsed, fallbackDate: string | null) => void;
  undoable: (text: string, fn: () => void) => void;
}

export function WeekView({ api, date, openDay, openEdit, addParsed, undoable }: Props) {
  const { store } = api;
  const days = useMemo(() => weekDaysISO(date), [date]);
  const today = todayISO();
  const limit = store.settings.dayLimit;
  const [dragged, setDragged] = useState<Task | null>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const lists = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const d of days) m[d] = store.tasks.filter((t) => t.date === d).sort(byOrder);
    return m;
  }, [store.tasks, days]);

  // на телефоне неделя идёт списком — сразу прокручиваем к сегодняшнему дню
  useEffect(() => {
    if (window.innerWidth < 768 && todayRef.current) todayRef.current.scrollIntoView({ block: 'start' });
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // на тач-экране — долгое нажатие, чтобы не мешать прокрутке
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findDay = (taskId: string) => days.find((d) => lists[d].some((t) => t.id === taskId));

  const onDragStart = (e: DragStartEvent) => {
    setDragged(store.tasks.find((t) => t.id === String(e.active.id)) ?? null);
    if ('vibrate' in navigator) navigator.vibrate?.(10);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragged(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);
    const from = findDay(id);
    if (!from) return;
    if (overId.startsWith('day:')) {
      const to = overId.slice(4);
      if (to !== from) api.moveTask(id, to);
      return;
    }
    const to = findDay(overId);
    if (!to) return;
    const idx = lists[to].findIndex((t) => t.id === overId);
    if (to === from) {
      const fromIdx = lists[from].findIndex((t) => t.id === id);
      if (fromIdx !== idx) api.moveTask(id, to, idx);
    } else {
      api.moveTask(id, to, idx);
    }
  };

  const weekIso = weekStartISO(date);

  return (
    <div className="flex flex-col gap-5">
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragged(null)}>
        <div className="-mx-4 flex flex-col gap-3 px-4 md:flex-row md:snap-x md:snap-mandatory md:overflow-x-auto md:pb-3 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-7 xl:overflow-visible xl:px-0 xl:pb-0">
          {days.map((iso) => (
            <DayColumn
              key={iso}
              iso={iso}
              tasks={lists[iso]}
              isToday={iso === today}
              limit={limit}
              allTasks={store.tasks}
              innerRef={iso === today ? todayRef : undefined}
              onOpenDay={() => openDay(iso)}
              onOpen={openEdit}
              onToggle={(id) => api.toggleDone(id)}
              onDelete={(t) => undoable(`Удалено: ${t.text}`, () => api.deleteTask(t.id))}
              onAdd={(text) => addParsed(parseQuick(text), iso)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {dragged ? <TaskCard task={dragged} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <NotesBlock key={weekIso} notes={store.notes[weekIso] ?? ''} onChange={(v) => api.setNotes(weekIso, v)} weekRange={formatWeekRange(date)} />
    </div>
  );
}

interface ColumnProps {
  iso: string;
  tasks: Task[];
  allTasks: Task[];
  isToday: boolean;
  limit: number;
  innerRef?: React.Ref<HTMLDivElement>;
  onOpenDay: () => void;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (t: Task) => void;
  onAdd: (text: string) => void;
}

function DayColumn({ iso, tasks, allTasks, isToday, limit, innerRef, onOpenDay, onOpen, onToggle, onDelete, onAdd }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${iso}` });
  const [text, setText] = useState('');
  const idx = dayIndex(iso);
  const weekend = idx >= 5;
  const stats = useMemo(() => dayStats(allTasks, iso, limit), [allTasks, iso, limit]);

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        if (typeof innerRef === 'function') innerRef(el);
        else if (innerRef) (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={`flex scroll-mt-32 flex-col rounded-2xl border transition-all md:w-[280px] md:shrink-0 md:snap-start xl:w-auto ${
        isOver
          ? 'border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/10'
          : 'border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40'
      } ${isToday ? 'ring-2 ring-blue-400/60 dark:ring-blue-500/40' : ''}`}
    >
      <button type="button" onClick={onOpenDay} className="flex items-center justify-between rounded-t-2xl px-3 pb-2 pt-3 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40" title="Открыть день">
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : weekend ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {DAY_NAMES_SHORT[idx]}
          </span>
          <span className={`text-lg font-bold leading-none ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
            {fromISO(iso).getDate()}
          </span>
          {isToday && <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">сегодня</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {stats.over && stats.done < stats.total && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" title={`Нагрузка ${fmtDur(stats.load)}`}>
              <AlertTriangle className="h-3 w-3" />
              много
            </span>
          )}
          {stats.total > 0 && (
            <span className="text-xs font-medium tabular-nums text-slate-400 dark:text-slate-500">
              {stats.done}/{stats.total}
            </span>
          )}
        </div>
      </button>

      {stats.total > 0 && <ProgressBar pct={stats.pct} className="mx-3 mb-2 !h-1" />}

      <div className="flex min-h-[56px] flex-1 flex-col gap-2 px-3 pb-2">
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-3 text-center text-xs text-slate-300 dark:text-slate-600">Свободный день</div>
        )}
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <SortableTask key={t.id} task={t} conflict={stats.conflicts.has(t.id)} onOpen={() => onOpen(t.id)} onToggle={() => onToggle(t.id)} onDelete={() => onDelete(t)} />
          ))}
        </SortableContext>
      </div>

      <div className="flex items-center gap-2 px-3 pb-3">
        <input
          id={`add-${iso}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Новая задача…"
          enterKeyHint="done"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/30"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="Добавить задачу"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SortableTask({ task, conflict, onOpen, onToggle, onDelete }: { task: Task; conflict: boolean; onOpen: () => void; onToggle: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="touch-manipulation outline-none"
    >
      <TaskCard task={task} conflict={conflict} onToggle={onToggle} onDelete={onDelete} />
    </div>
  );
}

function TaskCard({ task, conflict, overlay, onToggle, onDelete }: { task: Task; conflict?: boolean; overlay?: boolean; onToggle?: () => void; onDelete?: () => void }) {
  const cat = CATEGORY_MAP[task.category];
  const range = timeRange(task);
  return (
    <div
      className={`group relative flex cursor-pointer items-start gap-2 rounded-xl border bg-white p-2.5 transition-all hover:shadow-md dark:bg-slate-800 ${
        overlay ? 'rotate-1 cursor-grabbing shadow-xl ring-2 ring-blue-400/50' : 'border-slate-100 hover:border-slate-200 dark:border-slate-700/50 dark:hover:border-slate-600'
      } ${task.done ? 'opacity-60' : ''} ${conflict && !task.done ? '!border-rose-300 dark:!border-rose-700' : ''}`}
    >
      <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 can-hover:block" />
      <span className="mt-0.5" onPointerDown={(e) => e.stopPropagation()}>
        <Checkbox done={task.done} onClick={() => onToggle?.()} label={task.done ? `Вернуть: ${task.text}` : `Выполнено: ${task.text}`} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${cat.dot}`} title={cat.label} />
          {range && (
            <span className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums ${conflict && !task.done ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
              <Clock className="h-3 w-3" />
              {range}
            </span>
          )}
          {task.priority === 'must' && <span className="rounded bg-slate-900 px-1 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">!</span>}
        </div>
        <p className={`mt-0.5 break-words text-sm leading-snug ${task.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>{task.text}</p>
      </div>
      {onDelete && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="hidden shrink-0 text-slate-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100 can-hover:block dark:text-slate-600"
          aria-label={`Удалить: ${task.text}`}
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
