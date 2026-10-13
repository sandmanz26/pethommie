import { Link } from "react-router-dom";
import { Hanko } from "../components/ui/Hanko";
import { useLocale } from "../i18n/LocaleProvider";

export function NotFoundPage() {
  const { notFound } = useLocale().t;
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
