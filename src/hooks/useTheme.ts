import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '@/types';
import { loadTheme, saveTheme } from '@/utils/storage';

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, []);

  return { theme, setTheme, cycle };
}
