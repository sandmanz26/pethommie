import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/shared/errors/ErrorBoundary";
import { LocaleProvider, useLocale } from "@/shared/i18n/LocaleProvider";
import { Loading } from "@/shared/ui/Loading";
import { LandingPage } from "@/site/pages/LandingPage";
import { NotFoundPage } from "@/site/pages/NotFoundPage";
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
              <Route path="*" element={<NotFoundPage />} />
            </Route>
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
