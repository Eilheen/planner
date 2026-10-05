import { StickyNote } from 'lucide-react';

interface Props {
  notes: string;
  onChange: (notes: string) => void;
  weekRange: string;
}

export function NotesBlock({ notes, onChange, weekRange }: Props) {
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-900/10">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Заметки на неделю</h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">{weekRange}</span>
      </div>
      <textarea
        id="week-notes"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Цели, идеи и напоминания на эту неделю…"
        rows={4}
        className="w-full resize-y rounded-xl border border-amber-200/50 bg-white/70 px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-amber-800/40 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-amber-900/20"
      />
    </div>
  );
}
