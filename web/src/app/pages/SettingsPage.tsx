import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { formatWhatsapp, normaliseWhatsapp } from "@/shared/lib/phone";
import { useAccount, useAuth } from "@/app/auth/AuthProvider";
import { useStore } from "@/app/store/AppStore";
import { parseStored } from "@/app/store/storage";
import { useAppT } from "@/app/i18n/useAppT";
import { LanguageSwitch } from "@/shared/ui/LanguageSwitch";
import { Button } from "@/app/design-system/atoms/Button";
import { Input } from "@/app/design-system/atoms/Input";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { ModeSwitch } from "@/app/design-system/molecules/ModeSwitch";
import { ConfirmDialog } from "@/app/design-system/molecules/ConfirmDialog";
import { Field } from "@/app/design-system/molecules/Field";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

export function SettingsPage() {
  const { data, setHotel, loadSample, reset, importData } = useStore();
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

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pethommie-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title={t.settings.title} />

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

      <section className="ds-form__section pg-settings">
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
            loadSample();
            navigate("/app");
          }
          setConfirm(null);
        }}
      />
    </>
  );
}
