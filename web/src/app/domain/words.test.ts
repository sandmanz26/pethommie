import { describe, expect, it } from "vitest";
import { amountInWords } from "./words";

describe("amountInWords", () => {
  it.each([
    [0, "Nol rupiah"],
    [11, "Sebelas rupiah"],
    [15, "Lima belas rupiah"],
    [100, "Seratus rupiah"],
    [1_000, "Seribu rupiah"],
    [1_500, "Seribu lima ratus rupiah"],
    [21_000, "Dua puluh satu ribu rupiah"],
    [150_000, "Seratus lima puluh ribu rupiah"],
    [1_250_000, "Satu juta dua ratus lima puluh ribu rupiah"],
    [2_011_000_000, "Dua miliar sebelas juta rupiah"],
  ])("writes %i in Indonesian", (n, words) => {
    expect(amountInWords(n, "id")).toBe(words);
  });

  it.each([
    [0, "Zero rupiah"],
    [45, "Forty-five rupiah"],
    [150_000, "One hundred fifty thousand rupiah"],
    [1_250_000, "One million two hundred fifty thousand rupiah"],
  ])("writes %i in English", (n, words) => {
    expect(amountInWords(n, "en")).toBe(words);
  });
});
