import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Messages } from "./en";
import { DEFAULT_LOCALE, locales, type Locale } from "./locales";

const STORAGE_KEY = "pethommie.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in locales) return saved as Locale;
  } catch {
    // Storage blocked; fall back to the default.
  }
  return DEFAULT_LOCALE;
}

type LocaleContextValue = { locale: Locale; setLocale: (l: Locale) => void; t: Messages };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const t = locales[locale];

  useEffect(() => {
    document.documentElement.lang = t.meta.htmlLang;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.meta.description);
  }, [t]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t,
      setLocale: (l) => {
        setLocaleState(l);
        try {
          localStorage.setItem(STORAGE_KEY, l);
        } catch {
          // Not persisted; the choice still applies for this visit.
        }
      },
    }),
    [locale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
