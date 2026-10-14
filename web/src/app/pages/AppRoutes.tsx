import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppStoreProvider, useStore } from "../store/AppStore";
import { AppLayout } from "../design-system/templates/AppLayout";
import "../design-system/tokens.css";
import { OnboardingPage } from "./OnboardingPage";
import { TodayPage } from "./TodayPage";
import { BookingsPage } from "./BookingsPage";
import { BookingNewPage } from "./BookingNewPage";
import { PetsPage } from "./PetsPage";
import { PetEditPage } from "./PetEditPage";
import { CagesPage } from "./CagesPage";
import { SettingsPage } from "./SettingsPage";

/** Workspace pages need a set-up hotel; send first-time users to onboarding. */
function Workspace() {
  const { data } = useStore();
  if (!data.hotel) return <Navigate to="/app/onboarding" replace />;
  return (
    <AppLayout hotelName={data.hotel.name}>
      <Outlet />
    </AppLayout>
  );
}

/** Everything under /app. Mounted from the top-level router. */
export default function AppRoutes() {
  return (
    <AppStoreProvider>
      <Routes>
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<Workspace />}>
          <Route index element={<TodayPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/new" element={<BookingNewPage />} />
          <Route path="pets" element={<PetsPage />} />
          <Route path="pets/new" element={<PetEditPage />} />
          <Route path="pets/:id" element={<PetEditPage />} />
          <Route path="cages" element={<CagesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
      </Routes>
    </AppStoreProvider>
  );
}
