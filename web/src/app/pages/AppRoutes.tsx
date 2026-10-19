import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useBodyTheme } from "@/shared/hooks/useBodyTheme";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { AuthProvider, useAuth } from "@/app/auth/AuthProvider";
import { GuestOnly, RequireAuth } from "@/app/auth/guards";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Alert } from "@/app/design-system/molecules/Alert";
import { AppLayout } from "@/app/design-system/templates/AppLayout";
import "@/app/design-system/tokens.css";
import { AccountData } from "./AccountData";
import { LoginPage } from "./LoginPage";
import { OnboardingPage } from "./OnboardingPage";
import { RegisterPage } from "./RegisterPage";
import { TodayPage } from "./TodayPage";
import { BookingsPage } from "./BookingsPage";
import { BookingNewPage } from "./BookingNewPage";
import { PetsPage } from "./PetsPage";
import { PetEditPage } from "./PetEditPage";
import { CagesPage } from "./CagesPage";
import { SettingsPage } from "./SettingsPage";

/** Workspace pages need a set-up hotel; send first-time users to onboarding. */
function Workspace() {
  const { data, saveFailed } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useAppT();
  if (!data.hotel) return <Navigate to="/app/onboarding" replace />;
  return (
    <AppLayout
      hotelName={data.hotel.name}
      banner={saveFailed && <Alert tone="warn">{t.common.saveFailed}</Alert>}
      onLogout={async () => {
        await logout();
        navigate("/app/login", { replace: true });
      }}
    >
      <Outlet />
    </AppLayout>
  );
}

/**
 * Everything under /app. Mounted from the top-level router.
 *   /app/login, /app/register   for people who are signed out
 *   everything else             needs an account; its data is that account's own
 */
export default function AppRoutes() {
  useBodyTheme("app");
  useDocumentMeta({ title: "Pethommie", robots: "noindex", themeColor: "#f4efe6" });
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AccountData />}>
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
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
