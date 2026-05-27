"use client";

import { cn } from "@/components/ui/cn";

type StudioStep = 1 | 2 | 3;

type StudioStepperProps = {
  currentStep: StudioStep;
  onStepClick?: (step: StudioStep) => void;
};

const steps: Array<{ value: StudioStep; label: string }> = [
  { value: 1, label: "1 รายละเอียด" },
  { value: 2, label: "2 เนื้อหา VDO" },
  { value: 3, label: "3 ตรวจสอบ + เผยแพร่" },
];

export function StudioStepper({ currentStep, onStepClick }: StudioStepperProps) {
  return (
    <ol
      aria-label="ขั้นตอนการอัปโหลด"
      className="flex flex-wrap items-center gap-2 sm:gap-3"
    >
      {steps.map((step, index) => {
        const isActive = step.value === currentStep;
        const isComplete = step.value < currentStep;
        const isClickable =
          typeof onStepClick === "function" && step.value <= currentStep;

        return (
          <li className="flex items-center gap-2 sm:gap-3" key={step.value}>
            <button
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                isActive
                  ? "border-primary bg-primary text-white shadow-sm"
                  : isComplete
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-line bg-surface text-ink-muted",
                isClickable ? "cursor-pointer" : "cursor-default",
              )}
              disabled={!isClickable}
              onClick={() => {
                if (isClickable) {
                  onStepClick?.(step.value);
                }
              }}
              type="button"
            >
              <span>{step.label}</span>
            </button>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-6 sm:w-10",
                  isComplete ? "bg-primary-300" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
