import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/components/ui/cn";

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-faint focus:border-primary-300 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted";

type FieldShellProps = {
  children: React.ReactNode;
  description?: string;
  error?: string;
  label?: string;
};

export function FieldShell({
  children,
  description,
  error,
  label,
}: FieldShellProps) {
  return (
    <label className="block space-y-2">
      {label ? (
        <span className="text-sm font-bold text-ink">{label}</span>
      ) : null}
      {children}
      {description ? (
        <span className="block text-xs leading-5 text-ink-muted">
          {description}
        </span>
      ) : null}
      {error ? (
        <span className="block text-xs font-semibold text-danger">{error}</span>
      ) : null}
    </label>
  );
}

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-bold text-ink", className)}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, "pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClass, "min-h-28 resize-y leading-6", className)}
      {...props}
    />
  );
}
