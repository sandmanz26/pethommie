import { useLocale } from "@/shared/i18n/LocaleProvider";
import { LOCALES } from "@/shared/i18n/locales";
import "./language-switch.css";

/** EN / ID toggle. The choice is remembered in this browser. `label` is the accessible group name. */
export function LanguageSwitch({ label }: { label: string }) {
  const { locale, setLocale } = useLocale();
  return (
    <div className="lang" role="group" aria-label={label}>
      {LOCALES.map((l) => (
        <button key={l} type="button" className="lang__option" aria-pressed={l === locale} onClick={() => setLocale(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
