import type { EmailEnv } from "../env.js";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

/**
 * One email through Resend's HTTP API (no SDK: it's a single POST, and api/_lib already has `fetch` as a
 * dependency handlers can fake in tests). Throws with Resend's own message on a non-2xx answer.
 */
export async function sendEmail(fetchImpl: typeof fetch, env: EmailEnv, msg: EmailMessage): Promise<void> {
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend answered ${res.status}: ${body.slice(0, 300)}`);
  }
}
