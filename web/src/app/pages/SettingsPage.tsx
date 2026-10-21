import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { useAccount, useAuth } from "@/app/auth/AuthProvider";
import { markBackedUp } from "@/app/store/backupNote";
import { useStore } from "@/app/store/AppStore";
import { useMode } from "@/app/mode/ModeProvider";
import type { HotelSettings, Language } from "@/app/domain/types";
import { parseStored } from "@/app/store/storage";
import { useAppT } from "@/app/i18n/useAppT";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import { Button } from "@/app/design-system/atoms/Button";
import { Input, Select, Textarea } from "@/app/design-system/atoms/Input";
import { Checkbox } from "@/app/design-system/atoms/Checkbox";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { ModeSwitch } from "@/app/design-system/molecules/ModeSwitch";
import { UpgradeCard } from "@/app/design-system/organisms/UpgradeCard";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { Field } from "@/app/design-system/molecules/Field";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

export function SettingsPage() {
  const { data, setHotel, saveSettings, loadSample, reset, importData } = useStore();
  const { mode, setMode } = useMode();
  const { t } = useAppT();
  const navigate = useNavigate();
  const account = useAccount();
  const { logout } = useAuth();
  const hotel = data.hotel!;
  const [name, setName] = useState(hotel.name);
  const [city, setCity] = useState(hotel.city);
  const [wa, setWa] = useState(formatWhatsapp(hotel.whatsapp));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<HotelSettings>(data.settings);
  const [ppnText, setPpnText] = useState(String(data.settings.tax.ppnPercent));
  const [bizErrors, setBizErrors] = useState<{ prefix?: string; ppn?: string }>({});
  const [bizSaved, setBizSaved] = useState(false);
  const edit = (patch: Partial<HotelSettings>) => (setDraft((d) => ({ ...d, ...patch })), setBizSaved(false));
  const editTax = (patch: Partial<HotelSettings["tax"]>) => edit({ tax: { ...draft.tax, ...patch } });
  const [confirm, setConfirm] = useState<"reset" | "sample" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<{ status: "idle" | "bad" | "newer" | "done" } | { status: "ask"; data: typeof data }>({ status: "idle" });

  /** Reads a backup file and, if it is a good one, asks before it replaces what is here. */
  async function pickBackup(file: File | undefined) {
    if (!file) return;
    const text = await file.text().catch(() => "");
    const { data: restored, problem } = parseStored(text);
    if (problem === "newer") setRestore({ status: "newer" });
    else if (problem || !restored.hotel) setRestore({ status: "bad" });
    else setRestore({ status: "ask", data: restored });
    if (fileInput.current) fileInput.current.value = "";
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = t.onboarding.hotel.errName;
    const normalised = wa.trim() ? normaliseWhatsapp(wa) : "";
    if (normalised === null) err.wa = t.onboarding.hotel.errWhatsapp;
    setErrors(err);
    if (Object.keys(err).length) return;
    setHotel({ ...hotel, name: name.trim(), city: city.trim(), whatsapp: normalised ?? "" });
    setSaved(true);
  }

  function saveBusiness(e: FormEvent) {
    e.preventDefault();
    const ppn = Number(ppnText.replace(",", "."));
    const issues = saveSettings({ ...draft, tax: { ...draft.tax, ppnPercent: ppnText.trim() === "" ? NaN : ppn } });
    setBizErrors({
      prefix: issues.includes("prefix") ? t.settingsBiz.errPrefix : undefined,
      ppn: issues.includes("ppn") ? t.settingsTax.errPpn : undefined,
    });
    setBizSaved(issues.length === 0);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pethommie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    markBackedUp(account.id);
  }

  return (
    <>
      <PageHeader art="app-hotel" title={t.settings.title} />

      {mode === "simple" && (
        <UpgradeCard
          onUpgrade={() => {
            setMode("advanced");
            navigate("/app/dashboard");
          }}
        />
      )}

      <form className="ds-form__section pg-settings" onSubmit={save} noValidate>
        <Heading level={2} size="md">{t.settings.hotel}</Heading>
        <Field label={t.onboarding.hotel.name} error={errors.name}>
          <Input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
        </Field>
        <div className="ds-form__row">
          <Field label={t.onboarding.hotel.city} optional={t.common.optional}>
            <Input value={city} onChange={(e) => (setCity(e.target.value), setSaved(false))} />
          </Field>
          <Field label={t.onboarding.hotel.whatsapp} error={errors.wa} optional={t.common.optional}>
            <Input value={wa} onChange={(e) => (setWa(e.target.value), setSaved(false))} inputMode="tel" />
          </Field>
        </div>
        <div className="ds-form__actions">
          {saved && <Alert tone="ok">{t.settings.saved}</Alert>}
          <span className="ds-form__spacer" />
          <Button type="submit" icon="check">
            {t.common.save}
          </Button>
        </div>
      </form>

      <form className="ds-form__section pg-settings" onSubmit={saveBusiness} noValidate id="business">
        <Heading level={2} size="md">{t.settingsBiz.title}</Heading>
        <Muted>{t.settingsBiz.lead}</Muted>
        <Field label={t.settingsBiz.legalName} optional={t.common.optional}>
          <Input value={draft.legalName} placeholder={t.settingsBiz.legalNamePh} onChange={(e) => edit({ legalName: e.target.value })} />
        </Field>
        <Field label={t.settingsBiz.address} optional={t.common.optional}>
          <Input value={draft.address} onChange={(e) => edit({ address: e.target.value })} />
        </Field>
        <div className="ds-form__row">
          <Field label={t.settingsBiz.npwp} hint={t.settingsBiz.npwpHint} optional={t.common.optional}>
            <Input value={draft.npwp} inputMode="numeric" onChange={(e) => edit({ npwp: e.target.value })} />
          </Field>
          <Field label={t.settingsBiz.prefix} hint={t.settingsBiz.prefixHint(`${draft.invoicePrefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "INV"}-${new Date().getFullYear()}-0001`)} error={bizErrors.prefix}>
            <Input value={draft.invoicePrefix} onChange={(e) => edit({ invoicePrefix: e.target.value })} />
          </Field>
        </div>
        <Field label={t.settingsBiz.payment} optional={t.common.optional}>
          <Textarea rows={3} value={draft.paymentInstructions} placeholder={t.settingsBiz.paymentPh} onChange={(e) => edit({ paymentInstructions: e.target.value })} />
        </Field>
        <Field label={t.unitTerm.label} hint={t.unitTerm.hint}>
          <Select value={draft.unitTerm} onChange={(e) => edit({ unitTerm: e.target.value as HotelSettings["unitTerm"] })}>
            {(["cage", "room", "space"] as const).map((u) => (
              <option key={u} value={u}>{t.unitTerm.options[u]}</option>
            ))}
          </Select>
        </Field>
        <Checkbox label={t.vaccineRule.label} checked={draft.requireVaccine} onChange={(e) => edit({ requireVaccine: e.target.checked })} />
        <Muted>{t.vaccineRule.hint}</Muted>
        <Field label={t.settingsBiz.language}>
          <Select value={draft.invoiceLanguage} onChange={(e) => edit({ invoiceLanguage: e.target.value as Language })}>
            <option value="id">{t.settingsBiz.languages.id}</option>
            <option value="en">{t.settingsBiz.languages.en}</option>
          </Select>
        </Field>

        <div id="tax">
          <Heading level={2} size="md">{t.settingsTax.title}</Heading>
        </div>
        <Muted>{t.settingsTax.lead}</Muted>
        <div className="ds-form__row">
          <Field label={t.settingsTax.regime}>
            <Select value={draft.tax.regime} onChange={(e) => editTax({ regime: e.target.value as HotelSettings["tax"]["regime"] })}>
              {(["none", "final_umkm", "general"] as const).map((r) => (
                <option key={r} value={r}>{t.settingsTax.regimes[r]}</option>
              ))}
            </Select>
          </Field>
          <Field label={t.settingsTax.taxpayer}>
            <Select value={draft.tax.taxpayer} onChange={(e) => editTax({ taxpayer: e.target.value as HotelSettings["tax"]["taxpayer"] })}>
              {(["individual", "other"] as const).map((r) => (
                <option key={r} value={r}>{t.settingsTax.taxpayers[r]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t.settingsTax.basis} hint={t.settingsTax.basisHint}>
          <Select value={draft.tax.basis} onChange={(e) => editTax({ basis: e.target.value as HotelSettings["tax"]["basis"] })}>
            {(["cash", "accrual"] as const).map((r) => (
              <option key={r} value={r}>{t.settingsTax.bases[r]}</option>
            ))}
          </Select>
        </Field>
        <Checkbox label={t.settingsTax.pkp} checked={draft.tax.pkp} onChange={(e) => editTax({ pkp: e.target.checked })} />
        <Muted>{t.settingsTax.pkpHint}</Muted>
        {draft.tax.pkp && (
          <>
            <Field label={t.settingsTax.ppn} hint={t.settingsTax.ppnHint} error={bizErrors.ppn}>
              <Input value={ppnText} inputMode="decimal" onChange={(e) => (setPpnText(e.target.value), setBizSaved(false))} />
            </Field>
            <Checkbox label={t.settingsTax.includes} checked={draft.tax.pricesIncludeTax} onChange={(e) => editTax({ pricesIncludeTax: e.target.checked })} />
          </>
        )}
        <div className="ds-form__actions">
          {bizSaved && <Alert tone="ok">{t.settingsBiz.saved}</Alert>}
          <span className="ds-form__spacer" />
          <Button type="submit" icon="check">
            {t.settingsBiz.save}
          </Button>
        </div>
      </form>

      <section className="ds-form__section pg-settings">
        <Heading level={2} size="md">{t.auth.accountTitle}</Heading>
        <Muted>
          {t.auth.signedInAs} <b>{account.name}</b> · {account.email}
        </Muted>
        <div>
          <Button
            variant="secondary"
            icon="logout"
            onClick={async () => {
              await logout();
              navigate("/app/login", { replace: true });
            }}
          >
            {t.nav.logout}
          </Button>
        </div>
      </section>

      <section className="ds-form__section pg-settings">
        <Heading level={2} size="md">{t.mode.label}</Heading>
        <ModeSwitch lead />
        <Muted>{t.mode.note}</Muted>
      </section>

      <section className="ds-form__section pg-settings">
        <Heading level={2} size="md">{t.settings.language}</Heading>
        <div>
          <LanguageSwitch label={t.settings.language} />
        </div>
      </section>

      <section className="ds-form__section pg-settings" id="data">
        <Heading level={2} size="md">{t.settings.data}</Heading>
        <Muted>{t.settings.dataLead}</Muted>
        <div className="ds-form__actions">
          <Button variant="secondary" icon="download" onClick={exportJson}>
            {t.settings.export}
          </Button>
          <Button variant="secondary" icon="upload" onClick={() => fileInput.current?.click()}>
            {t.settings.import}
          </Button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden aria-label={t.settings.import} onChange={(e) => void pickBackup(e.target.files?.[0])} />
          <Button variant="secondary" onClick={() => setConfirm("sample")}>
            {t.settings.loadSample}
          </Button>
          <Button variant="danger" icon="trash" onClick={() => setConfirm("reset")}>
            {t.settings.reset}
          </Button>
        </div>
        {restore.status === "bad" && <Alert tone="danger">{t.settings.importBad}</Alert>}
        {restore.status === "newer" && <Alert tone="danger">{t.settings.importNewer}</Alert>}
        {restore.status === "done" && <Alert tone="ok">{t.settings.importDone}</Alert>}
      </section>

      <ConfirmDialog
        open={restore.status === "ask"}
        message={t.settings.importConfirm}
        confirmLabel={t.settings.import}
        cancelLabel={t.confirm.no}
        danger
        onCancel={() => setRestore({ status: "idle" })}
        onConfirm={() => {
          if (restore.status === "ask") importData(restore.data);
          setRestore({ status: "done" });
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        message={confirm === "reset" ? t.settings.confirmReset : t.settings.confirmSample}
        confirmLabel={t.confirm.yes}
        cancelLabel={t.confirm.no}
        danger={confirm === "reset"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "reset") {
            reset();
            navigate("/app/onboarding");
          } else {
            loadSample(mode);
            navigate("/app");
          }
          setConfirm(null);
        }}
      />
    </>
  );
}
