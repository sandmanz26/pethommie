import { useLocale } from "../../i18n/LocaleProvider";
import { locales, type Locale } from "../../i18n/locales";
import "./layout.css";

/** EN / ID toggle. The choice is remembered in this browser. */
export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className="lang" role="group" aria-label={t.nav.languageLabel}>
      {(Object.keys(locales) as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          className="lang__option"
          aria-pressed={l === locale}
          onClick={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
