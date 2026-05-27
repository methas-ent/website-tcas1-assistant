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

function themeButtonClass(active: boolean) {
  return cn(
    "grid h-8 w-8 place-items-center rounded-full transition duration-200 motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    active
      ? "bg-primary text-white shadow-sm"
      : "text-ink-muted hover:bg-primary-50 hover:text-primary-700",
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20.99 13.07A8 8 0 1 1 10.93 3.01 6 6 0 1 0 20.99 13.07Z" />
    </svg>
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
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-[60] max-w-[calc(100vw-1.5rem)] text-xs text-ink-muted lg:bottom-auto lg:right-4 lg:top-4"
      aria-label="Display preferences"
    >
      <div
        className="flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-card backdrop-blur supports-[backdrop-filter]:bg-surface/85"
        role="group"
      >
        <div
          aria-label="Language"
          className="flex items-center"
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

        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

        <div
          aria-label="Theme"
          className="flex items-center gap-1"
          role="group"
        >
          <button
            aria-label="White theme"
            aria-pressed={theme === "light"}
            className={themeButtonClass(theme === "light")}
            onClick={() => updateTheme("light")}
            title="White"
            type="button"
          >
            <SunIcon />
          </button>
          <button
            aria-label="Black theme"
            aria-pressed={theme === "dark"}
            className={themeButtonClass(theme === "dark")}
            onClick={() => updateTheme("dark")}
            title="Black"
            type="button"
          >
            <MoonIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
