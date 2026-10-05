import { Check, Clock, Pause, Play, SkipForward, Timer } from 'lucide-react';
import type { Task } from '@/types';
import { CATEGORY_MAP, PRIORITY_MAP } from '@/types';
import { fmtDur, timeRange } from '@/utils/plan';
import { useNow } from '@/hooks/useNow';

interface Props {
  task: Task;
  active: boolean;
  since: number | null;
  left: number;
  onStart: () => void;
  onPause: () => void;
  onDone: () => void;
  onSkip: () => void;
  onOpen: () => void;
}

const pill = 'inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5 text-xs font-medium backdrop-blur-sm';

/** Главная карточка дня: одно дело, с которого начать */
export function FirstStep({ task, active, since, left, onStart, onPause, onDone, onSkip, onOpen }: Props) {
  const now = useNow(15_000);
  const elapsed = active && since ? Math.max(0, Math.floor((now.getTime() - since) / 60_000)) : 0;
  const range = timeRange(task);

  return (
    <section
      aria-label="Первый шаг"
      className="relative animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 p-5 text-white shadow-xl shadow-blue-500/25 sm:p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
            {active ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                В работе · {elapsed ? fmtDur(elapsed) : 'только начато'}
              </>
            ) : (
              'Первый шаг'
            )}
          </span>
          {left > 0 && <span className="text-xs text-white/70">потом ещё {left}</span>}
        </div>

        <button type="button" onClick={onOpen} className="text-left">
          <h2 className="break-words text-xl font-bold leading-tight sm:text-2xl">{task.text}</h2>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {range && (
            <span className={pill}>
              <Clock className="h-3 w-3" />
              {range}
            </span>
          )}
          {!range && task.duration ? (
            <span className={pill}>
              <Timer className="h-3 w-3" />
              {fmtDur(task.duration)}
            </span>
          ) : null}
          <span className={pill}>{CATEGORY_MAP[task.category].label}</span>
          {task.priority !== 'should' && <span className={pill}>{PRIORITY_MAP[task.priority].label}</span>}
        </div>

        <p className="text-sm text-white/80">
          {active
            ? 'Когда закончишь, жми «Готово». Следующее дело подтянется само.'
            : 'Начни с этого. Остальное подождёт, пока это не сделано.'}
        </p>

        <div className="flex flex-wrap gap-2">
          {active ? (
            <>
              <button
                type="button"
                onClick={onDone}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-lg shadow-indigo-900/20 transition-all hover:bg-blue-50 active:scale-95"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                Готово
              </button>
              <button
                type="button"
                onClick={onPause}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/25 active:scale-95"
              >
                <Pause className="h-4 w-4" />
                Пауза
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-600 shadow-lg shadow-indigo-900/20 transition-all hover:bg-blue-50 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                Начать
              </button>
              <button
                type="button"
                onClick={onDone}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-white/25 active:scale-95"
              >
                <Check className="h-4 w-4" />
                Уже сделано
              </button>
              {left > 0 && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                >
                  <SkipForward className="h-4 w-4" />
                  Другое
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
