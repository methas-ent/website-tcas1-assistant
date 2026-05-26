"use client";

import { translateAdminText } from "@/lib/admin-translations";
import { useAdminPreferences } from "@/components/admin/useAdminPreferences";

type AdminTranslatedTextProps = {
  text: string;
};

export function AdminTranslatedText({ text }: AdminTranslatedTextProps) {
  const { language } = useAdminPreferences();

  return <>{language === "en" ? translateAdminText(text) : text}</>;
}
