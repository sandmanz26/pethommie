import { describe, expect, it } from "vitest";
import { aBooking, aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import { buildInvoice, defaultDueDate, invoiceOutdated, invoicePayment, invoicesIn, invoiceTotals, nextInvoiceNumber, registerSummary } from "./invoices";
import { defaultSettings, type HotelData, type Invoice, type TaxProfile } from "./types";

const tax = (over: Partial<TaxProfile> = {}): TaxProfile => ({ ...defaultSettings().tax, ...over });

describe("invoiceTotals", () => {
  const lines = [{ amount: 100_000 }, { amount: 50_000 }, { amount: -10_000 }]; // 140.000

  it("charges no tax unless the hotel is a VAT payer", () => {
    expect(invoiceTotals(lines, tax())).toEqual({ subtotal: 140_000, taxPercent: 0, taxAmount: 0, total: 140_000 });
    expect(invoiceTotals(lines, tax({ pkp: false, ppnPercent: 11 })).taxAmount).toBe(0);
  });

  it("adds the tax on top when prices are without tax", () => {
    expect(invoiceTotals(lines, tax({ pkp: true, ppnPercent: 11 }))).toEqual({ subtotal: 140_000, taxPercent: 11, taxAmount: 15_400, total: 155_400 });
  });

  it("finds the tax inside the price when prices include it, and the parts add up to the total", () => {
    const t = invoiceTotals([{ amount: 111_000 }], tax({ pkp: true, ppnPercent: 11, pricesIncludeTax: true }));
    expect(t).toEqual({ subtotal: 100_000, taxPercent: 11, taxAmount: 11_000, total: 111_000 });
    const odd = invoiceTotals([{ amount: 100_000 }], tax({ pkp: true, ppnPercent: 11, pricesIncludeTax: true }));
    expect(odd.subtotal + odd.taxAmount).toBe(odd.total);
    expect(odd.total).toBe(100_000);
  });

  it("works in whole rupiah", () => {
    const t = invoiceTotals([{ amount: 33_333 }], tax({ pkp: true, ppnPercent: 11 }));
    expect(Number.isInteger(t.taxAmount) && Number.isInteger(t.total)).toBe(true);
  });

  it("never goes below zero, and treats a zero rate as no tax", () => {
    expect(invoiceTotals([{ amount: -5 }], tax()).total).toBe(0);
    expect(invoiceTotals(lines, tax({ pkp: true, ppnPercent: 0 })).taxAmount).toBe(0);
  });
});

describe("nextInvoiceNumber", () => {
  const inv = (number: string) => ({ number }) as Invoice;

  it("starts at 0001 each year and goes one past the highest", () => {
    expect(nextInvoiceNumber([], "INV", 2026)).toBe("INV-2026-0001");
    expect(nextInvoiceNumber([inv("INV-2026-0001"), inv("INV-2026-0007")], "INV", 2026)).toBe("INV-2026-0008");
    expect(nextInvoiceNumber([inv("INV-2026-0007")], "INV", 2027)).toBe("INV-2027-0001");
  });

  it("counts voided numbers as used, because the list keeps them", () => {
    expect(nextInvoiceNumber([{ ...inv("INV-2026-0002"), status: "void" } as Invoice], "INV", 2026)).toBe("INV-2026-0003");
  });

  it("keeps prefixes apart, and cleans an odd prefix", () => {
    expect(nextInvoiceNumber([inv("INV-2026-0009")], "RM", 2026)).toBe("RM-2026-0001");
    expect(nextInvoiceNumber([], " rm-1! ", 2026)).toBe("RM1-2026-0001");
    expect(nextInvoiceNumber([], "!!!", 2026)).toBe("INV-2026-0001");
  });

  it("goes past 9999 without breaking", () => {
    expect(nextInvoiceNumber([inv("INV-2026-9999")], "INV", 2026)).toBe("INV-2026-10000");
  });
});

describe("buildInvoice", () => {
  const base = (over: Partial<HotelData> = {}): HotelData =>
    aSmallHotel({
      cages: [aCage("s1")],
      owners: [anOwner("o1", "6281234567890", "en")],
      pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o1", { name: "Boba" })],
      bookings: [
        aBooking("b1", {
          petId: "p1",
          companionIds: ["p2"],
          cageId: "s1",
          checkIn: "2026-10-14",
          checkOut: "2026-10-17",
          status: "checked_out",
          charges: [{ id: "c1", label: "Grooming", amount: 75_000 }, { id: "c2", label: "Diskon langganan", amount: -25_000 }],
        }),
      ],
      settings: { ...defaultSettings(), legalName: "CV Meong", address: "Jl. Meong 1", npwp: "12.345.678.9-012.000", paymentInstructions: "BCA 123" },
      ...over,
    });
  const make = (d: HotelData, req: Partial<Parameters<typeof buildInvoice>[2]> = {}) => buildInvoice(d, "b1", { id: "i1", issuedOn: "2026-10-17", ...req });

  it("copies the stay, the owner and the hotel into the invoice, with a number", () => {
    const r = make(base());
    if (!("invoice" in r)) throw new Error("no invoice");
    const i = r.invoice;
    expect(i).toMatchObject({
      number: "INV-2026-0001",
      status: "issued",
      customer: { name: "Owner o1", whatsapp: "6281234567890" },
      petNames: "Mochi & Boba",
      stay: { checkIn: "2026-10-14", checkOut: "2026-10-17", nights: 3, cageName: "S1" },
      seller: { name: "Rumah Meong", legalName: "CV Meong", npwp: "12.345.678.9-012.000", paymentInstructions: "BCA 123" },
      subtotal: 200_000,
      taxAmount: 0,
      total: 200_000,
    });
  });

  it("has a line for the nights and one for each charge, in the invoice's language", () => {
    const en = make(base(), { language: "en" });
    const id = make(base(), { language: "id" });
    if (!("invoice" in en) || !("invoice" in id)) throw new Error("no invoice");
    expect(en.invoice.lines.map((l) => [l.label, l.quantity, l.unitPrice, l.amount])).toEqual([
      ["Boarding Mochi & Boba · cage S1", 3, 50_000, 150_000],
      ["Grooming", 1, 75_000, 75_000],
      ["Diskon langganan", 1, -25_000, -25_000],
    ]);
    expect(id.invoice.lines[0].label).toBe("Penitipan Mochi & Boba · kandang S1");
  });

  it("uses the hotel's default language unless told otherwise", () => {
    const d = base({ settings: { ...defaultSettings(), invoiceLanguage: "en" } });
    expect(make(d)).toMatchObject({ invoice: { language: "en" } });
  });

  it("carries the tax the hotel is set up for", () => {
    const d = base({ settings: { ...defaultSettings(), tax: tax({ pkp: true, ppnPercent: 11 }) } });
    expect(make(d)).toMatchObject({ invoice: { subtotal: 200_000, taxPercent: 11, taxAmount: 22_000, total: 222_000, pricesIncludeTax: false } });
  });

  it("numbers on from the invoices already made", () => {
    const first = make(base());
    if (!("invoice" in first)) throw new Error();
    const d = base({ invoices: [{ ...first.invoice, bookingId: "other" }] });
    expect(make(d)).toMatchObject({ invoice: { number: "INV-2026-0002" } });
  });

  it("refuses what can't be invoiced", () => {
    expect(buildInvoice(base(), "ghost", { id: "x", issuedOn: "2026-10-17" })).toEqual({ issues: ["booking"] });
    expect(make(base({ hotel: null }))).toEqual({ issues: ["hotel"] });
    const cancelled = base();
    cancelled.bookings[0] = { ...cancelled.bookings[0], status: "cancelled" };
    expect(make(cancelled)).toEqual({ issues: ["cancelled"] });
    expect(make(base({ cages: [] }))).toEqual({ issues: ["cage"] });
  });

  it("allows one live invoice per stay, and another once it is voided", () => {
    const first = make(base());
    if (!("invoice" in first)) throw new Error();
    expect(make(base({ invoices: [first.invoice] }))).toEqual({ issues: ["exists"] });
    expect(make(base({ invoices: [{ ...first.invoice, status: "void", voidedOn: "2026-10-18" }] }))).toMatchObject({ invoice: { number: "INV-2026-0002" } });
  });
});

describe("what an invoice says about its stay", () => {
  const d = (): HotelData => {
    const data = aSmallHotel({ cages: [aCage("s1")], bookings: [aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-14", checkOut: "2026-10-16", status: "checked_out", payments: [{ id: "p", at: "2026-10-16T08:00:00.000Z", amount: 40_000, method: "cash", kind: "payment" as const, reference: "", note: "" }] })] });
    const r = buildInvoice(data, "b1", { id: "i1", issuedOn: "2026-10-16" });
    if (!("invoice" in r)) throw new Error();
    return { ...data, invoices: [r.invoice] };
  };

  it("is unpaid, part paid or paid by the stay's payments", () => {
    const data = d(); // total 100.000
    expect(invoicePayment(data, data.invoices[0])).toBe("partial");
    data.bookings[0].payments.push({ id: "q", at: "2026-10-16T09:00:00.000Z", amount: 60_000, method: "qris", kind: "payment" as const, reference: "", note: "" });
    expect(invoicePayment(data, data.invoices[0])).toBe("paid");
    data.bookings[0].payments = [];
    expect(invoicePayment(data, data.invoices[0])).toBe("unpaid");
  });

  it("is unknown once the stay's record is gone, and the invoice is still there", () => {
    const data = d();
    expect(invoicePayment({ ...data, bookings: [] }, data.invoices[0])).toBe("unknown");
  });

  it("is out of date when a charge is added after it was made, but not otherwise", () => {
    const data = d();
    expect(invoiceOutdated(data, data.invoices[0])).toBe(false);
    data.bookings[0] = { ...data.bookings[0], charges: [{ id: "c", label: "Extra", amount: 10_000 }] };
    expect(invoiceOutdated(data, data.invoices[0])).toBe(true);
    expect(invoiceOutdated(data, { ...data.invoices[0], status: "void" })).toBe(false);
  });
});

describe("the monthly register", () => {
  const inv = (number: string, issuedOn: string, total: number, status: "issued" | "void" = "issued"): Invoice =>
    ({ number, issuedOn, subtotal: total - 10, taxAmount: 10, total, status }) as Invoice;
  const all = [inv("INV-2026-0003", "2026-10-20", 300), inv("INV-2026-0001", "2026-10-02", 100), inv("INV-2026-0002", "2026-10-10", 200, "void"), inv("INV-2026-0004", "2026-11-01", 400)];

  it("lists the month's invoices in number order", () => {
    expect(invoicesIn(all, "2026-10").map((i) => i.number)).toEqual(["INV-2026-0001", "INV-2026-0002", "INV-2026-0003"]);
    expect(invoicesIn(all, "2026-12")).toEqual([]);
  });

  it("adds up the live ones, and counts the voided apart", () => {
    expect(registerSummary(invoicesIn(all, "2026-10"))).toEqual({ count: 2, voided: 1, subtotal: 380, tax: 20, total: 400 });
    expect(registerSummary([])).toEqual({ count: 0, voided: 0, subtotal: 0, tax: 0, total: 0 });
  });
});

describe("defaultDueDate", () => {
  it("is a week after the stay ends, or after the issue date if that is later", () => {
    expect(defaultDueDate({ checkOut: "2026-10-20" }, "2026-10-17")).toBe("2026-10-27");
    expect(defaultDueDate({ checkOut: "2026-10-10" }, "2026-10-17")).toBe("2026-10-24");
  });
});
