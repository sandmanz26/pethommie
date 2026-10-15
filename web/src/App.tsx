import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { LandingPage } from "@/site/pages/LandingPage";
import { NotFoundPage } from "@/site/pages/NotFoundPage";
import { SiteShell } from "@/site/SiteShell";

// The operator app is its own bundle so the landing page stays light.
const AppRoutes = lazy(() => import("@/app/pages/AppRoutes"));

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteShell />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route
            path="/app/*"
            element={
              <Suspense fallback={null}>
                <AppRoutes />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  );
}
