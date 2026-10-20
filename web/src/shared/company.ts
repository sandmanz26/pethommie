/**
 * Who is behind the product, as shown in the footer, the legal pages and the Help page. The contact details are
 * set per deployment (Vercel environment variables), because they are the owner's to choose and are not
 * in the code. Anything left empty is simply not shown.
 */
export const company = {
  /** Shown as the copyright holder. */
  name: import.meta.env.VITE_COMPANY_NAME || "Pethommie",
  email: import.meta.env.VITE_CONTACT_EMAIL || "",
  /** International digits without "+", e.g. 6281234567890. */
  whatsapp: (import.meta.env.VITE_CONTACT_WHATSAPP || "").replace(/\D/g, ""),
  /** First year of the product; the footer shows "first–current". */
  sinceYear: 2026,
};

/** "2026" in the first year, "2026–2028" afterwards. */
export function copyrightYears(now: Date = new Date()): string {
  const y = now.getFullYear();
  return y <= company.sinceYear ? String(company.sinceYear) : `${company.sinceYear}–${y}`;
}
