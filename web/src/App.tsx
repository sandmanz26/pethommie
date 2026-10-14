import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// The operator app is its own bundle so the landing page stays light.
const AppRoutes = lazy(() => import("./app/pages/AppRoutes"));

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/app/*"
            element={
              <Suspense fallback={null}>
                <AppRoutes />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  );
}
