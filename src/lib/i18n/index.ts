"use client";

import { messages, type Locale } from "@/lib/i18n/messages";
import { useLocaleStore } from "@/stores/locale-store";

function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  function t(path: string, vars?: Record<string, string | number>) {
    const raw = getPath(messages[locale], path) ?? getPath(messages.en, path);
    let text = typeof raw === "string" ? raw : path;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${key}}`, String(value));
      }
    }
    return text;
  }

  return { locale, setLocale, t };
}

export type { Locale };
