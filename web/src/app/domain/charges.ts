import type { Charge } from "./types";

/** Add-ons and discounts on a stay: grooming, pickup, an extra pet, a Lebaran surcharge, a loyalty discount. */

export type ChargeIssue = "booking" | "locked" | "label" | "amount";

export const MAX_LABEL = 80;

/** A label with words in it, and a whole number of rupiah that is not zero: positive adds to the price, negative takes off. */
export function chargeIssues(charge: Pick<Charge, "label" | "amount">): ChargeIssue[] {
  const issues: ChargeIssue[] = [];
  if (!charge.label.trim() || charge.label.trim().length > MAX_LABEL) issues.push("label");
  if (!Number.isInteger(charge.amount) || charge.amount === 0) issues.push("amount");
  return issues;
}

/** Common add-ons, offered as suggestions while typing. The words are the operator's to change. */
export const CHARGE_SUGGESTIONS: Record<"id" | "en", string[]> = {
  id: ["Grooming", "Antar jemput", "Obat / perawatan", "Hewan tambahan", "Biaya musim Lebaran", "Diskon langganan"],
  en: ["Grooming", "Pickup and delivery", "Medication / care", "Extra pet", "Lebaran season fee", "Regular customer discount"],
};
