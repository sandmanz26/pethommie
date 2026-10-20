import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "@/app/config";
import { useAuth } from "@/app/auth/AuthProvider";
import { DEMO_PASSWORD, demoAccounts } from "@/app/auth/demoAccounts";
import { loginIssues, type Issue } from "@/app/auth/validation";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { PasswordInput } from "@/app/design-system/molecules/PasswordField";
import { DemoAccountsPanel } from "@/app/design-system/organisms/DemoAccountsPanel";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import "./pages.css";

const SCENE = {
  src: "/backgrounds/login-scene.webp",
  srcSet: "/backgrounds/login-scene-800.webp 800w, /backgrounds/login-scene.webp 1600w",
  width: 1600,
  height: 905,
};

export function LoginPage() {
  const { t } = useAppT();
  const a = t.auth.login;
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issues, setIssues] = useState<Partial<Record<"email" | "password", Issue>>>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const issueText = (issue?: Issue) => (issue === "invalid" ? t.auth.errors.email : issue ? t.auth.errors.required : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = loginIssues(email, password);
    setIssues(found);
    setFailed(false);
    if (Object.keys(found).length) return;
    setBusy(true);
    const result = await login(email, password);
    // On success GuestOnly sees the new session and sends the person on.
    if (!result.ok) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <FocusLayout art={SCENE}>
      <form className="pg-flow" onSubmit={submit} noValidate>
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{a.title}</Heading>
          <Muted>{a.lead}</Muted>
        </div>
        {failed && <Alert tone="danger">{a.failed}</Alert>}
        <Field label={a.email} error={issueText(issues.email)}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={a.emailPh} autoComplete="username" inputMode="email" autoFocus />
        </Field>
        <Field label={a.password} error={issueText(issues.password)}>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            showLabel={t.auth.password.show}
            hideLabel={t.auth.password.hide}
          />
        </Field>
        <Button type="submit" size="lg" block icon="login" disabled={busy}>
          {busy ? a.busy : a.submit}
        </Button>
        <p className="pg-flow__switch">
          {a.noAccount} <Link to="/app/register">{a.toRegister}</Link>
        </p>
        {DEMO_MODE && (
          <DemoAccountsPanel
            accounts={demoAccounts}
            password={DEMO_PASSWORD}
            onPick={(demoEmail, demoPassword) => {
              setEmail(demoEmail);
              setPassword(demoPassword);
              setIssues({});
              setFailed(false);
            }}
          />
        )}
      </form>
    </FocusLayout>
  );
}
