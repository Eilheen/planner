import { useEffect, useRef, useState } from 'react';
import { Cloud, Download, Eraser, Forward, Gauge, Keyboard, Monitor, Moon, MoreHorizontal, Sun, Upload } from 'lucide-react';
import type { ThemeMode } from '@/types';
import { fmtDur } from '@/utils/plan';
import { iconBtn } from '@/ui';

interface Props {
  theme: ThemeMode;
  onTheme: (t: ThemeMode) => void;
  dayLimit: number;
  onDayLimit: (m: number) => void;
  onCarryOver: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  hasSamples: boolean;
  onClearSamples: () => void;
  onSync?: () => void;
  syncedEmail?: string;
}

const item =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60';
const head = 'px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400';
const seg = (on: boolean) =>
  `flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
    on ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white' : 'text-slate-500 dark:text-slate-400'
  }`;

const SHORTCUTS: [string, string][] = [
  ['N', 'новая задача'],
  ['/', 'быстрый ввод'],
  ['← →', 'день или неделя'],
  ['T', 'сегодня'],
  ['1 2 3', 'день, неделя, задачи'],
  ['⌘/Ctrl + ↵', 'сохранить задачу'],
];

export function Menu(p: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={iconBtn} aria-label="Меню" aria-expanded={open}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onImport(f);
          e.target.value = '';
          setOpen(false);
        }}
      />
      {open && (
        <div className="absolute right-0 top-11 z-40 max-h-[calc(100dvh-5rem)] w-[min(18rem,calc(100vw-2rem))] animate-scale-in overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <p className={head}>Тема</p>
          <div className="mx-1.5 mb-1 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/60">
            <button type="button" className={seg(p.theme === 'light')} onClick={() => p.onTheme('light')}>
              <Sun className="h-3.5 w-3.5" /> Светлая
            </button>
            <button type="button" className={seg(p.theme === 'dark')} onClick={() => p.onTheme('dark')}>
              <Moon className="h-3.5 w-3.5" /> Тёмная
            </button>
            <button type="button" className={seg(p.theme === 'system')} onClick={() => p.onTheme('system')} title="Как в системе">
              <Monitor className="h-3.5 w-3.5" /> Авто
            </button>
          </div>

          <p className={head}>
            <Gauge className="mr-1 inline h-3 w-3" />
            Лимит нагрузки на день
          </p>
          <div className="mx-1.5 mb-1 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/60">
            {[240, 360, 480, 600].map((m) => (
              <button key={m} type="button" className={seg(p.dayLimit === m)} onClick={() => p.onDayLimit(m)}>
                {fmtDur(m)}
              </button>
            ))}
          </div>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          {p.onSync && (
            <button type="button" className={item} onClick={run(p.onSync)}>
              <Cloud className="h-4 w-4 text-blue-500" />
              <span className="min-w-0">
                {p.syncedEmail ? 'Синхронизация включена' : 'Синхронизация между устройствами'}
                {p.syncedEmail && <span className="block truncate text-xs text-slate-400">{p.syncedEmail}</span>}
              </span>
            </button>
          )}
          <button type="button" className={item} onClick={run(p.onCarryOver)}>
            <Forward className="h-4 w-4 text-slate-400" />
            Перенести невыполненное на след. неделю
          </button>
          <button type="button" className={item} onClick={run(p.onExport)}>
            <Download className="h-4 w-4 text-slate-400" />
            Экспорт в JSON
          </button>
          <button type="button" className={item} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 text-slate-400" />
            Импорт из JSON
          </button>
          {p.hasSamples && (
            <button type="button" className={item} onClick={run(p.onClearSamples)}>
              <Eraser className="h-4 w-4 text-slate-400" />
              Удалить примеры задач
            </button>
          )}

          <div className="hidden can-hover:block">
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <p className={head}>
              <Keyboard className="mr-1 inline h-3 w-3" />
              Горячие клавиши
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 pb-2 text-xs">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">{k}</kbd>
                  </dt>
                  <dd className="text-slate-500 dark:text-slate-400">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
