"use client";

import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: "default" | "compact";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div
        className={twMerge(
          clsx("flex flex-col items-center justify-center text-center p-4", className),
        )}
      >
        <div className="w-10 h-10 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-3">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-text-primary font-semibold text-sm mb-1">{title}</h3>
        {description && (
          <p className="text-text-secondary text-xs max-w-[180px] mx-auto">{description}</p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={twMerge(
        clsx("flex flex-col items-center justify-center text-center p-6", className),
      )}
    >
      <div className="w-14 h-14 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-text-primary font-semibold text-base mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-[240px] mx-auto mb-5 leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="bg-text-primary text-amoled font-bold px-5 py-2 rounded-full text-sm hover:scale-105 active:scale-95 hover:shadow-glow transition-all touch-target"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="glass text-text-primary text-sm font-semibold px-5 py-2 rounded-full hover:bg-card-hover transition-all touch-target"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </motion.div>
  );
}

interface EmptyListProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyList({ icon: Icon, title, description, className }: EmptyListProps) {
  return (
    <div
      className={twMerge(
        clsx("flex-1 flex flex-col items-center justify-center text-center p-4", className),
      )}
    >
      <div className="w-12 h-12 bg-card border border-card-border text-text-muted rounded-full flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-text-primary font-semibold mb-1 text-sm">{title}</h3>
      {description && (
        <p className="text-text-secondary text-xs max-w-[200px] mx-auto">{description}</p>
      )}
    </div>
  );
}
