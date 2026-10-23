import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loading } from "@/shared/ui/Loading";
import { useAppT } from "@/app/i18n/useAppT";
import { useAuth } from "./AuthProvider";
import { landingAfterLogin } from "./landing";

/** Everything inside needs a signed-in account; anyone else goes to the login screen and comes back after. */
export function RequireAuth() {
  const { status, leaveTo } = useAuth();
  const location = useLocation();
  const { locale } = useAppT();
  if (status === "loading") return <Loading label={locale === "id" ? "Memuat…" : "Loading…"} />;
  if (status === "signedOut") {
    // Logged out on purpose, to somewhere chosen: go there. Otherwise log in, then come back here.
    if (leaveTo) return <Navigate to={leaveTo} replace />;
    return <Navigate to="/app/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/**
 * Login and sign-up make no sense once you're in. Signing in flips the state, and this is what notices:
 * it sends you back to the page you were trying to reach, or to the app's home.
 */
export function GuestOnly() {
  const { status } = useAuth();
  const { locale } = useAppT();
  const location = useLocation();
  if (status === "loading") return <Loading label={locale === "id" ? "Memuat…" : "Loading…"} />;
  if (status === "signedIn") return <Navigate to={landingAfterLogin((location.state as { from?: unknown } | null)?.from)} replace />;
  return <Outlet />;
}
