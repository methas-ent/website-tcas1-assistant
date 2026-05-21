"use client";

import { useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type TabItem = {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  className?: string;
};

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  label,
  className,
}: TabsProps) {
  const generatedId = useId();
  const firstEnabled = useMemo(
    () => items.find((item) => !item.disabled)?.value,
    [items],
  );
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabled ?? "",
  );
  const selectedValue = value ?? internalValue;
  const selectedItem =
    items.find((item) => item.value === selectedValue && !item.disabled) ??
    items.find((item) => !item.disabled);

  function select(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex(
      (item) => item.value === selectedItem?.value,
    );

    if (currentIndex < 0) {
      return;
    }

    const lastIndex = enabledItems.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    const nextValue = enabledItems[nextIndex]?.value;
    if (nextValue) {
      select(nextValue);
    }
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 shadow-sm"
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = item.value === selectedItem?.value;
          const tabId = `${generatedId}-tab-${item.value}`;
          const panelId = `${generatedId}-panel-${item.value}`;

          return (
            <button
              key={item.value}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              disabled={item.disabled}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
                selected
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
              onClick={() => select(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {selectedItem ? (
        <div
          id={`${generatedId}-panel-${selectedItem.value}`}
          role="tabpanel"
          aria-labelledby={`${generatedId}-tab-${selectedItem.value}`}
          className="mt-5"
        >
          {selectedItem.content}
        </div>
      ) : null}
    </div>
  );
}
