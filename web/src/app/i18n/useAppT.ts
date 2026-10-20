import { useLocale } from "@/shared/i18n/LocaleProvider";
import { appEn } from "./en";
import { appId } from "./id";

const messages = { en: appEn, id: appId };

/** The copy of one language, whatever the screen is in: for documents written in the customer's language, such as an invoice. */
export const messagesFor = (language: "id" | "en") => messages[language];

/** App copy for the current language, plus the locale code for number/date formatting. */
export function useAppT() {
  const { locale } = useLocale();
  return { t: messages[locale], locale };
}
