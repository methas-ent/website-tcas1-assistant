type ProgressBarProps = {
  value: number;
  label?: string;
  valueLabel?: string;
  showValue?: boolean;
  className?: string;
  barClassName?: string;
};

export function ProgressBar({
  value,
  label,
  valueLabel,
  showValue = true,
  className,
  barClassName,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-muted">
        <span>{label ?? "ความคืบหน้า"}</span>
        {showValue ? <span>{valueLabel ?? `${percent}% Completed`}</span> : null}
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={[
            "h-full rounded-full bg-primary transition-all duration-500 ease-out",
            barClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
