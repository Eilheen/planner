import type { Task } from '@/types';

export function toMin(t?: string): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const fmtMin = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function fmtDur(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} мин`;
  return r ? `${h} ч ${r} мин` : `${h} ч`;
}

/** Длительность для расчёта нагрузки: своя, либо 30 минут для задачи со временем */
export const effDur = (t: Task) => t.duration ?? (t.time ? 30 : 0);

export function timeRange(t: Task): string | null {
  const s = toMin(t.time);
  if (s == null) return null;
  return t.duration ? `${fmtMin(s)}–${fmtMin(s + t.duration)}` : fmtMin(s);
}

const PR_RANK = { must: 0, should: 1, could: 2 } as const;

export const byOrder = (a: Task, b: Task) => Number(a.done) - Number(b.done) || a.order - b.order;

/** Порядок «что делать сначала»: обязательное, потом важное, внутри — по времени */
export function smartSort(list: Task[]): Task[] {
  return [...list].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      PR_RANK[a.priority] - PR_RANK[b.priority] ||
      (toMin(a.time) ?? 9999) - (toMin(b.time) ?? 9999) ||
      a.order - b.order
  );
}

function intervals(list: Task[]) {
  return list
    .filter((t) => !t.done && toMin(t.time) != null)
    .map((t) => {
      const s = toMin(t.time)!;
      return { id: t.id, s, e: s + effDur(t) };
    });
}

export function conflictIds(list: Task[]): Set<string> {
  const iv = intervals(list);
  const ids = new Set<string>();
  for (let i = 0; i < iv.length; i++)
    for (let j = i + 1; j < iv.length; j++)
      if (iv[i].s < iv[j].e && iv[j].s < iv[i].e) {
        ids.add(iv[i].id);
        ids.add(iv[j].id);
      }
  return ids;
}

export const loadOf = (list: Task[]) => list.filter((t) => !t.done).reduce((a, t) => a + effDur(t), 0);

export function freeGaps(list: Task[], min = 15): [number, number][] {
  const iv = intervals(list).sort((a, b) => a.s - b.s);
  const merged: [number, number][] = [];
  for (const { s, e } of iv) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const out: [number, number][] = [];
  for (let i = 1; i < merged.length; i++) {
    if (merged[i][0] - merged[i - 1][1] >= min) out.push([merged[i - 1][1], merged[i][0]]);
  }
  return out;
}

export interface DayStats {
  list: Task[];
  done: number;
  total: number;
  pct: number;
  load: number;
  conflicts: Set<string>;
  over: boolean;
  gaps: [number, number][];
}

export function dayStats(tasks: Task[], iso: string, limit: number): DayStats {
  const list = tasks.filter((t) => t.date === iso);
  const done = list.filter((t) => t.done).length;
  const load = loadOf(list);
  const conflicts = conflictIds(list);
  return {
    list,
    done,
    total: list.length,
    pct: list.length ? Math.round((done / list.length) * 100) : 0,
    load,
    conflicts,
    over: load > limit || conflicts.size > 0,
    gaps: freeGaps(list),
  };
}
