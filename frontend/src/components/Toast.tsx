import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const ICON_MAP = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP = {
  success: 'border-status-success/30 bg-status-success/[0.08]',
  error: 'border-status-critical/30 bg-status-critical/[0.08]',
  warning: 'border-status-warning/30 bg-status-warning/[0.08]',
  info: 'border-primary/30 bg-primary/[0.08]',
};

const ICON_COLOR = {
  success: 'text-status-success',
  error: 'text-status-critical',
  warning: 'text-status-warning',
  info: 'text-primary',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ICON_MAP[toast.type];

  useEffect(() => {
    const dur = toast.duration ?? 4000;
    const fadeTimer = setTimeout(() => setIsExiting(true), dur - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), dur);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, onDismiss]);

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl',
        'shadow-lg shadow-black/30',
        STYLE_MAP[toast.type],
        isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
      )}
    >
      <Icon className={clsx('w-5 h-5 mt-0.5 shrink-0', ICON_COLOR[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-primary">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 200); }}
        className="shrink-0 p-0.5 text-ink-ghost hover:text-ink-secondary transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5 toasts
  }, []);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    warning: (title, description) => addToast({ type: 'warning', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
