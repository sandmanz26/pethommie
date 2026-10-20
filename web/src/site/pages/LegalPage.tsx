import { Link } from "react-router-dom";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { company } from "@/shared/company";
import { useSiteT } from "@/site/i18n/useSiteT";
import { Footer } from "@/site/components/layout/Footer";
import { TopBar } from "@/site/components/layout/TopBar";
import "./legal.css";

/** The privacy policy or the terms: a title, a date, and plain sections. The words live in the site copy. */
export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t, locale } = useSiteT();
  const doc = t.legal[kind];
  const contact = company.email || (company.whatsapp ? `WhatsApp +${company.whatsapp}` : locale === "id" ? "melalui formulir waitlist di situs ini" : "through the waitlist form on this site");
  const fill = (text: string) => text.replace("{company}", company.name).replace("{contact}", contact);
  useDocumentMeta({ title: `${doc.title} · Pethommie`, description: doc.intro });
  return (
    <>
      <TopBar onLanding={false} />
      <main className="legal" id="top">
        <div className="wrap legal__inner">
          <Link to="/" className="legal__back">
            ← {t.legal.back}
          </Link>
          <h1>{doc.title}</h1>
          <p className="legal__updated">{t.legal.updated}</p>
          <p className="legal__intro">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p.map((para) => (
                <p key={para}>{fill(para)}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
