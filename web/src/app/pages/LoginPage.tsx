import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "@/app/config";
import { useAuth } from "@/app/auth/AuthProvider";
import { loginIssues, type Issue } from "@/app/auth/validation";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { PasswordInput } from "@/app/design-system/molecules/PasswordField";
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
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Checked as you go: a field shows its problem once it has been left, or after a try to log in.
  const issues = loginIssues(email, password);
  const issueText = (field: "email" | "password") => {
    const issue: Issue | undefined = issues[field];
    if (!issue || !(submitted || touched[field])) return undefined;
    return issue === "invalid" ? t.auth.errors.email : t.auth.errors.required;
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFailed(false);
    const first = (["email", "password"] as const).find((f) => issues[f]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
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
      <form ref={formRef} className="pg-flow" onSubmit={submit} noValidate>
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{a.title}</Heading>
          <Muted>{a.lead}</Muted>
        </div>
        {failed && <Alert tone="danger">{a.failed}</Alert>}
        <Field label={a.email} error={issueText("email")}>
          <Input name="email" type="email" value={email} onChange={(e) => (setEmail(e.target.value), setFailed(false))} onBlur={() => setTouched((x) => ({ ...x, email: true }))} placeholder={a.emailPh} autoComplete="username" inputMode="email" autoFocus />
        </Field>
        <Field label={a.password} error={issueText("password")}>
          <PasswordInput
            name="password"
            value={password}
            onChange={(e) => (setPassword(e.target.value), setFailed(false))}
            onBlur={() => setTouched((x) => ({ ...x, password: true }))}
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
          <p className="pg-flow__switch">
            {a.tryLead} <Link to="/app/try">{a.toTry}</Link>
          </p>
        )}
      </form>
    </FocusLayout>
  );
}
