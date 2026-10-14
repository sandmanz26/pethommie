import { useLocale } from "../../i18n/LocaleProvider";
import { appEn } from "./en";
import { appId } from "./id";

const messages = { en: appEn, id: appId };

/** App copy for the current language, plus the locale code for number/date formatting. */
export function useAppT() {
  const { locale } = useLocale();
  return { t: messages[locale], locale };
}
