import { Check } from 'lucide-react';
import type { Category, Priority } from '@/types';
import { CATEGORY_MAP, PRIORITY_MAP } from '@/types';
import { chip } from '@/ui';

export function Checkbox({ done, onClick, label, size = 'md' }: { done: boolean; onClick: () => void; label: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-4 w-4 rounded-md' : 'h-5 w-5 rounded-lg';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={done}
      // увеличенная зона нажатия для пальца, сам квадратик остаётся маленьким
      className="-m-2 flex shrink-0 items-center justify-center p-2"
    >
      <span
        className={`flex ${box} items-center justify-center border-2 transition-all ${
          done
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-slate-300 hover:border-emerald-400 dark:border-slate-600'
        }`}
      >
        {done && <Check className={size === 'sm' ? 'h-2.5 w-2.5 text-white' : 'h-3 w-3 text-white'} strokeWidth={3.5} />}
      </span>
    </button>
  );
}

export function CategoryBadge({ id }: { id: Category }) {
  const c = CATEGORY_MAP[id];
  return (
    <span className={`${chip} ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function PriorityBadge({ id }: { id: Priority }) {
  if (id === 'should') return null;
  const p = PRIORITY_MAP[id];
  return <span className={`${chip} ${p.badge}`}>{p.label}</span>;
}

export function ProgressBar({ pct, tone = 'default', className = '' }: { pct: number; tone?: 'default' | 'warn'; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          tone === 'warn' ? 'bg-gradient-to-r from-amber-400 to-rose-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
        }`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
