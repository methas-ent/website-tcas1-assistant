"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type AccordionItem = {
  value: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type AccordionProps = {
  items: AccordionItem[];
  defaultValue?: string | string[];
  allowMultiple?: boolean;
  className?: string;
};

export function Accordion({
  items,
  defaultValue,
  allowMultiple,
  className,
}: AccordionProps) {
  const initialValues = Array.isArray(defaultValue)
    ? defaultValue
    : defaultValue
      ? [defaultValue]
      : [];
  const [openValues, setOpenValues] = useState<string[]>(initialValues);

  function toggle(value: string) {
    setOpenValues((currentValues) => {
      const isOpen = currentValues.includes(value);

      if (allowMultiple) {
        return isOpen
          ? currentValues.filter((currentValue) => currentValue !== value)
          : [...currentValues, value];
      }

      return isOpen ? [] : [value];
    });
  }

  return (
    <div
      className={cn(
        "divide-y divide-line rounded-2xl border border-line",
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = openValues.includes(item.value);
        const panelId = `accordion-panel-${item.value}`;

        return (
          <section
            key={item.value}
            className="bg-surface first:rounded-t-2xl last:rounded-b-2xl"
          >
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-ink transition hover:bg-surface-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-300",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
              aria-expanded={isOpen}
              aria-controls={panelId}
              disabled={item.disabled}
              onClick={() => toggle(item.value)}
            >
              <span>{item.title}</span>
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-primary-700 transition",
                  isOpen && "rotate-45",
                )}
                aria-hidden="true"
              >
                +
              </span>
            </button>
            <div
              id={panelId}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-6 text-ink-muted"
            >
              {item.content}
            </div>
          </section>
        );
      })}
    </div>
  );
}
