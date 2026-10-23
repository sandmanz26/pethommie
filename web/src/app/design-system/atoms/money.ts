/** Digits only, grouped in thousands with dots, the Indonesian way: "1500000" or "1.500.000" → "1.500.000". */
export function groupDigits(text: string): string {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
