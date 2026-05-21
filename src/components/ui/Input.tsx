import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-10 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-4 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, hint, error, size = "md", id, name, ...props },
    ref,
  ) => {
    const inputId = id ?? name;

    return (
      <div className="grid gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-bold text-ink-soft">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "w-full rounded-2xl border border-line bg-surface text-ink shadow-sm transition",
            "placeholder:text-ink-faint",
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
        />
        {error ? (
          <p className="text-xs font-semibold text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
