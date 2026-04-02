"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  onRetry,
  onHome,
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center text-center p-6 bg-card border border-card-border rounded-2xl",
          className,
        ),
      )}
    >
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_80%)] rounded-full animate-pulse" />
        <div className="relative w-full h-full bg-card border border-card-border rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-risk-extreme" />
        </div>
      </div>

      <h3 className="text-text-primary font-semibold text-base mb-2">{title}</h3>
      <p className="text-text-secondary text-sm max-w-[280px] mx-auto mb-6 leading-relaxed">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 bg-text-primary text-amoled font-bold px-5 py-2.5 rounded-full text-sm hover:scale-105 active:scale-95 hover:shadow-glow transition-all touch-target"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 glass text-text-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-card-hover transition-all touch-target"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({ message = "Failed to load", onRetry, className }: ErrorCardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex items-center justify-between p-3 bg-card border border-card-border rounded-xl",
          className,
        ),
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_85%)] rounded-full flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-risk-extreme" />
        </div>
        <div>
          <p className="text-text-primary text-sm font-medium">{message}</p>
          {onRetry && (
            <button onClick={onRetry} className="text-accent text-xs font-medium hover:underline">
              Try again
            </button>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="p-2 hover:bg-card-hover rounded-lg transition-colors touch-target"
          aria-label="Retry"
        >
          <RefreshCw className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  );
}
