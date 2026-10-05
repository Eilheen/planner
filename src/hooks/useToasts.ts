import { useCallback, useState } from 'react';

export interface ToastAction {
  label: string;
  fn: () => void;
}

export interface Toast {
  id: number;
  text: string;
  action?: ToastAction;
  tone: 'default' | 'error';
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (text: string, action?: ToastAction, tone: Toast['tone'] = 'default') => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts.slice(-2), { id, text, action, tone }]);
      window.setTimeout(() => dismiss(id), action ? 6000 : 3200);
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}
