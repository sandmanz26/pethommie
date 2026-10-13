import { useLocale } from "../../i18n/LocaleProvider";
import "./layout.css";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span>{t.footer.left}</span>
        <span>{t.footer.right}</span>
      </div>
    </footer>
  );
}
