import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Settings, Store, Task } from '@/types';
import { genId, loadStore, saveStore, SAMPLE_NOTE } from '@/utils/storage';
import { addDaysISO } from '@/utils/date';
import { byOrder, toMin } from '@/utils/plan';

export type NewTask = Partial<Omit<Task, 'id' | 'order' | 'createdAt'>> & { text: string };

const listOf = (s: Store, date: string | null, exclude?: string) =>
  s.tasks.filter((t) => t.date === date && t.id !== exclude).sort(byOrder);

/** Место новой задачи в списке дня: задачи со временем встают по времени, остальные — в конец */
function orderFor(s: Store, date: string | null, time?: string, exclude?: string): number {
  const all = listOf(s, date, exclude);
  const tm = toMin(time);
  if (tm != null) {
    const after = all.find((t) => {
      const x = toMin(t.time);
      return !t.done && x != null && x > tm;
    });
    if (after) return after.order - 0.001;
  }
  return all.length ? Math.max(...all.map((t) => t.order)) + 1 : 0;
}

/** Задача изменилась: отмечаем время, чтобы при синхронизации победила свежая версия */
const touch = (t: Task, patch: Partial<Task>): Task => ({ ...t, ...patch, updatedAt: Date.now() });

/** Удалённые задачи запоминаются, чтобы они не вернулись с другого устройства */
function tombstones(s: Store, ids: Iterable<string>): Record<string, number> {
  const now = Date.now();
  const next = { ...s.deleted };
  for (const id of ids) next[id] = now;
  return next;
}

