import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/app/domain/logic";
import { useAuth } from "@/app/auth/AuthProvider";
import { useAppT } from "@/app/i18n/useAppT";
import { useSyncedRepository } from "@/app/sync/SyncContext";
import { getSupabase } from "@/app/supabase/client";
import { formatWhatsapp } from "@/shared/lib/phone";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import { Alert } from "@/app/design-system/molecules/Alert";
import { EmptyState } from "@/app/design-system/molecules/EmptyState";
import { PageHeader } from "@/app/design-system/organisms/PageHeader";
import "./pages.css";

type Species = "cat" | "dog" | "rabbit" | "other";
type Status = "new" | "claimed" | "dismissed";
type Row = {
  id: string;
  owner_name: string;
  owner_wa: string;
  pet_name: string;
  species: Species;
  breed: string;
  check_in: string;
  check_out: string;
  preference: string;
  notes: string;
  status: Status;
  created_at: string;
};

/**
 * Requests from the hotel's public booking link, for a synced hotel only: a local-only hotel's link has no server id
 * to attach these to (see web/src/shared/lib/bookingLink.ts, LinkCard.hid), so it keeps working exactly as before -
 * a WhatsApp message only, nothing to list here.
 */
export function RequestsPanel() {
  const { t, locale } = useAppT();
  const r = t.requestsPanel;
  const { account } = useAuth();
  const synced = useSyncedRepository();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const db = getSupabase();
    const hotelId = synced?.hotelId();
    if (!db || !hotelId) return;
    setError(false);
    db.from("booking_requests")
      .select("id, owner_name, owner_wa, pet_name, species, breed, check_in, check_out, preference, notes, status, created_at")
      .eq("hotel_id", hotelId)
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .then(({ data, error: e }: { data: Row[] | null; error: unknown }) => (e ? setError(true) : setRows(data ?? [])));
  }, [synced]);

  useEffect(() => void load(), [load]);

  async function setStatus(id: string, status: "claimed" | "dismissed") {
    const db = getSupabase();
    if (!db) return;
    setBusy(id);
    const patch = status === "claimed" ? { status, claimed_at: new Date().toISOString(), claimed_by: account?.id } : { status };
    const { error: e } = await db.from("booking_requests").update(patch).eq("id", id);
    setBusy(null);
    if (e) return setError(true);
    setRows((prev) => (status === "dismissed" ? (prev ?? []).filter((x) => x.id !== id) : (prev ?? []).map((x) => (x.id === id ? { ...x, status } : x))));
  }

  if (!synced) {
    return (
      <>
        <PageHeader title={r.title} lead={r.lead} />
        <EmptyState icon="whatsapp">{r.localOnly}</EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title={r.title} lead={r.lead} />
      {error && <Alert tone="danger">{r.error}</Alert>}
      <div className="pg-list">
        {rows === null ? (
          <Muted>{r.loading}</Muted>
        ) : rows.length === 0 ? (
          <EmptyState icon="whatsapp">{r.empty}</EmptyState>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="ds-panel">
              <div className="pg-panel__head">
                <Heading level={3} size="sm">
                  {row.pet_name} <Muted>· {r.species[row.species]}{row.breed ? ` · ${row.breed}` : ""}</Muted>
                </Heading>
                {row.status === "claimed" && <span className="ds-badge ds-badge--ok">{r.claimedBadge}</span>}
              </div>
              <Muted>
                {r.from}: {row.owner_name} · {formatWhatsapp(row.owner_wa)}
              </Muted>
              <Muted>
                {r.dates}: {formatDate(row.check_in, locale)} → {formatDate(row.check_out, locale)}
              </Muted>
              {row.preference && <Muted>{r.preference}: {row.preference}</Muted>}
              {row.notes && <Muted>{r.notes}: {row.notes}</Muted>}
              <div className="ds-form__actions">
                <Button variant="secondary" onClick={() => window.open(`https://wa.me/${row.owner_wa}`, "_blank", "noopener")}>
                  {r.whatsapp}
                </Button>
                {row.status !== "claimed" && (
                  <Button variant="secondary" onClick={() => void setStatus(row.id, "claimed")} disabled={busy === row.id}>
                    {r.claim}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => void setStatus(row.id, "dismissed")} disabled={busy === row.id}>
                  {r.dismiss}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
