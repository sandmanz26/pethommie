import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { landingAfterLogin } from "@/app/auth/landing";
import { useAppT } from "@/app/i18n/useAppT";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import { Loading } from "@/shared/ui/Loading";
import "./pages.css";

/**
 * Where Google sends people back. The Supabase client trades the code in the address for a session as it starts;
 * once the account is known, on to the app (setup first for a new account) or wherever the visitor was going.
 */
export function AuthCallbackPage() {
  const { t } = useAppT();
  const g = t.auth.google;
  const { status } = useAuth();
  const [params] = useSearchParams();
  const refused = params.get("error_description") ?? params.get("error");

  if (status === "signedIn") return <Navigate to={landingAfterLogin(params.get("next"))} replace />;
  if (status === "loading" && !refused) return <Loading label={g.callbackTitle} />;
  return (
    <FocusLayout>
      <div className="pg-flow">
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{g.callbackFailed}</Heading>
          {refused && <Muted>{refused}</Muted>}
        </div>
        <Alert tone="warn">{g.failed}</Alert>
        <p className="pg-flow__switch">
          <Link to="/app/login">{g.backToLogin}</Link>
        </p>
      </div>
    </FocusLayout>
  );
}
