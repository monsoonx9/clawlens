"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, action?: ToastAction, duration?: number) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  warning: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-risk-low shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-risk-extreme shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-risk-moderate shrink-0" />,
  info: <Info className="w-5 h-5 text-accent shrink-0" />,
};

const variantStyles: Record<ToastType, string> = {
  success:
    "border-[color-mix(in_srgb,var(--color-risk-low),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-low),transparent_85%)]",
  error:
    "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-moderate),transparent_85%)]",
  info: "border-[color-mix(in_srgb,var(--color-accent),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent),transparent_85%)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string, action?: ToastAction, duration?: number) => {
      const id = crypto.randomUUID();
      const timeout = duration ?? 4000;
      setToasts((prev) => [...prev, { id, type, message, action, duration: timeout }]);

      if (timeout > 0) {
        const timer = setTimeout(() => removeToast(id), timeout);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, action?: ToastAction) => toast("success", message, action),
    [toast],
  );
  const error = useCallback(
    (message: string, action?: ToastAction) => toast("error", message, action),
    [toast],
  );
  const warning = useCallback(
    (message: string, action?: ToastAction) => toast("warning", message, action),
    [toast],
  );
  const info = useCallback(
    (message: string, action?: ToastAction) => toast("info", message, action),
    [toast],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast container - bottom right stacking */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[320px] pointer-events-none max-sm:left-4 max-sm:right-4 max-sm:bottom-20">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={clsx(
                "pointer-events-auto bg-glass-strong backdrop-blur-md border rounded-2xl p-4 flex items-start gap-3",

                variantStyles[t.type],
              )}
            >
              {iconMap[t.type]}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{t.message}</p>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="text-accent text-sm font-semibold mt-1.5 hover:underline"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-text-muted hover:text-text-primary transition-colors shrink-0 p-1 hover:bg-card-hover rounded-full"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
              {t.duration && t.duration > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-current opacity-30"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: t.duration / 1000, ease: "linear" }}
                  style={{ color: "var(--color-accent)" }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
