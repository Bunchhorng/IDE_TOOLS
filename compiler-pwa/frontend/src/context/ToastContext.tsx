import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon } from '../components/ui/Icon';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const KIND_STYLES: Record<ToastKind, { icon: Parameters<typeof Icon>[0]['name']; accent: string; dot: string }> = {
  success: { icon: 'checkCircle', accent: 'text-success', dot: 'bg-success' },
  error: { icon: 'alertCircle', accent: 'text-error', dot: 'bg-error' },
  warning: { icon: 'alertTriangle', accent: 'text-warning', dot: 'bg-warning' },
  info: { icon: 'info', accent: 'text-info', dot: 'bg-info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, kind, title, message }]);
      window.setTimeout(() => remove(id), message ? 5200 : 3200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (t, m) => push('success', t, m),
      error: (t, m) => push('error', t, m),
      info: (t, m) => push('info', t, m),
      warning: (t, m) => push('warning', t, m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-28 left-1/2 z-[100] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0 lg:items-end"
      >
        {toasts.map((toast) => {
          const style = KIND_STYLES[toast.kind];
          return (
            <div
              key={toast.id}
              role="status"
              className="animate-cr-toast-in pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-edge bg-panel p-3.5 shadow-pop"
            >
              <span
                className={cn('mt-0.5 flex items-center justify-center', style.accent)}
              >
                <Icon name={style.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs leading-relaxed text-mute">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => remove(toast.id)}
                className="text-faint transition-colors hover:text-ink"
                aria-label="Dismiss"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}