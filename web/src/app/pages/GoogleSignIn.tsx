import { useState } from "react";
import { useAuth } from "@/app/auth/AuthProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { Alert } from "@/app/design-system/molecules/Alert";
import { GoogleButton } from "@/app/design-system/molecules/GoogleButton";

/** "Continue with Google": leaves for Google and comes back signed in. `beforeLeave` keeps anything the trip would lose. */
export function GoogleSignIn({ next, beforeLeave }: { next?: string; beforeLeave?: () => void }) {
  const { t } = useAppT();
  const g = t.auth.google;
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function go() {
    setBusy(true);
    setFailed(false);
    beforeLeave?.();
    const result = await signInWithGoogle(next);
    // On success the browser is already on its way to Google.
    if (!result.ok) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <>
      {failed && <Alert tone="danger">{g.failed}</Alert>}
      <GoogleButton label={busy ? g.busy : g.continue} busy={busy} onClick={go} />
    </>
  );
}
