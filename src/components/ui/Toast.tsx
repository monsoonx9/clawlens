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
import { X } from "lucide-react";
import { clsx } from "clsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const variantStyles: Record<ToastType, string> = {
  success:
    "border-[color-mix(in_srgb,var(--color-risk-low),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-low),transparent_85%)]",
  error:
    "border-[color-mix(in_srgb,var(--color-risk-extreme),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)]",
  warning:
    "border-[color-mix(in_srgb,var(--color-risk-moderate),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-risk-moderate),transparent_85%)]",
  info: "border-[color-mix(in_srgb,var(--color-accent-lens),transparent_50%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent-lens),transparent_85%)]",
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
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);

      const timer = setTimeout(() => removeToast(id), 4000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-[300px] sm:min-w-[300px] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto bg-glass-strong backdrop-blur-md border rounded-full px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-8 fade-in duration-300 mx-auto",

              variantStyles[t.type],
            )}
          >
            <p className="text-text-primary text-sm font-medium flex-1 text-center truncate">
              {t.message}
            </p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-muted hover:text-text-primary transition-colors shrink-0 p-1 hover:bg-card-hover rounded-full"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
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
