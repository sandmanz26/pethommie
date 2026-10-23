import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { demoAccounts } from "@/app/auth/demoAccounts";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import "./pages.css";

const SCENE = {
  src: "/backgrounds/login-scene.webp",
  srcSet: "/backgrounds/login-scene-800.webp 800w, /backgrounds/login-scene.webp 1600w",
  width: 1600,
  height: 905,
};

/**
 * "Try now": pick a sample hotel and you're in, no password. Its own screen, apart from logging in, because the demo
 * hotels are not accounts: what happens in them stays in them.
 */
export function TryPage() {
  const { t } = useAppT();
  const d = t.auth.demo;
  const { tryDemo } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function open(id: string) {
    setOpening(id);
    setFailed(false);
    const result = await tryDemo(id);
    // On success GuestOnly sees the session and sends the visitor into the demo hotel.
    if (!result.ok) {
      setOpening(null);
      setFailed(true);
    }
  }

  return (
    <FocusLayout art={SCENE}>
      <div className="pg-flow">
        <div className="pg-flow__head pg-flow__head--center">
          <p className="pg-try__eyebrow">{d.eyebrow}</p>
          <Heading level={1}>{d.title}</Heading>
          <Muted>{d.lead}</Muted>
        </div>
        {failed && <Alert tone="danger">{d.failed}</Alert>}
        <ul className="pg-try">
          {demoAccounts.map((a) => (
            <li key={a.id} className="pg-try__hotel">
              <span>
                <b>{d.accounts[a.id]?.title ?? a.hotelName}</b>
                <small>{d.accounts[a.id]?.body}</small>
              </span>
              <Button size="sm" icon="chevronRight" disabled={opening !== null} onClick={() => open(a.id)} aria-label={`${d.enter}: ${d.accounts[a.id]?.title ?? a.hotelName}`}>
                {opening === a.id ? d.entering : d.enter}
              </Button>
            </li>
          ))}
        </ul>
        <p className="pg-try__apart">{d.apart}</p>
        <p className="pg-flow__switch">
          {d.haveAccount} <Link to="/app/login">{d.toLogin}</Link> · {d.wantReal} <Link to="/app/register">{d.toRegister}</Link>
        </p>
      </div>
    </FocusLayout>
  );
}
