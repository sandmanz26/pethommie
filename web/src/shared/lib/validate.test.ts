import { describe, expect, it } from "vitest";
import { dateIssue, intIssue, isValidEmail, isValidISODate, isValidNpwp, isValidTime, moneyIssue, parseRupiah, textIssue } from "./validate";

describe("textIssue", () => {
  it("requires, trims, and bounds length", () => {
    expect(textIssue("   ", { required: true })).toBe("required");
    expect(textIssue("", { min: 2 })).toBeNull();
    expect(textIssue(" a ", { min: 2 })).toBe("tooShort");
    expect(textIssue("ab", { min: 2, max: 3 })).toBeNull();
    expect(textIssue("abcd", { max: 3 })).toBe("tooLong");
  });
});

describe("parseRupiah / moneyIssue", () => {
  it("reads common ways of typing rupiah", () => {
    expect(parseRupiah("75000")).toBe(75000);
    expect(parseRupiah("75.000")).toBe(75000);
    expect(parseRupiah("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiah("75,000")).toBe(75000);
    expect(parseRupiah("")).toBeNull();
  });
  it("rejects letters, signs and decimals", () => {
    expect(parseRupiah("12a")).toBeNaN();
    expect(parseRupiah("-500")).toBeNaN();
    expect(parseRupiah("75.5")).toBeNaN();
  });
  it("checks required, zero and the upper bound", () => {
    expect(moneyIssue("", { required: true })).toBe("required");
    expect(moneyIssue("")).toBeNull();
    expect(moneyIssue("abc")).toBe("invalid");
    expect(moneyIssue("0")).toBe("zero");
    expect(moneyIssue("0", { allowZero: true })).toBeNull();
    expect(moneyIssue("100.000.000")).toBeNull();
    expect(moneyIssue("100.000.001")).toBe("tooLarge");
    expect(moneyIssue("500", { max: 400 })).toBe("tooLarge");
  });
});

describe("intIssue", () => {
  it("wants a whole number in range", () => {
    expect(intIssue("", 2, 50)).toBe("required");
    expect(intIssue("", 2, 50, false)).toBeNull();
    expect(intIssue("2.5", 2, 50)).toBe("invalid");
    expect(intIssue("1", 2, 50)).toBe("range");
    expect(intIssue("51", 2, 50)).toBe("range");
    expect(intIssue("6", 2, 50)).toBeNull();
  });
});

describe("dates and other formats", () => {
  it("accepts real days in sensible years only", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("0026-02-01")).toBe(false);
    expect(isValidISODate("20260-01-01")).toBe(false);
    expect(isValidISODate("2101-01-01")).toBe(false);
    expect(dateIssue("")).toBe("required");
    expect(dateIssue("", { required: false })).toBeNull();
    expect(dateIssue("2026-13-01")).toBe("invalid");
  });
  it("checks time, NPWP and email", () => {
    expect(isValidTime("08:30")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidNpwp("01.234.567.8-901.000")).toBe(true);
    expect(isValidNpwp("1234567890123456")).toBe(true);
    expect(isValidNpwp("12345")).toBe(false);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });
});
