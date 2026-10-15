import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocale } from "@/shared/i18n/LocaleProvider";
import type { Locale } from "@/shared/i18n/locales";
import { isStaleDeployError, reloadOnceForNewVersion } from "./staleDeploy";
import "./error-boundary.css";

const copy: Record<Locale, { title: string; body: string; reload: string; home: string }> = {
  en: {
    title: "Something went wrong.",
    body: "Reload the page and try again. Your data is safe in this browser.",
    reload: "Reload",
    home: "Back to the homepage",
  },
  id: {
    title: "Ada yang tidak beres.",
    body: "Muat ulang halaman lalu coba lagi. Datamu aman di browser ini.",
    reload: "Muat ulang",
    home: "Kembali ke beranda",
  },
};

type Props = { children: ReactNode; text: (typeof copy)[Locale] };
type State = { failed: boolean };

class Boundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(error: unknown): State {
    // A tab opened before a deploy asks for files that no longer exist. A reload fixes it, so do it.
    if (isStaleDeployError(error)) reloadOnceForNewVersion();
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { text } = this.props;
    return (
      <main className="error-boundary" role="alert">
        <h1>{text.title}</h1>
        <p>{text.body}</p>
        <div>
          <button type="button" onClick={() => window.location.reload()}>
            {text.reload}
          </button>
          <a href="/">{text.home}</a>
        </div>
      </main>
    );
  }
}

/** Catches anything a screen throws, so a bug shows a way out instead of a blank page. */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return <Boundary text={copy[locale]}>{children}</Boundary>;
}
