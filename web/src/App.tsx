import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LocaleProvider } from "./i18n/LocaleProvider";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <LocaleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          {/* Operator app routes (dashboard, booking, check-in) go here. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </LocaleProvider>
  );
}
