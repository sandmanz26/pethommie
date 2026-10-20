import { describe, expect, it } from "vitest";
import { aBooking, aCage, anOwner, aPet, aSmallHotel } from "@/app/testing/fixtures";
import { daysLate, invoiceBalance, invoiceState, ledger, ledgerCsv, ledgerTotals, receiptNumbers } from "./ledger";
import type { Invoice, Payment } from "./types";

const pay = (id: string, day: number, hour: number, amount: number, over: Partial<Payment> = {}): Payment => ({
  id,
  at: new Date(2026, 9, day, hour).toISOString(),
  amount,
  method: "cash",
  kind: "payment",
  reference: "",
  note: "",
  ...over,
});

const data = aSmallHotel({
  cages: [aCage("s1"), aCage("s2")],
  owners: [anOwner("o1", "6281111"), anOwner("o2", "6282222")],
  pets: [aPet("p1", "o1", { name: "Mochi" }), aPet("p2", "o2", { name: "Kopi" })],
  bookings: [
    aBooking("b1", { petId: "p1", cageId: "s1", checkIn: "2026-10-05", checkOut: "2026-10-07", payments: [pay("x2", 5, 15, 50_000, { method: "qris", reference: "QR-77" }), pay("x1", 3, 9, 30_000, { kind: "deposit", method: "transfer" })] }),
    aBooking("b2", { petId: "p2", cageId: "s2", checkIn: "2026-10-05", checkOut: "2026-10-06", payments: [pay("y1", 5, 10, 50_000), pay("y2", 6, 9, 20_000, { kind: "refund" }), { ...pay("bad", 1, 1, 1), at: "" }] }),
  ],
});
const october = { from: "2026-10-01", to: "2026-11-01" };

describe("receipt numbers", () => {
  it("numbers each day's payments in time order", () => {
    const n = receiptNumbers(data);
    expect(n.get("y1")).toBe("KW-20261005-01");
    expect(n.get("x2")).toBe("KW-20261005-02");
    expect(n.get("x1")).toBe("KW-20261003-01");
    expect(n.has("bad")).toBe(false);
  });
});

describe("ledger", () => {
  it("lists the period's payments newest first, skipping ones without a date", () => {
    expect(ledger(data, october).map((r) => r.payment.id)).toEqual(["y2", "x2", "y1", "x1"]);
    expect(ledger(data, { from: "2026-10-04", to: "2026-10-06" }).map((r) => r.payment.id)).toEqual(["x2", "y1"]);
  });

  it("filters by method, kind and words (pet, owner, reference, receipt)", () => {
    const ids = (f: Parameters<typeof ledger>[2]) => ledger(data, october, f).map((r) => r.payment.id);
    expect(ids({ q: "", method: "qris", kind: "all" })).toEqual(["x2"]);
    expect(ids({ q: "", method: "all", kind: "refund" })).toEqual(["y2"]);
    expect(ids({ q: "kopi", method: "all", kind: "all" })).toEqual(["y2", "y1"]);
    expect(ids({ q: "qr-77", method: "all", kind: "all" })).toEqual(["x2"]);
    expect(ids({ q: "KW-20261003", method: "all", kind: "all" })).toEqual(["x1"]);
  });

  it("adds up money in, refunds and each method", () => {
    const t = ledgerTotals(ledger(data, october));
    expect(t).toMatchObject({ moneyIn: 130_000, refunds: 20_000, net: 110_000, count: 4 });
    expect(t.byMethod).toMatchObject({ cash: 30_000, qris: 50_000, transfer: 30_000 });
  });

  it("writes a CSV with refunds negative", () => {
    const lines = ledgerCsv(ledger(data, october)).trim().split("\r\n");
    expect(lines[0]).toBe("receipt,date,time,kind,method,amount,reference,pets,owner,whatsapp,check_in,check_out,note");
    expect(lines[1]).toMatch(/^KW-20261006-01,2026-10-06,\d\d:\d\d,refund,cash,-20000,,Kopi,Owner o2,6282222,/);
  });
});

describe("invoice state", () => {
  const anInvoice = (over: Partial<Invoice>): Invoice => ({
    id: "i", bookingId: "b1", number: "INV-2026-0001", issuedOn: "2026-10-07", dueOn: "2026-10-14", language: "id", status: "issued", voidedOn: null,
    seller: { name: "", legalName: "", address: "", npwp: "", paymentInstructions: "" }, customer: { name: "", whatsapp: "" }, petNames: "",
    stay: { checkIn: "2026-10-05", checkOut: "2026-10-07", nights: 2, cageName: "S1" }, lines: [], subtotal: 100_000, taxPercent: 0, taxAmount: 0, total: 100_000, pricesIncludeTax: false,
    ...over,
  });

  it("is partial before the due date and overdue after it, while money is owed", () => {
    expect(invoiceState(data, anInvoice({}), "2026-10-14")).toBe("partial");
    expect(invoiceState(data, anInvoice({}), "2026-10-15")).toBe("overdue");
    expect(invoiceState(data, anInvoice({ dueOn: null }), "2027-01-01")).toBe("partial");
    expect(daysLate(anInvoice({}), "2026-10-20")).toBe(6);
    expect(daysLate(anInvoice({}), "2026-10-10")).toBe(0);
  });

  it("is paid, void or unknown regardless of the date", () => {
    expect(invoiceState(data, anInvoice({ total: 80_000 }), "2027-01-01")).toBe("paid");
    expect(invoiceState(data, anInvoice({ status: "void" }), "2027-01-01")).toBe("void");
    expect(invoiceState(data, anInvoice({ bookingId: "gone" }), "2027-01-01")).toBe("unknown");
  });

  it("knows the balance left", () => {
    expect(invoiceBalance(data, anInvoice({}))).toBe(20_000);
    expect(invoiceBalance(data, anInvoice({ status: "void" }))).toBe(0);
  });
});
