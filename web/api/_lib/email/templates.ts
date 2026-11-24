/** The payload a notification_outbox row of kind 'booking_request' carries (see migration 0008's trigger). */
export type BookingRequestPayload = {
  request_id: string;
  owner_name: string;
  owner_wa: string;
  pet_name: string;
  species: "cat" | "dog" | "rabbit" | "other";
  breed: string;
  check_in: string;
  check_out: string;
  preference: string;
  notes: string;
  locale: "id" | "en";
};

const SPECIES = {
  id: { cat: "kucing", dog: "anjing", rabbit: "kelinci", other: "peliharaan" },
  en: { cat: "cat", dog: "dog", rabbit: "rabbit", other: "pet" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The email a hotel's owner gets for one new request from their public booking link. `locale` is the request's own
 * (the language the link itself was set in), which is the owner's language far more often than not — there's no
 * separate "the owner's preferred language" setting to ask instead.
 */
export function bookingRequestEmail(hotelName: string, p: BookingRequestPayload, appUrl: string) {
  const locale = p.locale === "en" ? "en" : "id";
  const species = SPECIES[locale][p.species];
  const requestsUrl = `${appUrl}/app/bookings?request=${p.request_id}`;
  const subject = locale === "en" ? `New booking request — ${p.pet_name} (${hotelName})` : `Permintaan booking baru — ${p.pet_name} (${hotelName})`;
  const rows: [string, string][] =
    locale === "en"
      ? [
          ["From", p.owner_name],
          ["WhatsApp", p.owner_wa],
          ["Pet", `${p.pet_name} — ${species}${p.breed ? `, ${p.breed}` : ""}`],
          ["Dates", `${p.check_in} to ${p.check_out}`],
          ...(p.preference ? ([["Preference", p.preference]] as [string, string][]) : []),
          ...(p.notes ? ([["Notes", p.notes]] as [string, string][]) : []),
        ]
      : [
          ["Dari", p.owner_name],
          ["WhatsApp", p.owner_wa],
          ["Anabul", `${p.pet_name} — ${species}${p.breed ? `, ${p.breed}` : ""}`],
          ["Tanggal", `${p.check_in} s/d ${p.check_out}`],
          ...(p.preference ? ([["Pilihan", p.preference]] as [string, string][]) : []),
          ...(p.notes ? ([["Catatan", p.notes]] as [string, string][]) : []),
        ];
  const lead =
    locale === "en"
      ? "Someone asked for a stay through your booking link. Nothing is booked yet — reply on WhatsApp or open it in Siomofu."
      : "Ada yang minta menginap lewat link booking-mu. Belum ada yang dibooking — balas lewat WhatsApp atau buka di Siomofu.";
  const cta = locale === "en" ? "Open in Siomofu" : "Buka di Siomofu";
  const text = [subject, "", lead, "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `${cta}: ${requestsUrl}`].join("\n");
  const html = `<!doctype html><html><body style="font-family:sans-serif;color:#2a2420;max-width:480px;margin:0 auto;padding:24px 16px">
    <h1 style="font-size:18px;margin:0 0 8px">${esc(subject)}</h1>
    <p style="color:#6b6258;margin:0 0 20px">${esc(lead)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b6258;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="margin:24px 0 0"><a href="${esc(requestsUrl)}" style="background:#b8321f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${esc(cta)}</a></p>
  </body></html>`;
  return { subject, html, text };
}
