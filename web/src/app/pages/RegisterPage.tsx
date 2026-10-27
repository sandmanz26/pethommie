import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { EMAIL_MAX, NAME_LIMITS, PASSWORD_MAX, parseRegistration, type Issue, type RegistrationInput } from "@/app/auth/validation";
import { activeOffer } from "@/app/demo/offer";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { PasswordInput } from "@/app/design-system/molecules/PasswordField";
import { FocusLayout } from "@/app/design-system/templates/FocusLayout";
import { PENDING_OFFER_KEY } from "@/app/auth/supabaseAuthService";
import { GoogleSignIn } from "./GoogleSignIn";
import "./pages.css";

const SCENE = {
  src: "/backgrounds/pet-hotel-scene.webp",
  srcSet: "/backgrounds/pet-hotel-scene-800.webp 800w, /backgrounds/pet-hotel-scene.webp 1586w",
  width: 1586,
  height: 992,
};

const EMPTY: RegistrationInput = { name: "", hotelName: "", email: "", whatsapp: "", password: "" };

type FieldName = keyof RegistrationInput;
const FIELDS: FieldName[] = ["name", "hotelName", "email", "whatsapp", "password"];

export function RegisterPage() {
  const { t, locale } = useAppT();
  const a = t.auth.register;
  const e = t.auth.errors;
  const { register, methods } = useAuth();
  const g = t.auth.google;
  const [params] = useSearchParams();
  // Coming from the demo's offer: the discount goes with the new account while it still runs.
  const [offer] = useState(() => (params.get("offer") ? activeOffer() : null));

  const [form, setForm] = useState<RegistrationInput>(EMPTY);
  // A field shows its problem once it has been left, or after a try to submit; never while it is first being typed.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const parsed = parseRegistration(form);
  const issues = parsed.ok ? {} : parsed.issues;

  const set = (field: FieldName) => (ev: { target: { value: string } }) => {
    setForm({ ...form, [field]: ev.target.value });
    if (field === "email") setEmailTaken(false);
  };
  const leave = (field: FieldName) => () => setTouched((x) => ({ ...x, [field]: true }));

  const message = (field: FieldName, issue: Issue): string => {
    if (issue === "required") return e.required;
    if (field === "email") return issue === "too_long" ? e.tooLong(EMAIL_MAX) : e.email;
    if (field === "whatsapp") return e.whatsapp;
    if (field === "password") return issue === "too_short" ? e.passwordShort : issue === "too_long" ? e.tooLong(PASSWORD_MAX) : e.passwordWeak;
    const [min, max] = NAME_LIMITS[field];
    return issue === "too_short" ? e.tooShort(min) : e.tooLong(max);
  };
  const issueText = (field: FieldName) => {
    if (field === "email" && emailTaken) return e.emailTaken;
    const issue = issues[field];
    return issue && (submitted || touched[field]) ? message(field, issue) : undefined;
  };

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    if (!parsed.ok) {
      const first = FIELDS.find((f) => issues[f]);
      if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    const result = await register(parsed.value, offer ?? undefined);
    // On success GuestOnly sees the new session and sends the person to the app (and its setup).
    if (!result.ok) {
      setBusy(false);
      setEmailTaken(true);
      formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.focus();
    }
  }

  // Google's round trip leaves the page: the demo's offer waits in this browser and joins the account on return.
  const keepOffer = () => {
    try {
      if (offer) localStorage.setItem(PENDING_OFFER_KEY, JSON.stringify(offer));
    } catch {
      // storage blocked: the offer is a bonus, signing up still works
    }
  };

  if (!methods.password)
    return (
      <FocusLayout art={SCENE}>
        <div className="pg-flow">
          <div className="pg-flow__head pg-flow__head--center">
            <Heading level={1}>{a.title}</Heading>
            <Muted>{g.registerLead}</Muted>
          </div>
          {offer && <Alert tone="ok">{a.offer(offer.percentOff, new Date(offer.expiresAt).toLocaleString(locale === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short" }))}</Alert>}
          <GoogleSignIn next="/app" beforeLeave={keepOffer} />
          <p className="pg-flow__switch">
            {a.haveAccount} <Link to="/app/login">{a.toLogin}</Link>
          </p>
        </div>
      </FocusLayout>
    );

  return (
    <FocusLayout art={SCENE}>
      <form ref={formRef} className="pg-flow" onSubmit={submit} noValidate>
        <div className="pg-flow__head pg-flow__head--center">
          <Heading level={1}>{a.title}</Heading>
          <Muted>{a.lead}</Muted>
        </div>
        {offer && <Alert tone="ok">{a.offer(offer.percentOff, new Date(offer.expiresAt).toLocaleString(locale === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short" }))}</Alert>}
        {methods.google && (
          <>
            <GoogleSignIn next="/app" beforeLeave={keepOffer} />
            <p className="ds-or">{g.or}</p>
          </>
        )}
        <Field label={a.name} error={issueText("name")}>
          <Input name="name" value={form.name} onChange={set("name")} onBlur={leave("name")} maxLength={NAME_LIMITS.name[1] + 20} placeholder={a.namePh} autoComplete="name" autoFocus />
        </Field>
        <Field label={a.hotelName} error={issueText("hotelName")}>
          <Input name="hotelName" value={form.hotelName} onChange={set("hotelName")} onBlur={leave("hotelName")} maxLength={NAME_LIMITS.hotelName[1] + 20} placeholder={a.hotelNamePh} autoComplete="organization" />
        </Field>
        <Field label={a.email} error={issueText("email")}>
          <Input name="email" type="email" value={form.email} onChange={set("email")} onBlur={leave("email")} placeholder={a.emailPh} autoComplete="email" inputMode="email" />
        </Field>
        <Field label={a.whatsapp} hint={a.whatsappHint} error={issueText("whatsapp")}>
          <Input name="whatsapp" value={form.whatsapp} onChange={set("whatsapp")} onBlur={leave("whatsapp")} placeholder="08xx xxxx xxxx" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label={a.password} hint={a.passwordHint} error={issueText("password")}>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={set("password")}
            onBlur={leave("password")}
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
