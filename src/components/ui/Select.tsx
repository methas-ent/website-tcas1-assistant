import { forwardRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> & {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-10 pl-3 pr-9 text-sm",
  md: "h-11 pl-4 pr-10 text-sm",
  lg: "h-12 pl-4 pr-10 text-base",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, hint, error, size = "md", id, name, children, ...props },
    ref,
  ) => {
    const selectId = id ?? name;

    return (
      <div className="grid gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-bold text-ink-soft">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={cn(
            "w-full appearance-none rounded-2xl border border-line bg-surface text-ink shadow-sm transition",
            "focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint",
            Boolean(error)
              ? "border-danger focus:border-danger focus:ring-danger/10"
              : undefined,
            sizes[size],
            className,
          )}
          aria-invalid={Boolean(error) || undefined}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-xs font-semibold text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";
