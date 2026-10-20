import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEMO_MODE } from "@/app/config";
import { useAuth } from "@/app/auth/AuthProvider";
import { mockRegistration } from "@/app/auth/demoAccounts";
import { parseRegistration, type Issue, type RegistrationInput, type RegistrationIssues } from "@/app/auth/validation";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Field } from "@/app/design-system/molecules/Field";
import { PasswordInput } from "@/app/design-system/molecules/PasswordField";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import "./pages.css";

const EMPTY: RegistrationInput = { name: "", hotelName: "", email: "", whatsapp: "", password: "" };

export function RegisterPage() {
  const { t } = useAppT();
  const a = t.auth.register;
  const e = t.auth.errors;
  const { register } = useAuth();

  const [form, setForm] = useState<RegistrationInput>(EMPTY);
  const [issues, setIssues] = useState<RegistrationIssues>({});
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sampleTurn, setSampleTurn] = useState(0);

  const set = (field: keyof RegistrationInput) => (ev: { target: { value: string } }) => {
    setForm({ ...form, [field]: ev.target.value });
    if (field === "email") setEmailTaken(false);
  };

  const issueText = (field: keyof RegistrationInput, issue?: Issue) => {
    if (field === "email" && emailTaken) return e.emailTaken;
    if (!issue) return undefined;
    if (issue === "required") return e.required;
    if (field === "email") return e.email;
    if (field === "whatsapp") return e.whatsapp;
    return issue === "too_short" ? e.passwordShort : e.passwordWeak;
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const parsed = parseRegistration(form);
    setIssues(parsed.ok ? {} : parsed.issues);
    if (!parsed.ok) return;
    setBusy(true);
    const result = await register(parsed.value);
    // On success GuestOnly sees the new session and sends the person to the app (and its setup).
    if (!result.ok) {
      setBusy(false);
      setEmailTaken(true);
    }
  }

  return (
    <FocusLayout>
      <form className="pg-flow" onSubmit={submit} noValidate>
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{a.title}</Heading>
          <Muted>{a.lead}</Muted>
        </div>
        {DEMO_MODE && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setForm(mockRegistration(sampleTurn));
              setSampleTurn(sampleTurn + 1);
              setIssues({});
              setEmailTaken(false);
            }}
          >
            {a.fillSample}
          </Button>
        )}
        <Field label={a.name} error={issueText("name", issues.name)}>
          <Input value={form.name} onChange={set("name")} placeholder={a.namePh} autoComplete="name" autoFocus />
        </Field>
        <Field label={a.hotelName} error={issueText("hotelName", issues.hotelName)}>
          <Input value={form.hotelName} onChange={set("hotelName")} placeholder={a.hotelNamePh} autoComplete="organization" />
        </Field>
        <Field label={a.email} error={issueText("email", issues.email)}>
          <Input type="email" value={form.email} onChange={set("email")} placeholder={a.emailPh} autoComplete="email" inputMode="email" />
        </Field>
        <Field label={a.whatsapp} hint={a.whatsappHint} error={issueText("whatsapp", issues.whatsapp)}>
          <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label={a.password} hint={a.passwordHint} error={issueText("password", issues.password)}>
          <PasswordInput
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            showLabel={t.auth.password.show}
            hideLabel={t.auth.password.hide}
          />
        </Field>
        <Button type="submit" size="lg" block icon="check" disabled={busy}>
          {busy ? a.busy : a.submit}
        </Button>
        <p className="pg-flow__switch">
          {a.haveAccount} <Link to="/app/login">{a.toLogin}</Link>
        </p>
      </form>
    </FocusLayout>
  );
}
