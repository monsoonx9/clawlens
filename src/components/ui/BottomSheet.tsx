"use client";

import { useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const backgroundOpacity = useTransform(y, [0, 500], [0.5, 0.8]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      const threshold = 100;
      if (info.offset.y > threshold || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <motion.div
        className="absolute inset-0 bg-black pointer-events-auto"
        style={{ opacity: backgroundOpacity }}
        onClick={onClose}
      />
      <motion.div
        ref={containerRef}
        className={clsx(
          "absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl pointer-events-auto overflow-hidden",
          className,
        )}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-card-border rounded-full" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-card-border">
            <h2 className="text-text-primary font-semibold text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-card-hover rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

interface ModalBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ModalBottomSheet({ isOpen, onClose, children, className }: ModalBottomSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} className={className}>
      {children}
    </BottomSheet>
  );
}
