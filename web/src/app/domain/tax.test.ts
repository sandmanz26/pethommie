import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { dueDateFor, FINAL_SCHEME_CEILING, taxCsv, taxFor } from "./tax";
import { defaultSettings, type HotelData, type Invoice, type TaxProfile } from "./types";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10).toISOString();
const pay = (y: number, m: number, d: number, amount: number) => ({ id: `${y}-${m}-${d}-${amount}`, at: day(y, m, d), amount, method: "transfer" as const, note: "" });
const settings = (tax: Partial<TaxProfile>) => ({ ...defaultSettings(), tax: { ...defaultSettings().tax, ...tax } });

/** A hotel whose money came in as these (month, rupiah) payments, all in 2026. */
const received = (taxOver: Partial<TaxProfile>, ...payments: [number, number][]): HotelData =>
  aSmallHotel({
    cages: [aCage("s1")],
    owners: [anOwner("o1")],
    pets: [aPet("p1", "o1")],
    bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-01-01", checkOut: "2026-01-02", status: "checked_out", payments: payments.map(([m, a], i) => pay(2026, m, 5 + i, a)) })],
    settings: settings(taxOver),
  });

const JT = 1_000_000;

describe("the final scheme (0.5%) for an individual", () => {
  const data = received({ regime: "final_umkm", taxpayer: "individual", basis: "cash" }, [1, 300 * JT], [2, 300 * JT], [3, 100 * JT]);
  const y = taxFor(data, 2026);

  it("pays nothing while the year's turnover is within the first Rp500 million", () => {
    expect(y.months[0]).toMatchObject({ turnover: 300 * JT, cumulative: 300 * JT, taxable: 0, pph: 0 });
  });

  it("pays 0.5% only on the part above it, in the month it is passed", () => {
    expect(y.months[1]).toMatchObject({ cumulative: 600 * JT, taxable: 100 * JT, pph: 500_000 });
  });

  it("pays 0.5% on all of a later month's turnover", () => {
    expect(y.months[2]).toMatchObject({ cumulative: 700 * JT, taxable: 100 * JT, pph: 500_000 });
    expect(y.pph).toBe(1_000_000);
    expect(y.turnover).toBe(700 * JT);
  });

  it("matches the example in the sources: Rp540 million by September means Rp200.000", () => {
    const d = received({ regime: "final_umkm", taxpayer: "individual", basis: "cash" }, [1, 500 * JT], [9, 40 * JT]);
    expect(taxFor(d, 2026).months[8]).toMatchObject({ cumulative: 540 * JT, taxable: 40 * JT, pph: 200_000 });
  });

  it("says when each month's tax is due: the 15th of the next month, across a year end too", () => {
    expect(y.months[0].dueOn).toBe("2026-02-15");
    expect(y.months[11].dueOn).toBe("2027-01-15");
    expect(dueDateFor(2026, 2)).toBe("2026-03-15");
  });
});

describe("other taxpayers on the final scheme", () => {
  it("get no exempt part: 0.5% from the first rupiah", () => {
    const y = taxFor(received({ regime: "final_umkm", taxpayer: "other", basis: "cash" }, [1, 300 * JT]), 2026);
    expect(y.months[0]).toMatchObject({ taxable: 300 * JT, pph: 1_500_000 });
  });
});

describe("a hotel without the final scheme", () => {
  it("still gets its turnover listed, with no tax worked out", () => {
    for (const regime of ["none", "general"] as const) {
      const y = taxFor(received({ regime }, [1, 600 * JT]), 2026);
      expect(y.months[0]).toMatchObject({ turnover: 600 * JT, pph: 0 });
      expect(y.pph).toBe(0);
    }
  });
});

