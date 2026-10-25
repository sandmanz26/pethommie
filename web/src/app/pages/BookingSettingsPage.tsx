import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stayRulesIssues } from "@/app/domain/stayRules";
import type { LateMode, PayMode, StayCounting, StayRules } from "@/app/domain/types";
import { useStore } from "@/app/store/AppStore";
import { useAppT } from "@/app/i18n/useAppT";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select } from "@/app/design-system/atoms/Input";
import { MoneyInput } from "@/app/design-system/atoms/MoneyInput";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { Field } from "@/app/design-system/molecules/Field";
import { Segmented } from "@/app/design-system/molecules/Segmented";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import { intError, moneyError } from "@/app/forms/messages";
import { useFocusInvalid } from "@/shared/hooks/useFocusInvalid";
import { parseRupiah } from "@/shared/lib/validate";
import "./pages.css";

type StayErrors = Partial<Record<"dropOffFrom" | "dropOffUntil" | "pickUpUntil" | "grace" | "perHour", string>>;

/** Only a way back into the new-booking form, never anywhere else. */
const safeBack = (back: string | null) => (back && /^\/app\/bookings\/new(\?|$)/.test(back) ? back : null);

/**
 * Everything about how this hotel takes a booking, in one place: how a day is counted, drop-off and pick-up hours,
 * the late pick-up fee, and how a booking is confirmed (payPolicy). Saving the stay rules marks them set, which a new
 * booking needs; when the gate sent the operator here, saving takes them back to the form.
 */
