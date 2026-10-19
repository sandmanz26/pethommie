import { Button } from "@/app/design-system/atoms/Button";
import { Muted } from "@/app/design-system/atoms/Text";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

export type DemoAccount = { id: string; name: string; email: string };

/** Mock accounts to try the app with; one tap fills the login form. Only shown in demo mode. */
export function DemoAccountsPanel({ accounts, password, onPick }: { accounts: DemoAccount[]; password: string; onPick: (email: string, password: string) => void }) {
  const { t } = useAppT();
  const d = t.auth.demo;
  return (
    <section className="ds-demo" aria-labelledby="demo-accounts-title">
      <h2 id="demo-accounts-title" className="ds-demo__title">
        {d.title}
      </h2>
      <Muted>
        {d.lead} <code>{password}</code>
      </Muted>
      <ul className="ds-demo__list">
        {accounts.map((a) => (
          <li key={a.id}>
            <span>
              <b>{a.email}</b>
              <small>{d.accounts[a.id] ?? a.name}</small>
            </span>
            <Button size="sm" variant="secondary" onClick={() => onPick(a.email, password)}>
              {d.use}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
