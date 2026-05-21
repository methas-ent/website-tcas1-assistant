import { forwardRef } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, hint, error, id, name, rows = 4, ...props },
    ref,
  ) => {
    const textareaId = id ?? name;

    return (
      <div className="grid gap-1.5">
        {label ? (
          <label
            htmlFor={textareaId}
            className="text-sm font-bold text-ink-soft"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          rows={rows}
          className={cn(
            "w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-sm transition",
            "placeholder:text-ink-faint",
            "focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-100",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint",
            Boolean(error)
              ? "border-danger focus:border-danger focus:ring-danger/10"
              : undefined,
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

Textarea.displayName = "Textarea";
