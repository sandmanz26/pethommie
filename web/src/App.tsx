import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/shared/errors/ErrorBoundary";
import { LocaleProvider, useLocale } from "@/shared/i18n/LocaleProvider";
import { Loading } from "@/shared/ui/Loading";
import { LandingPage } from "@/site/pages/LandingPage";
import { LegalPage } from "@/site/pages/LegalPage";
import { NotFoundPage } from "@/site/pages/NotFoundPage";
import { BookPage } from "@/site/pages/BookPage";
import { SiteShell } from "@/site/SiteShell";

// The operator app is its own bundle so the landing page stays light.
const AppRoutes = lazy(() => import("@/app/pages/AppRoutes"));

function AppLoading() {
  const { locale } = useLocale();
  return <Loading label={locale === "id" ? "Memuat…" : "Loading…"} />;
}

export default function App() {
  return (
    <LocaleProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteShell />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/book" element={<BookPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            {/* Short links people type or remember. */}
            <Route path="/login" element={<Navigate to="/app/login" replace />} />
            <Route path="/register" element={<Navigate to="/app/register" replace />} />
            <Route path="/try" element={<Navigate to="/app/try" replace />} />
            <Route
              path="/app/*"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AppRoutes />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </LocaleProvider>
  );
}
