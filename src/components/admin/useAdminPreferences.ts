"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_LANGUAGE_STORAGE_KEY,
  ADMIN_PREFERENCES_EVENT,
  ADMIN_THEME_STORAGE_KEY,
  type AdminLanguage,
  type AdminTheme,
} from "@/lib/admin-translations";

type AdminPreferenceDetail = {
  language?: AdminLanguage;
  theme?: AdminTheme;
};

function isAdminLanguage(value: string | null): value is AdminLanguage {
  return value === "th" || value === "en";
}

function isAdminTheme(value: string | null): value is AdminTheme {
  return value === "light" || value === "dark";
}

function readLanguage() {
  if (typeof window === "undefined") {
    return "th";
  }

  const stored = window.localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY);
  return isAdminLanguage(stored) ? stored : "th";
}

function readTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  return isAdminTheme(stored) ? stored : "light";
}

export function applyAdminPreferences(
  language: AdminLanguage,
  theme: AdminTheme,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language);
  window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  document.documentElement.lang = language;
  document.documentElement.dataset.adminLanguage = language;
  document.documentElement.dataset.adminTheme = theme;
  document.body.dataset.adminLanguage = language;
  document.body.dataset.adminTheme = theme;

  document.querySelectorAll<HTMLElement>("[data-admin-shell]").forEach((node) => {
    node.dataset.adminLanguage = language;
    node.dataset.adminTheme = theme;
  });
}

export function announceAdminPreferences(
  detail: Required<AdminPreferenceDetail>,
) {
  window.dispatchEvent(
    new CustomEvent<Required<AdminPreferenceDetail>>(ADMIN_PREFERENCES_EVENT, {
      detail,
    }),
  );
}

export function useAdminPreferences() {
  const [language, setLanguage] = useState<AdminLanguage>("th");
  const [theme, setTheme] = useState<AdminTheme>("light");

  useEffect(() => {
    const nextLanguage = readLanguage();
    const nextTheme = readTheme();

    setLanguage(nextLanguage);
    setTheme(nextTheme);
    applyAdminPreferences(nextLanguage, nextTheme);

    function handlePreferenceChange(event: Event) {
      const customEvent = event as CustomEvent<AdminPreferenceDetail>;
      const detail = customEvent.detail ?? {};
      const updatedLanguage = detail.language ?? readLanguage();
      const updatedTheme = detail.theme ?? readTheme();

      setLanguage(updatedLanguage);
      setTheme(updatedTheme);
      applyAdminPreferences(updatedLanguage, updatedTheme);
    }

    window.addEventListener(ADMIN_PREFERENCES_EVENT, handlePreferenceChange);

    return () => {
      window.removeEventListener(ADMIN_PREFERENCES_EVENT, handlePreferenceChange);
    };
  }, []);

  return { language, theme };
}
