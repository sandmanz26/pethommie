import { useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { DEMO_ENTRY_EMAIL, DEMO_PASSWORD } from "@/app/auth/demoAccounts";
import { landingAfterLogin } from "@/app/auth/landing";
import { useAppT } from "@/app/i18n/useAppT";
import { Loading } from "@/shared/ui/Loading";

/**
 * /app/demo?to=/app/calendar: one click from the website into the demo, on the screen the visitor was looking at.
 * Signs in to the demo hotel (its password is shown on the login screen anyway). Someone already signed in, to the
 * demo or to their own hotel, simply goes to the screen: nobody is ever signed out of their own account by a link.
 */
export function DemoEntry() {
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useAppT();
  const to = landingAfterLogin(params.get("to"));
  const started = useRef(false);

  useEffect(() => {
    if (status !== "signedOut" || started.current) return;
    started.current = true;
    login(DEMO_ENTRY_EMAIL, DEMO_PASSWORD).then((result) => navigate(result.ok ? to : "/app/login", { replace: true }));
  }, [status, login, navigate, to]);

  if (status === "signedIn" && !started.current) return <Navigate to={to} replace />;
  return <Loading label={locale === "id" ? "Membuka demo…" : "Opening the demo…"} />;
}
