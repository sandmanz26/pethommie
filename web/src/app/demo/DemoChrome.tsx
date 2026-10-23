import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Account } from "@/app/auth/types";
import { useAuth } from "@/app/auth/AuthProvider";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Icon } from "@/app/design-system/atoms/Icon";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { DEMO_OFFER, startOffer, timeLeft } from "./offer";
import "./demo.css";

/**
 * What a "Try now" session always shows: a strip across the top saying this is the demo, and a floating offer with
 * its countdown. Both stay on every page of the demo, setup included; real accounts never see them.
 */
export function DemoChrome({ account, children }: { account: Account; children: ReactNode }) {
  const { t } = useAppT();
  const d = t.auth.demo;
  const { logout } = useAuth();
  const { loadSample, reset } = useStore();
  const navigate = useNavigate();
  const [ends] = useState(() => startOffer());
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  // The app's sticky side menu and floating bits make room for the strip.
  useEffect(() => {
    document.body.classList.add("has-demobar");
    return () => document.body.classList.remove("has-demobar");
  }, []);

  const left = timeLeft(ends, now);

  // Logging out unmounts this; the guard then takes the visitor where they chose.
  const leave = (to: string) => logout(to);

  function startOver() {
    setConfirming(false);
    if (account.startsWithSampleData) loadSample(account.sampleKind);
    else reset();
    navigate("/app", { replace: true });
  }

  return (
    <>
      <div className="demo-bar" role="region" aria-label={d.bar.label}>
        <span className="demo-bar__tag">{d.bar.label}</span>
        <span className="demo-bar__text">{d.bar.text}</span>
        <span className="demo-bar__actions">
          <button type="button" className="demo-bar__link" onClick={() => setConfirming(true)}>
            {d.bar.reset}
          </button>
          <button type="button" className="demo-bar__link" onClick={() => leave("/app/try")}>
            {d.bar.exit}
          </button>
        </span>
      </div>

      {children}

      <aside className="demo-offer" aria-label={d.offer.title(DEMO_OFFER.percentOff)}>
        <span className="demo-offer__badge">
          <Icon name="percent" size={16} />
          {d.offer.badge}
        </span>
        <span className="demo-offer__body">
          <b>{d.offer.title(DEMO_OFFER.percentOff)}</b>
          {left.over ? (
            <small>{d.offer.over}</small>
          ) : (
            <small>
              {d.offer.endsIn} <time className="demo-offer__time" dateTime={new Date(ends).toISOString()}>{d.offer.timeLeft(left.days, left.hours, left.minutes, left.seconds)}</time>
            </small>
          )}
        </span>
        <Button size="sm" onClick={() => leave(left.over ? "/app/register" : `/app/register?offer=${DEMO_OFFER.code}`)}>
          {left.over ? d.offer.toRegister : d.offer.claim}
        </Button>
      </aside>

      <ConfirmDialog
        open={confirming}
        message={d.bar.resetConfirm}
        confirmLabel={d.bar.reset}
        cancelLabel={t.common.cancel}
        danger
        onConfirm={startOver}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
