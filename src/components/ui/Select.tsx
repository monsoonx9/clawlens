"use client";
import { LucideIcon, ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
}

export function Select({
  value,
  onChange,
  options,
  placeholder: _placeholder = "Select an option",
  label,
  disabled = false,
  className = "",
}: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">{label}</label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 text-sm font-medium
            appearance-none cursor-pointer
            bg-card border border-card-border rounded-xl
            text-text-primary pr-10
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-card-border-hover"}
            ${className}
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-card text-text-primary">
              {option.label || option.value}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
