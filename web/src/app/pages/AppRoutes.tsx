import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useBodyTheme } from "@/shared/hooks/useBodyTheme";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { AuthProvider, useAuth } from "@/app/auth/AuthProvider";
import { GuestOnly, RequireAuth } from "@/app/auth/guards";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { useServiceWorker } from "@/app/pwa/useServiceWorker";
import { Button } from "@/app/design-system/atoms/Button";
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
import { BookingDetailPage } from "./BookingDetailPage";
import { CalendarPage } from "./CalendarPage";
import { MorePage } from "./MorePage";
import { CustomersPage } from "./CustomersPage";
import { CustomerDetailPage } from "./CustomerDetailPage";
import { PaymentsPage } from "./PaymentsPage";
import { ReportsPage } from "./ReportsPage";
import { DashboardPage } from "./DashboardPage";
import { InvoicesPage } from "./InvoicesPage";
import { InvoicePage } from "./InvoicePage";
import { TaxPage } from "./TaxPage";
import { HelpPage } from "./HelpPage";
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
  const sw = useServiceWorker();
  if (!data.hotel) return <Navigate to="/app/onboarding" replace />;
  return (
    <AppLayout
      hotelName={data.hotel.name}
      labels={{ cages: t.units[data.settings.unitTerm].many }}
      banner={
        <>
          {saveFailed && <Alert tone="warn">{t.common.saveFailed}</Alert>}
          {sw.needRefresh && (
            <Alert tone="info">
              {t.common.updateReady}{" "}
              <Button size="sm" onClick={sw.reload}>{t.common.reload}</Button>
            </Alert>
          )}
          {sw.offlineReady && !sw.needRefresh && (
            <Alert tone="ok">
              {t.common.offlineReady}{" "}
              <Button size="sm" variant="ghost" onClick={sw.dismiss}>{t.common.dismiss}</Button>
            </Alert>
          )}
        </>
      }
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
              <Route path="bookings/:id" element={<BookingDetailPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="more" element={<MorePage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoicePage />} />
              <Route path="tax" element={<TaxPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="help" element={<HelpPage />} />
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
