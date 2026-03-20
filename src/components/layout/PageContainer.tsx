"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageContainerProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  animate?: boolean;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const maxWidthClasses = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function PageContainer({
  children,
  title,
  subtitle,
  maxWidth = "xl",
  animate = true,
  className = "",
}: PageContainerProps) {
  const content = (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-8">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && <p className="mt-1 text-text-secondary">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );

  const widthClass = maxWidthClasses[maxWidth];

  if (!animate) {
    return <div className={`${widthClass} mx-auto w-full`}>{content}</div>;
  }

  return (
    <motion.div
      className={`${widthClass} mx-auto w-full`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {(title || subtitle) && (
        <motion.div variants={itemVariants} className="mb-8">
          {title && (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && <p className="mt-1 text-text-secondary">{subtitle}</p>}
        </motion.div>
      )}
      <motion.div variants={itemVariants}>{children}</motion.div>
    </motion.div>
  );
}
