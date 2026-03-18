"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReducedMotion, getTransition } from "@/hooks/useReducedMotion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={getTransition({ duration: 0.3, ease: "easeOut" }, prefersReduced)}
      className={className}
    >
      {children}
    </motion.div>
  );
}
