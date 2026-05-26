"use client";

import { cn } from "@/components/ui/cn";
import type { AdminLanguage, AdminTheme } from "@/lib/admin-translations";
import {
  announceAdminPreferences,
  applyAdminPreferences,
  useAdminPreferences,
} from "@/components/admin/useAdminPreferences";

function segmentedButtonClass(active: boolean) {
  return cn(
    "h-8 rounded-full px-3 text-xs font-black transition duration-200 motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    active
      ? "bg-primary text-white shadow-sm"
      : "text-ink-muted hover:bg-primary-50 hover:text-primary-700",
  );
}

export function AdminPreferenceControls() {
  const { language, theme } = useAdminPreferences();

  function updateLanguage(nextLanguage: AdminLanguage) {
    applyAdminPreferences(nextLanguage, theme);
    announceAdminPreferences({ language: nextLanguage, theme });
  }

  function updateTheme(nextTheme: AdminTheme) {
    applyAdminPreferences(language, nextTheme);
    announceAdminPreferences({ language, theme: nextTheme });
  }

  return (
    <div
      className="fixed right-3 top-3 z-[60] grid justify-items-end gap-2 text-xs text-ink-muted sm:right-4 sm:top-4"
      aria-label="Display preferences"
    >
      <div
        aria-label="Language"
        className="flex rounded-full border border-line bg-surface/95 p-1 shadow-card backdrop-blur"
        role="group"
      >
        <button
          aria-pressed={language === "th"}
          className={segmentedButtonClass(language === "th")}
          onClick={() => updateLanguage("th")}
          type="button"
        >
          TH
        </button>
        <button
          aria-pressed={language === "en"}
          className={segmentedButtonClass(language === "en")}
          onClick={() => updateLanguage("en")}
          type="button"
        >
          ENG
        </button>
      </div>

      <div
        aria-label="Theme"
        className="flex rounded-full border border-line bg-surface/95 p-1 shadow-card backdrop-blur"
        role="group"
      >
        <button
          aria-pressed={theme === "light"}
          className={segmentedButtonClass(theme === "light")}
          onClick={() => updateTheme("light")}
          type="button"
        >
          White
        </button>
        <button
          aria-pressed={theme === "dark"}
          className={segmentedButtonClass(theme === "dark")}
          onClick={() => updateTheme("dark")}
          type="button"
        >
          Black
        </button>
      </div>
    </div>
  );
}
