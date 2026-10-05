import type { ReactNode } from 'react';
import { AlertTriangle, Clock, StickyNote, Timer } from 'lucide-react';
import type { Task } from '@/types';
import { CATEGORY_MAP } from '@/types';
import { dayLabel, todayISO } from '@/utils/date';
import { fmtDur, timeRange } from '@/utils/plan';
import { CategoryBadge, Checkbox, PriorityBadge } from './Bits';
import { chip } from '@/ui';

interface Props {
  task: Task;
  onToggle: () => void;
  onOpen: () => void;
  index?: number;
  showDate?: boolean;
  conflict?: boolean;
  active?: boolean;
  actions?: ReactNode;
}

/** Строка задачи для списков дня и задачника */
export function TaskRow({ task, onToggle, onOpen, index, showDate, conflict, active, actions }: Props) {
  const range = timeRange(task);
  const overdue = !task.done && task.date != null && task.date < todayISO();
  return (
    <li
      className={`group relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all ${
        active
          ? 'bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800/60'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {index != null && (
        <span className="mt-0.5 w-4 shrink-0 text-center text-xs font-bold tabular-nums text-slate-300 dark:text-slate-600">
          {index}
        </span>
      )}
      <span className="mt-0.5">
        <Checkbox done={task.done} onClick={onToggle} label={task.done ? `Вернуть: ${task.text}` : `Выполнено: ${task.text}`} />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p
          className={`break-words text-sm leading-snug ${
            task.done ? 'text-slate-400 line-through dark:text-slate-500' : 'font-medium text-slate-700 dark:text-slate-200'
          }`}
        >
          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${CATEGORY_MAP[task.category].dot}`} />
          {task.text}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          {showDate && task.date && (
            <span className={`${chip} ${overdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
              {dayLabel(task.date)}
            </span>
          )}
          {range && (
            <span className="inline-flex items-center gap-0.5 font-medium tabular-nums">
              <Clock className="h-3 w-3" />
              {range}
            </span>
          )}
          {!range && task.duration ? (
            <span className="inline-flex items-center gap-0.5 font-medium">
              <Timer className="h-3 w-3" />
              {fmtDur(task.duration)}
            </span>
          ) : null}
          <CategoryBadge id={task.category} />
          <PriorityBadge id={task.priority} />
          {conflict && !task.done && (
            <span className={`${chip} bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300`}>
              <AlertTriangle className="h-3 w-3" />
              пересечение
            </span>
          )}
          {active && <span className={`${chip} bg-blue-500 text-white`}>в работе</span>}
          {task.note && <StickyNote className="h-3 w-3" aria-label="Есть заметка" />}
        </div>
      </button>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
}
