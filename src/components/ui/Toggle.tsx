import { clsx } from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  color?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  color = "var(--color-risk-moderate)",
}: ToggleProps) {
  return (
    <div className={clsx("flex items-start gap-3", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent),transparent_50%)] shadow-inner"
        style={{
          backgroundColor: checked
            ? color
            : "color-mix(in srgb, var(--color-text-muted), transparent 90%)",
          boxShadow: checked
            ? `0 0 12px color-mix(in srgb, ${color}, transparent 80%)`
            : "inset 0 1px 3px color-mix(in srgb, var(--color-bg), var(--color-text-primary) 30%)",
        }}
      >
        <span
          className={clsx(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-amoled shadow-[0_1px_3px_color-mix(in_srgb,var(--color-bg),var(--color-text-primary) 30%)] transform transition-transform duration-300 ease-in-out mt-0.5",
            checked
              ? "bg-accent shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent),transparent_70%)] border-[color-mix(in_srgb,var(--color-accent),transparent_80%)]"
              : "bg-card border-card-border",
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-text-primary text-sm font-medium leading-tight">{label}</span>
          )}
          {description && (
            <span className="text-text-muted text-xs mt-0.5 leading-relaxed">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