export function BookingSettingsPage() {
  const { data, saveSettings } = useStore();
  const { t, locale } = useAppT();
  const s = t.stayRules;
  const v = t.validation;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeBack(params.get("back"));

  const [rules, setRules] = useState<StayRules>(data.settings.stayRules);
  // What is saved now (only once the rules were set), marked on its option so it's easy to come back to.
  const inUse: Pick<StayRules, "counting" | "late"> = data.settings.stayRules.configured ? data.settings.stayRules : { counting: "" as StayCounting, late: { ...data.settings.stayRules.late, mode: "" as LateMode } };
  const [graceText, setGraceText] = useState(String(data.settings.stayRules.graceMinutes));
  const [perHourText, setPerHourText] = useState(String(data.settings.stayRules.late.perHour));
  const [errors, setErrors] = useState<StayErrors>({});
  const [saved, setSaved] = useState(false);
  const stayForm = useFocusInvalid();
  const edit = (patch: Partial<StayRules>) => (setRules((r) => ({ ...r, ...patch })), setSaved(false));
  const clear = (key: keyof StayErrors) => setErrors(({ [key]: _, ...rest }) => rest);

  const [payMode, setPayMode] = useState<PayMode>(data.settings.payPolicy.mode);
  const [percentText, setPercentText] = useState(String(data.settings.payPolicy.depositPercent));
  const [percentErr, setPercentErr] = useState<string>();
  const [paySaved, setPaySaved] = useState(false);
  const payForm = useFocusInvalid();

  function saveRules(e: FormEvent) {
    e.preventDefault();
    const graceErr = intError(v, graceText.trim(), 0, 240);
    const perHourErr = rules.late.mode === "per_hour" ? moneyError(v, locale, perHourText, { required: true }) : undefined;
    const next: StayRules = {
      ...rules,
      configured: true,
      graceMinutes: graceErr ? NaN : Number(graceText.trim()),
      late: { mode: rules.late.mode, perHour: rules.late.mode === "per_hour" ? (parseRupiah(perHourText) ?? NaN) : rules.late.perHour },
    };
    const issues = stayRulesIssues(next);
    const err: StayErrors = {
      dropOffFrom: issues.includes("dropOffFrom") ? s.errTime : undefined,
      dropOffUntil: issues.includes("dropOffUntil") ? s.errTime : issues.includes("dropOffOrder") ? s.errOrder : undefined,
      pickUpUntil: issues.includes("pickUpUntil") ? s.errTime : undefined,
      grace: graceErr || issues.includes("grace") ? s.errGrace : undefined,
      perHour: perHourErr ?? (issues.includes("lateAmount") ? v.amountZero : undefined),
    };
    if (Object.values(err).some(Boolean)) {
      setErrors(err);
      setSaved(false);
      return void stayForm.focusInvalid();
    }
    const problems = saveSettings({ ...data.settings, stayRules: next });
    if (problems.length) return void setSaved(false);
    setErrors({});
    setSaved(true);
    if (back) navigate(back);
  }

  function savePayPolicy(e: FormEvent) {
    e.preventDefault();
    // The percent only matters for the modes that ask for a deposit; flexible keeps what was there.
    const percent = payMode === "flexible" ? data.settings.payPolicy.depositPercent : /^\d+$/.test(percentText.trim()) ? Number(percentText.trim()) : NaN;
    const issues = saveSettings({ ...data.settings, payPolicy: { mode: payMode, depositPercent: percent } });
    setPercentErr(issues.includes("deposit") ? t.payPolicy.errPercent : undefined);
    setPaySaved(issues.length === 0);
    if (issues.length) payForm.focusInvalid();
  }

  const time = (key: "dropOffFrom" | "dropOffUntil" | "pickUpUntil", label: string, hint?: string) => (
    <Field label={label} hint={hint} error={errors[key]}>
      <Input type="time" value={rules[key]} onChange={(e) => (edit({ [key]: e.target.value }), clear(key), key === "dropOffFrom" && clear("dropOffUntil"))} />
    </Field>
  );

  return (
    <>
      <PageHeader title={s.pageTitle} lead={s.pageLead} back={{ to: back ?? "/app/settings", label: t.common.back }} />

      <form ref={stayForm.ref} className="ds-form__section pg-settings" onSubmit={saveRules} noValidate id="stay-rules">
        <Heading level={2} size="md">{s.title}</Heading>
        <Muted>{s.lead}</Muted>
        <Segmented<StayCounting>
          label={s.counting}
          value={rules.counting}
          onChange={(counting) => edit({ counting })}
          options={(["nights", "calendar_days", "hours24"] as const).map((c) => ({ value: c, label: s.countings[c], badge: inUse.counting === c ? s.inUse : undefined }))}
        />
        <Muted>{s.explain[rules.counting]}</Muted>

        <Heading level={3} size="sm">{s.hours}</Heading>
        <div className="ds-form__row">
          {time("dropOffFrom", s.dropOffFrom)}
          {time("dropOffUntil", s.dropOffUntil)}
        </div>
        <div className="ds-form__row">
          {time("pickUpUntil", s.pickUpUntil, s.pickUpHint)}
          <Field label={s.grace} hint={s.graceHint} error={errors.grace}>
            <Input value={graceText} inputMode="numeric" onChange={(e) => (setGraceText(e.target.value), setSaved(false), clear("grace"))} />
          </Field>
        </div>

        <Heading level={3} size="sm">{s.lateTitle}</Heading>
        <div className="ds-form__row">
          <Field label={s.late}>
            <Select value={rules.late.mode} onChange={(e) => (edit({ late: { ...rules.late, mode: e.target.value as LateMode } }), clear("perHour"))}>
              {(["none", "per_hour", "half_day", "full_day"] as const).map((m) => (
                <option key={m} value={m}>
                  {inUse.late.mode === m ? `${s.lates[m]} · ${s.inUse}` : s.lates[m]}
                </option>
              ))}
            </Select>
          </Field>
          {rules.late.mode === "per_hour" && (
            <Field label={s.perHour} hint={s.perHourHint} error={errors.perHour}>
              <MoneyInput value={perHourText} onChange={(e) => (setPerHourText(e.target.value), setSaved(false), clear("perHour"))} />
            </Field>
          )}
        </div>
        <div className="ds-form__actions">
          {saved && <Alert tone="ok">{s.saved}</Alert>}
          <span className="ds-form__spacer" />
          <Button type="submit" icon="check">
            {back ? s.backToBooking : s.save}
          </Button>
        </div>
      </form>

      <form ref={payForm.ref} className="ds-form__section pg-settings" onSubmit={savePayPolicy} noValidate id="booking-rules">
        <Heading level={2} size="md">{t.payPolicy.title}</Heading>
        <Muted>{t.payPolicy.lead}</Muted>
        <Segmented<PayMode>
          label={t.payPolicy.mode}
          value={payMode}
          onChange={(m) => (setPayMode(m), setPaySaved(false), setPercentErr(undefined))}
          options={(["flexible", "deposit_first", "check_first"] as const).map((m) => ({ value: m, label: t.payPolicy.modes[m], badge: data.settings.payPolicy.mode === m ? s.inUse : undefined }))}
        />
        <Muted>{t.payPolicy.explain[payMode]}</Muted>
        {payMode !== "flexible" && (
          <Field label={t.payPolicy.percent} hint={t.payPolicy.percentHint} error={percentErr}>
            <Input value={percentText} inputMode="numeric" onChange={(e) => (setPercentText(e.target.value), setPaySaved(false), setPercentErr(undefined))} />
          </Field>
        )}
        <div className="ds-form__actions">
          {paySaved && <Alert tone="ok">{t.payPolicy.saved}</Alert>}
          <span className="ds-form__spacer" />
          <Button type="submit" icon="check">
            {t.payPolicy.save}
          </Button>
        </div>
      </form>
    </>
  );
}
