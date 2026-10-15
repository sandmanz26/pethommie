import { useSiteT } from "@/site/i18n/useSiteT";
import "./layout.css";

export function Footer() {
  const { t } = useSiteT();
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span>{t.footer.left}</span>
        <span>{t.footer.right}</span>
      </div>
    </footer>
  );
}
