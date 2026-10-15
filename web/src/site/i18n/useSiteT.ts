import { useLocale } from "@/shared/i18n/LocaleProvider";
import type { Locale } from "@/shared/i18n/locales";
import { en, type Messages } from "./en";
import { id } from "./id";

const messages = { en, id } satisfies Record<Locale, Messages>;

/** Marketing-site copy for the current language, plus the locale code. */
export function useSiteT() {
  const { locale } = useLocale();
  return { t: messages[locale], locale };
}
