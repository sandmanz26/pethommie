import { change } from "@/app/domain/reports";
import type { Trend } from "@/app/design-system/molecules/StatCard";

/** "+12%" style text for a change, and whether it is good news. Null when there is nothing to compare with. */
export function trendOf(now: number, before: number, locale: string, words: (pct: string) => string, higherIsGood = true): Trend | undefined {
  const c = change(now, before);
  if (c === null) return undefined;
  const pct = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(c);
  const direction = Math.abs(c) < 0.005 ? "flat" : c > 0 ? "up" : "down";
  return { text: words(pct), direction, good: direction === "flat" ? null : (direction === "up") === higherIsGood };
}

export const percentOf = (x: number, locale: string) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { style: "percent", maximumFractionDigits: 0 }).format(x);

/** Downloads text as a UTF-8 CSV a spreadsheet opens with the right characters. */
export function downloadCsv(name: string, csv: string) {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
