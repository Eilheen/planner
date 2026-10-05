import { useEffect, useState } from 'react';

/** Текущее время, обновляется раз в `ms` (для линии «сейчас» и таймера задачи) */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
