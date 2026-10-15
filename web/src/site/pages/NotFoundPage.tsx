import { Link } from "react-router-dom";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { Hanko } from "@/shared/ui/Hanko";
import { useSiteT } from "@/site/i18n/useSiteT";

export function NotFoundPage() {
  const { notFound } = useSiteT().t;
  useDocumentMeta({ title: notFound.title, robots: "noindex" });
  return (
    <main className="section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="wrap" style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <Hanko size={44} />
        <h1 style={{ fontSize: "var(--step-3)" }}>{notFound.title}</h1>
        <p style={{ color: "var(--ink-soft)" }}>{notFound.body}</p>
        <Link className="btn btn--solid" to="/">
          {notFound.cta}
        </Link>
      </div>
    </main>
  );
}
