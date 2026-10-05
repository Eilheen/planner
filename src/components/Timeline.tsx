import { AlertTriangle, Check } from 'lucide-react';
import type { Task } from '@/types';
import { CATEGORY_MAP } from '@/types';
import { effDur, fmtDur, fmtMin, freeGaps, timeRange, toMin } from '@/utils/plan';
import { useNow } from '@/hooks/useNow';

interface Props {
  tasks: Task[];
  conflicts: Set<string>;
  isToday: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onCreateAt: (time: string) => void;
}

const PX = 1.1; // пикселей на минуту

/** Шкала по часам: блоки задач, пересечения, свободные окна и линия «сейчас» */
export function Timeline({ tasks, conflicts, isToday, activeId, onOpen, onToggle, onCreateAt }: Props) {
  const now = useNow();
  const timed = tasks
    .filter((t) => toMin(t.time) != null)
    .map((t) => ({ t, s: toMin(t.time)!, e: toMin(t.time)! + Math.max(15, effDur(t)) }))
    .sort((a, b) => a.s - b.s || b.e - a.e);

  const from = Math.min(8 * 60, ...timed.map((x) => Math.floor(x.s / 60) * 60));
  const to = Math.min(24 * 60, Math.max(21 * 60, ...timed.map((x) => Math.ceil(x.e / 60) * 60)));
  const y = (m: number) => (m - from) * PX;

  // раскладка пересекающихся задач по дорожкам
  const lanes = new Map<string, { lane: number; of: number }>();
  let cluster: typeof timed = [];
  let clusterEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    for (const x of cluster) {
      let lane = ends.findIndex((e) => e <= x.s);
      if (lane < 0) {
        lane = ends.length;
        ends.push(0);
      }
      ends[lane] = x.e;
      lanes.set(x.t.id, { lane, of: 0 });
    }
    for (const x of cluster) lanes.get(x.t.id)!.of = ends.length;
    cluster = [];
  };
  for (const x of timed) {
    if (cluster.length && x.s >= clusterEnd) flush();
    cluster.push(x);
    clusterEnd = Math.max(clusterEnd, x.e);
  }
  if (cluster.length) flush();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= from && nowMin <= to;
  const gaps = freeGaps(tasks, 30);
  const hours: number[] = [];
  for (let h = from; h <= to; h += 60) hours.push(h);

  return (
    <div className="overflow-x-auto overflow-y-hidden py-2" data-noswipe>
      <div
        className="relative ml-12 min-w-[240px] cursor-copy select-none"
        style={{ height: (to - from) * PX + 8 }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const m = from + (e.clientY - rect.top) / PX;
          onCreateAt(fmtMin(Math.max(from, Math.floor(m / 30) * 30)));
        }}
        title="Нажми на пустое место, чтобы добавить задачу на это время"
      >
        {hours.map((h) => (
          <div key={h} className="absolute -left-12 right-0 border-t border-slate-200/80 dark:border-slate-800" style={{ top: y(h) }}>
            <span className="absolute -top-2 left-0 w-10 bg-transparent pr-2 text-right text-[11px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
              {fmtMin(h)}
            </span>
          </div>
        ))}

        {gaps.map(([s, e]) => (
          <div
            key={s}
            className="pointer-events-none absolute inset-x-1 flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
            style={{
              top: y(s) + 2,
              height: (e - s) * PX - 4,
              backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 9px, rgba(148,163,184,.14) 9px 10px)',
            }}
          >
            <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-900/90 dark:text-slate-400">
              свободно {fmtMin(s)}–{fmtMin(e)} · {fmtDur(e - s)}
            </span>
          </div>
        ))}

        {timed.map(({ t, s, e }) => {
          const L = lanes.get(t.id)!;
          const w = 100 / L.of;
          const conflict = conflicts.has(t.id);
          const h = (e - s) * PX - 3;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={(ev) => {
                ev.stopPropagation();
                onOpen(t.id);
              }}
              onKeyDown={(ev) => ev.key === 'Enter' && onOpen(t.id)}
              className={`absolute flex cursor-pointer gap-1.5 overflow-hidden rounded-xl border px-2 py-1 text-left transition-shadow hover:shadow-md ${
                CATEGORY_MAP[t.category].block
              } ${conflict && !t.done ? 'ring-2 ring-rose-400/80 dark:ring-rose-500/70' : ''} ${
                t.id === activeId ? 'ring-2 ring-blue-500' : ''
              } ${t.done ? 'opacity-50' : ''}`}
              style={{ top: y(s) + 1.5, height: h, left: `calc(${w * L.lane}% + 2px)`, width: `calc(${w}% - 4px)` }}
              title={t.text}
            >
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onToggle(t.id);
                }}
                aria-label={t.done ? `Вернуть: ${t.text}` : `Выполнено: ${t.text}`}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 ${
                  t.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400/70 bg-white/60 dark:border-slate-500 dark:bg-slate-900/40'
                }`}
              >
                {t.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
              </button>
              <div className="min-w-0 flex-1 leading-tight">
                <p className={`text-[13px] font-semibold text-slate-800 dark:text-slate-100 ${t.done ? 'line-through' : ''} ${h < 34 ? 'truncate' : 'break-words'}`}>
                  {t.text}
                </p>
                {h >= 34 && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {timeRange(t) ?? fmtMin(s)}
                    {conflict && !t.done && (
                      <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> пересечение
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {showNow && (
          <div className="pointer-events-none absolute -left-1.5 right-0 z-10 flex items-center" style={{ top: y(nowMin) }}>
            <span className="h-3 w-3 -translate-y-1/2 rounded-full bg-rose-500 shadow shadow-rose-500/40" />
            <span className="h-0.5 flex-1 -translate-y-1/2 bg-rose-500" />
          </div>
        )}
      </div>
    </div>
  );
}
