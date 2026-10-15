/** Indonesian WhatsApp numbers. Stored as 62xxxxxxxxxx, shown as 0812 3456 7890. */

/** Normalises to 62xxxxxxxxxx; returns null if it doesn't look like an Indonesian mobile number. */
export function normaliseWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return /^628\d{7,11}$/.test(digits) ? digits : null;
}

/** 6281234567890 → 0812 3456 7890. Empty stays empty. */
export function formatWhatsapp(normalised: string) {
  if (!normalised) return "";
  const local = "0" + normalised.slice(2);
  return local.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3");
}