export function useStore() {
  const [boot] = useState(loadStore);
  const [store, setStore] = useState<Store>(boot.store);
  const [saveOk, setSaveOk] = useState(true);
  const ref = useRef(store);
  ref.current = store;

  useEffect(() => {
    setSaveOk(saveStore(store));
  }, [store]);

  const addTask = useCallback((p: NewTask) => {
    const id = genId();
    const now = Date.now();
    setStore((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        {
          done: false,
          date: null,
          category: 'other',
          priority: 'should',
          ...p,
          id,
          text: p.text.trim(),
          createdAt: now,
          updatedAt: now,
          order: orderFor(s, p.date ?? null, p.time),
        },
      ],
    }));
    return id;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setStore((s) => ({
      ...s,
      activeId: patch.done && s.activeId === id ? null : s.activeId,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const n = touch(t, { ...patch, sample: false });
        if (patch.date !== undefined && patch.date !== t.date) n.order = orderFor(s, n.date, n.time, id);
        if (patch.done !== undefined) n.doneAt = patch.done ? Date.now() : undefined;
        return n;
      }),
    }));
  }, []);

  const toggleDone = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      activeId: s.activeId === id ? null : s.activeId,
      tasks: s.tasks.map((t) => (t.id === id ? touch(t, { done: !t.done, doneAt: t.done ? undefined : Date.now() }) : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      activeId: s.activeId === id ? null : s.activeId,
      tasks: s.tasks.filter((t) => t.id !== id),
      deleted: tombstones(s, [id]),
    }));
  }, []);

  const startTask = useCallback((id: string | null) => {
    setStore((s) => ({ ...s, activeId: id, activeSince: id ? Date.now() : null }));
  }, []);

  /** Перетаскивание: в другой день (или «Входящие») на нужную позицию */
  const moveTask = useCallback((id: string, toDate: string | null, toIndex?: number) => {
    setStore((s) => {
      const task = s.tasks.find((x) => x.id === id);
      if (!task) return s;
      const target = listOf(s, toDate, id);
      const idx = toIndex == null ? target.length : Math.max(0, Math.min(toIndex, target.length));
      const seq = [...target.slice(0, idx), task, ...target.slice(idx)];
      const orders = new Map(seq.map((x, i) => [x.id, i]));
      return {
        ...s,
        tasks: s.tasks.map((x) =>
          x.id === id
            ? touch(x, { date: toDate, order: orders.get(id)! })
            : orders.has(x.id) && x.order !== orders.get(x.id)
              ? touch(x, { order: orders.get(x.id)! })
              : x
        ),
      };
    });
  }, []);

  /** Перенести несколько задач на дату, в конец списка */
  const moveMany = useCallback((ids: string[], toDate: string | null) => {
    setStore((s) => {
      const set = new Set(ids);
      let next = listOf(s, toDate).reduce((m, t) => Math.max(m, t.order), -1) + 1;
      return {
        ...s,
        activeId: s.activeId && set.has(s.activeId) ? null : s.activeId,
        tasks: s.tasks.map((t) => (set.has(t.id) ? touch(t, { date: toDate, order: next++ }) : t)),
      };
    });
  }, []);

  /** Невыполненное с этих дат — на неделю вперёд */
  const carryOver = useCallback((dates: string[]) => {
    const set = new Set(dates);
    setStore((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.date && set.has(t.date) && !t.done ? touch(t, { date: addDaysISO(t.date, 7) }) : t)),
    }));
  }, []);

  const setNotes = useCallback((weekIso: string, text: string) => {
    setStore((s) => ({ ...s, notes: { ...s.notes, [weekIso]: text }, notesAt: { ...s.notesAt, [weekIso]: Date.now() } }));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setStore((s) => ({ ...s, settings: { ...s.settings, ...patch }, settingsAt: Date.now() }));
  }, []);

  const clearSamples = useCallback(() => {
    setStore((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => !t.sample),
      notes: Object.fromEntries(Object.entries(s.notes).filter(([, v]) => v !== SAMPLE_NOTE)),
      activeId: null,
      activeSince: null,
    }));
  }, []);

  /**
   * Вернуть сохранённое состояние (кнопка «Отменить»). Вернувшиеся и изменённые задачи
   * получают свежую отметку времени, иначе синхронизация снова применила бы отменённое.
   */
  const restore = useCallback((snap: Store) => {
    setStore((cur) => {
      const now = Date.now();
      const curById = new Map(cur.tasks.map((t) => [t.id, t]));
      const snapIds = new Set(snap.tasks.map((t) => t.id));
      const tasks = snap.tasks.map((t) => {
        const c = curById.get(t.id);
        return !c || JSON.stringify(c) !== JSON.stringify(t) ? { ...t, updatedAt: now } : c;
      });
      const deleted = { ...cur.deleted };
      for (const id of snapIds) delete deleted[id];
      for (const t of cur.tasks) if (!snapIds.has(t.id)) deleted[t.id] = now;
      const notesAt = { ...cur.notesAt };
      for (const k of new Set([...Object.keys(snap.notes), ...Object.keys(cur.notes)]))
        if ((snap.notes[k] ?? '') !== (cur.notes[k] ?? '')) notesAt[k] = now;
      return {
        ...snap,
        tasks,
        deleted,
        notesAt,
        settingsAt: JSON.stringify(snap.settings) !== JSON.stringify(cur.settings) ? now : cur.settingsAt,
      };
    });
  }, []);

  /** Полная замена (импорт из файла или данные из облака) */
  const replace = useCallback((s: Store | ((cur: Store) => Store)) => setStore(s), []);
  const snapshot = useCallback(() => ref.current, []);

  const actions = useMemo(
    () => ({
      addTask, updateTask, toggleDone, deleteTask, startTask, moveTask, moveMany,
      carryOver, setNotes, setSettings, clearSamples, restore, replace, snapshot,
    }),
    [addTask, updateTask, toggleDone, deleteTask, startTask, moveTask, moveMany, carryOver, setNotes, setSettings, clearSamples, restore, replace, snapshot]
  );

  return { store, saveOk, notice: boot.notice, ...actions };
}

export type StoreApi = ReturnType<typeof useStore>;
