import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Plus, SlidersHorizontal, Timer } from 'lucide-react';
import { parseQuick, type Parsed } from '@/utils/parse';
import { dayLabel } from '@/utils/date';
import { fmtDur } from '@/utils/plan';
import { CategoryBadge, PriorityBadge } from './Bits';
import { chip, input } from '@/ui';

interface Props {
  id?: string;
  placeholder: string;
  onAdd: (p: Parsed) => void;
  onDetails: (p: Parsed) => void;
}

/** Строка быстрого ввода с подсказкой, что распознано */
export function QuickAdd({ id = 'quick-add', placeholder, onAdd, onDetails }: Props) {
  const [value, setValue] = useState('');
  const parsed = useMemo(() => parseQuick(value), [value]);
  const recognized = parsed.time || parsed.duration || parsed.category || parsed.priority || parsed.date;

  const submit = () => {
    if (!parsed.text) return;
    onAdd(parsed);
    setValue('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Plus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id={id}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
            }}
            placeholder={placeholder}
            enterKeyHint="done"
            autoComplete="off"
            className={`${input} h-11 pl-9 text-[15px]`}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onDetails(parsed);
            setValue('');
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:text-slate-600 active:scale-90 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
          title="Подробнее: дата, время, категория"
          aria-label="Открыть подробную форму"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!parsed.text}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all hover:shadow-lg active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Добавить задачу"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {value && recognized ? (
        <div className="flex animate-fade-in flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          <span>Распознано:</span>
          {parsed.date && (
            <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
              <CalendarDays className="h-3 w-3" />
              {dayLabel(parsed.date)}
            </span>
          )}
          {parsed.time && (
            <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
              <Clock className="h-3 w-3" />
              {parsed.time}
            </span>
          )}
          {parsed.duration ? (
            <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
              <Timer className="h-3 w-3" />
              {fmtDur(parsed.duration)}
            </span>
          ) : null}
          {parsed.category && <CategoryBadge id={parsed.category} />}
          {parsed.priority && <PriorityBadge id={parsed.priority} />}
        </div>
      ) : (
        <p className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">
          Пиши как удобно: <span className="font-medium text-slate-500 dark:text-slate-400">«Созвон 14:00 1ч #работа !»</span>. Знак ! — обязательно, ? — если успею, «завтра», «в пт» — дата.
        </p>
      )}
    </div>
  );
}
