import type { Settings, Store, Task } from '@/types';
import { SAMPLE_NOTE } from '@/utils/storage';

/** То, что лежит в облаке: задачи, заметки, настройки и список удалённого */
export interface SyncDoc {
  v: 1;
  tasks: Task[];
  notes: Record<string, string>;
  notesAt: Record<string, number>;
  settings: Settings;
  settingsAt: number;
  deleted: Record<string, number>;
}

const TOMBSTONE_TTL = 60 * 24 * 3600 * 1000; // удалённое помним 60 дней

const stamp = (t: Task) => t.updatedAt ?? t.createdAt ?? 0;

function prune(deleted: Record<string, number>): Record<string, number> {
  const min = Date.now() - TOMBSTONE_TTL;
  return Object.fromEntries(Object.entries(deleted).filter(([, at]) => at >= min));
}

/** Документ для облака из локального состояния. Примеры задач не синхронизируются */
export function toDoc(s: Store): SyncDoc {
  return {
    v: 1,
    tasks: s.tasks.filter((t) => !t.sample).sort((a, b) => a.id.localeCompare(b.id)),
    notes: Object.fromEntries(Object.entries(s.notes).filter(([, v]) => v !== SAMPLE_NOTE)),
    notesAt: s.notesAt ?? {},
    settings: s.settings,
    settingsAt: s.settingsAt ?? 0,
    deleted: prune(s.deleted ?? {}),
  };
}

/** Слияние двух версий: по каждой задаче побеждает более свежая, удаление — если оно новее правки */
export function mergeDocs(a: SyncDoc, b: SyncDoc): SyncDoc {
  const deleted: Record<string, number> = { ...a.deleted };
  for (const [id, at] of Object.entries(b.deleted ?? {})) deleted[id] = Math.max(deleted[id] ?? 0, at);

  const byId = new Map<string, Task>();
  for (const t of [...a.tasks, ...(b.tasks ?? [])]) {
    const cur = byId.get(t.id);
    if (!cur || stamp(t) > stamp(cur)) byId.set(t.id, t);
  }
  const tasks = [...byId.values()]
    .filter((t) => !(deleted[t.id] != null && deleted[t.id] >= stamp(t)))
    .sort((x, y) => x.id.localeCompare(y.id));

  const notes: Record<string, string> = {};
  const notesAt: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.notes), ...Object.keys(b.notes ?? {})])) {
    const aAt = a.notesAt[k] ?? 0;
    const bAt = b.notesAt?.[k] ?? 0;
    const useB = bAt > aAt || !(k in a.notes);
    const text = useB ? b.notes[k] : a.notes[k];
    if (text != null) notes[k] = text;
    notesAt[k] = Math.max(aAt, bAt);
  }

  const useBSettings = (b.settingsAt ?? 0) > a.settingsAt;
  return {
    v: 1,
    tasks,
    notes,
    notesAt,
    settings: useBSettings ? { ...a.settings, ...b.settings } : a.settings,
    settingsAt: Math.max(a.settingsAt, b.settingsAt ?? 0),
    deleted: prune(deleted),
  };
}

/** Применить документ из облака к локальному состоянию */
export function applyDoc(s: Store, d: SyncDoc): Store {
  const keepSamples = d.tasks.length === 0;
  const tasks = [...d.tasks, ...(keepSamples ? s.tasks.filter((t) => t.sample) : [])];
  return {
    ...s,
    tasks,
    notes: d.notes,
    notesAt: d.notesAt,
    settings: d.settings,
    settingsAt: d.settingsAt,
    deleted: d.deleted,
    activeId: s.activeId && tasks.some((t) => t.id === s.activeId) ? s.activeId : null,
  };
}

/** Строка для сравнения версий: ключи отсортированы, потому что база меняет их порядок */
export function docKey(x: unknown): string {
  return JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v
  );
}
