import type { Language } from "./types";

/** An amount of rupiah written out, as on a receipt: "seratus lima puluh ribu rupiah", "one hundred fifty thousand rupiah". */

const ID_ONES = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function idWords(n: number): string {
  if (n < 12) return ID_ONES[n];
  if (n < 20) return `${ID_ONES[n - 10]} belas`;
  if (n < 100) return join(`${ID_ONES[Math.floor(n / 10)]} puluh`, idWords(n % 10));
  if (n < 200) return join("seratus", idWords(n - 100));
  if (n < 1000) return join(`${ID_ONES[Math.floor(n / 100)]} ratus`, idWords(n % 100));
  if (n < 2000) return join("seribu", idWords(n - 1000));
  for (const [size, name] of [[1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"]] as const) {
    if (n >= size) return join(`${idWords(Math.floor(n / size))} ${name}`, idWords(n % size));
  }
  return "";
}

const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enWords(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) return EN_TENS[Math.floor(n / 10)] + (n % 10 ? `-${EN_ONES[n % 10]}` : "");
  if (n < 1000) return join(`${EN_ONES[Math.floor(n / 100)]} hundred`, enWords(n % 100));
  for (const [size, name] of [[1e12, "trillion"], [1e9, "billion"], [1e6, "million"], [1e3, "thousand"]] as const) {
    if (n >= size) return join(`${enWords(Math.floor(n / size))} ${name}`, enWords(n % size));
  }
  return "";
}

const join = (a: string, b: string) => (b ? `${a} ${b}` : a);

export function amountInWords(amount: number, language: Language): string {
  const n = Math.floor(Math.abs(amount));
  const words = n === 0 ? (language === "id" ? "nol" : "zero") : language === "id" ? idWords(n) : enWords(n);
  const text = `${words} rupiah`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