describe("which turnover is used", () => {
  const hotel = (basis: TaxProfile["basis"]) => {
    const d = received({ regime: "final_umkm", taxpayer: "other", basis }, [3, 50_000]); // money received in March
    // a stay worth 3 nights x 50.000 finishing in April
    d.bookings.push(aBooking("b2", { petId: "p1", cageId: "s1", checkIn: "2026-04-01", checkOut: "2026-04-04", status: "checked_out" }));
    return d;
  };

  it("is money received in the month by cash, and stays finished in the month by accrual", () => {
    const cash = taxFor(hotel("cash"), 2026);
    expect([cash.months[2].turnover, cash.months[3].turnover]).toEqual([50_000, 0]);
    const accrual = taxFor(hotel("accrual"), 2026);
    expect([accrual.months[2].turnover, accrual.months[3].turnover]).toEqual([0, 150_000]);
  });

  it("shows both, whichever is chosen", () => {
    const m = taxFor(hotel("cash"), 2026).months;
    expect([m[2].turnoverCash, m[3].turnoverAccrual]).toEqual([50_000, 150_000]);
  });

  it("counts a stay in the month it ended, not started, and only once finished", () => {
    const d = hotel("accrual");
    d.bookings.push(aBooking("b3", { petId: "p1", cageId: "s1", checkIn: "2026-04-28", checkOut: "2026-05-02", status: "checked_in" }));
    d.bookings.push(aBooking("b4", { petId: "p1", cageId: "s1", checkIn: "2026-04-28", checkOut: "2026-05-02", status: "cancelled" }));
    expect(taxFor(d, 2026).months[4].turnover).toBe(0);
  });

  it("leaves out other years", () => {
    expect(taxFor(hotel("cash"), 2025).turnover).toBe(0);
    expect(taxFor(hotel("cash"), 2027).turnover).toBe(0);
  });
});

describe("a VAT payer (PKP)", () => {
  it("counts turnover without the tax that was in the money", () => {
    const y = taxFor(received({ regime: "final_umkm", taxpayer: "other", basis: "cash", pkp: true, ppnPercent: 11 }, [1, 111_000]), 2026);
    expect(y.months[0].turnover).toBe(100_000);
  });

  it("takes the VAT out of a price list that includes it, for the stays basis", () => {
    const d = received({ regime: "none", basis: "accrual", pkp: true, ppnPercent: 11, pricesIncludeTax: true });
    d.bookings[0] = { ...d.bookings[0], checkIn: "2026-05-01", checkOut: "2026-05-03", payments: [], charges: [{ id: "c", label: "x", amount: 11_000 }] }; // 100.000 + 11.000, tax inside
    expect(taxFor(d, 2026).months[4].turnoverAccrual).toBe(100_000);
  });

  const inv = (number: string, issuedOn: string, subtotal: number, taxAmount: number, status: Invoice["status"] = "issued") => ({ number, issuedOn, subtotal, taxAmount, total: subtotal + taxAmount, status }) as Invoice;

  it("sums the VAT on the month's invoices, voided ones left out", () => {
    const d = received({ regime: "none", pkp: true });
    d.invoices = [inv("A", "2026-03-02", 100_000, 11_000), inv("B", "2026-03-20", 200_000, 22_000), inv("C", "2026-03-21", 500_000, 55_000, "void"), inv("D", "2026-04-01", 10_000, 1_100)];
    const y = taxFor(d, 2026);
    expect(y.months[2]).toMatchObject({ ppnBase: 300_000, ppn: 33_000, invoices: 2 });
    expect(y.months[3]).toMatchObject({ ppnBase: 10_000, ppn: 1_100, invoices: 1 });
    expect(y.ppn).toBe(34_100);
  });
});

describe("the Rp4.8 billion ceiling", () => {
  it("is ok, then near at 80%, then over at 100%", () => {
    const at = (share: number) => taxFor(received({ regime: "final_umkm" }, [1, Math.round(FINAL_SCHEME_CEILING * share)]), 2026);
    expect(at(0.5).ceiling).toBe("ok");
    expect(at(0.8).ceiling).toBe("near");
    expect(at(0.99).ceiling).toBe("near");
    expect(at(1).ceiling).toBe("over");
    expect(at(0.5).ceilingUsed).toBeCloseTo(0.5);
  });
});

describe("taxCsv", () => {
  it("is a row per month with the figures and what they were worked out with", () => {
    const d = received({ regime: "final_umkm", taxpayer: "other", basis: "cash" }, [1, 100 * JT]);
    const lines = taxCsv(taxFor(d, 2026), d.settings.tax).trim().split("\r\n");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toContain("pph_final_estimate");
    expect(lines[1]).toBe("2026-01,100000000,50000,100000000,100000000,100000000,500000,2026-02-15,0,0,0,cash,final_umkm");
  });
});
