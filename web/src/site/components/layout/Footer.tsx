import { Link } from "react-router-dom";
import { Hanko } from "@/shared/ui/Hanko";
import { company, copyrightYears } from "@/shared/company";
import { useSiteT } from "@/site/i18n/useSiteT";
import "./layout.css";

/** Links back to the landing page's sections work from any page of the site, so they carry the path. */
export function Footer() {
  const { t } = useSiteT();
  const f = t.footer;
  const hasContact = Boolean(company.email || company.whatsapp);
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div className="footer__brand">
          <span className="footer__name">
            <Hanko size={28} /> {t.brand.name}
          </span>
          <p>{f.tagline}</p>
        </div>
        <nav aria-label={f.product}>
          <h2>{f.product}</h2>
          <ul>
            {t.nav.links.map((l) => (
              <li key={l.href}>
                <a href={`/${l.href}`}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={f.legal}>
          <h2>{f.legal}</h2>
          <ul>
            <li>
              <Link to="/privacy">{f.privacy}</Link>
            </li>
            <li>
              <Link to="/terms">{f.terms}</Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2>{f.contact}</h2>
          {hasContact ? (
            <ul>
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </li>
              )}
              {company.whatsapp && (
                <li>
                  <a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noopener noreferrer">
                    {f.whatsapp}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p>{f.contactEmpty}</p>
          )}
        </div>
      </div>
      <div className="wrap footer__legal">
        <span>
          © {copyrightYears()} {company.name}. {f.rights}
        </span>
        <span>{f.art}</span>
      </div>
    </footer>
  );
}
