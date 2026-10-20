import { company } from "@/shared/company";
import { useAppT } from "@/app/i18n/useAppT";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

/** A short guide, the questions people ask first, and how to reach us. Static: no data. */
export function HelpPage() {
  const { t } = useAppT();
  const h = t.help;
  const hasContact = Boolean(company.email || company.whatsapp);
  return (
    <>
      <PageHeader title={h.title} lead={h.lead} />
      <div className="pg-columns">
        <section className="ds-panel" aria-labelledby="help-start">
          <Heading level={2} size="md"><span id="help-start">{h.startTitle}</span></Heading>
          <ol className="pg-steps">
            {h.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="ds-panel" aria-labelledby="help-faq">
          <Heading level={2} size="md"><span id="help-faq">{h.faqTitle}</span></Heading>
          {h.faq.map((f) => (
            <details key={f.q} className="ds-earlier">
              <summary>{f.q}</summary>
              <p className="ds-muted">{f.a}</p>
            </details>
          ))}
        </section>
      </div>

      <section className="ds-panel" aria-labelledby="help-contact">
        <Heading level={2} size="md"><span id="help-contact">{h.contactTitle}</span></Heading>
        {hasContact ? (
          <>
            <Muted>{h.contactLead}</Muted>
            <div className="ds-form__actions">
              {company.email && (
                <a className="ds-btn ds-btn--secondary ds-btn--md" href={`mailto:${company.email}`}>
                  <span>{h.email}</span>
                </a>
              )}
              {company.whatsapp && (
                <a className="ds-btn ds-btn--secondary ds-btn--md" href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <span>{h.whatsapp}</span>
                </a>
              )}
            </div>
          </>
        ) : (
          <Muted>{h.noContact}</Muted>
        )}
      </section>
    </>
  );
}
