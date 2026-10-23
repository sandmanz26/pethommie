import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { addDays, todayISO } from "@/app/domain/logic";
import type { Booking, HotelData } from "@/app/domain/types";
import { modeKeyFor, type Mode } from "@/app/mode/mode";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aBooking, aCareEntry, aSmallHotel } from "@/app/testing/fixtures";
import AppRoutes from "./AppRoutes";
import { choose } from "@/shared/testing/select";

function renderApp(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");
const today = todayISO();
// Three nights in S1 at Rp 50.000 = Rp 150.000
const stay = (over: Partial<Booking> = {}) => aBooking("b1", { petId: "p1", cageId: "s1", checkIn: today, checkOut: addDays(today, 3), ...over });
const rp = (n: string) => new RegExp(`Rp\\s?${n.replace(/\./g, "\\.")}`);

async function open(booking: Booking, extra: Partial<HotelData> = {}, path = "/app/bookings/b1", mode: Mode = "advanced") {
  await signedInAs({ data: aSmallHotel({ bookings: [booking], ...extra }) });
  localStorage.setItem(modeKeyFor("acct-test"), mode);
  const user = userEvent.setup();
  renderApp(path);
  return user;
}

describe("checking a pet in", () => {
  it("records how it arrived and shows the record afterwards", async () => {
    const user = await open(stay());
    await user.type(await screen.findByLabelText(/weight/i), "4,2");
    await user.type(screen.getByLabelText(/belongings/i), "1 bag, a blanket");
    await user.click(screen.getByRole("checkbox", { name: /no fleas or ticks/i }));
    await user.click(screen.getByRole("button", { name: /^check in$/i }));

    const arrival = stored().bookings[0];
    expect(arrival.status).toBe("checked_in");
    expect(arrival.arrival).toMatchObject({ healthy: true, fleaFree: false, weightKg: 4.2, belongings: "1 bag, a blanket" });
    const record = await screen.findByRole("region", { name: /check-in record/i });
    expect(within(record).getByText("4.2 kg")).toBeInTheDocument();
    expect(within(record).getByText("Found")).toBeInTheDocument();
  });

  it("can skip the record, and says so afterwards", async () => {
    const user = await open(stay());
    await user.click(await screen.findByRole("button", { name: /check in without a record/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "checked_in", arrival: null });
    expect(await screen.findByText(/checked in without a record/i)).toBeInTheDocument();
  });

  it("does not accept a weight that isn't a weight", async () => {
    const user = await open(stay());
    await user.type(await screen.findByLabelText(/weight/i), "heavy");
    await user.click(screen.getByRole("button", { name: /^check in$/i }));
    expect(await screen.findByText(/enter the weight in kg/i)).toBeInTheDocument();
    expect(stored().bookings[0].status).toBe("booked");
  });

  it("is where the Check in button on Today leads", async () => {
    const user = await open(stay(), {}, "/app");
    await user.click(await screen.findByRole("link", { name: /^check in$/i }));
    expect(await screen.findByRole("heading", { name: /check-in record/i })).toBeInTheDocument();
  });
});

describe("payments", () => {
  it("records a payment and shows what is left", async () => {
    const user = await open(stay());
    const panel = await screen.findByRole("region", { name: /payments/i });
    expect(within(panel).getAllByText(rp("150.000"))).not.toHaveLength(0);
    expect(within(panel).getByText("Not paid")).toBeInTheDocument();

    await user.type(within(panel).getByLabelText(/amount/i), "50000");
    await choose(user, within(panel).getByLabelText(/method/i), "qris");
    await user.click(within(panel).getByRole("button", { name: /save payment/i }));

    expect(stored().bookings[0].payments).toEqual([expect.objectContaining({ amount: 50_000, method: "qris" })]);
    expect(within(panel).getByText("Part paid")).toBeInTheDocument();
    expect(within(panel).getByText(rp("100.000"), { selector: "dd" })).toBeInTheDocument();
  });

  it("fills in the balance, and marks the stay paid in full once it is settled", async () => {
    const user = await open(stay({ payments: [{ id: "d", at: new Date().toISOString(), amount: 50_000, method: "cash", kind: "payment" as const, reference: "", note: "" }] }));
    const panel = await screen.findByRole("region", { name: /payments/i });
    await user.click(within(panel).getByRole("button", { name: /fill in the balance/i }));
    expect(within(panel).getByLabelText(/amount/i)).toHaveValue("100.000");
    await user.click(within(panel).getByRole("button", { name: /save payment/i }));
    expect(within(panel).getByText("Paid in full")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /fill in the balance/i })).not.toBeInTheDocument();
  });

  it("refuses an amount of zero, and records nothing", async () => {
    const user = await open(stay());
    const panel = await screen.findByRole("region", { name: /payments/i });
    await user.type(within(panel).getByLabelText(/amount/i), "0");
    await user.click(within(panel).getByRole("button", { name: /save payment/i }));
    expect(await within(panel).findByText(/enter an amount above zero/i)).toBeInTheDocument();
    expect(stored()?.bookings[0].payments ?? []).toEqual([]);
  });

  it("takes back a payment entered by mistake", async () => {
    const user = await open(stay({ payments: [{ id: "d", at: new Date().toISOString(), amount: 50_000, method: "cash", kind: "payment" as const, reference: "", note: "" }] }));
    await user.click(await screen.findByRole("button", { name: /remove payment/i }));
    expect(stored().bookings[0].payments).toEqual([]);
  });

  it("cannot take payments for a cancelled stay", async () => {
    await open(stay({ status: "cancelled" }));
    const panel = await screen.findByRole("region", { name: /payments/i });
    expect(within(panel).queryByRole("button", { name: /save payment/i })).not.toBeInTheDocument();
  });
});

describe("checking out", () => {
  // Booked today -> in 3 nights (150.000 at 50.000 a night), in since this morning.
  const staying = stay({ status: "checked_in" });
  const paidIn = (amount: number) => [{ id: "d", at: new Date().toISOString(), amount, method: "cash" as const, kind: "payment" as const, reference: "", note: "" }];

  it("on the booked day with nothing owed, lets the pet go without a question", async () => {
    const user = await open(stay({ status: "checked_in", checkIn: addDays(today, -3), checkOut: today, payments: paidIn(150_000) }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(stored().bookings[0]).toMatchObject({ status: "checked_out", checkOut: today });
  });

  it("stops and asks when money is still owed", async () => {
    const user = await open(stay({ status: "checked_in", checkIn: addDays(today, -3), checkOut: today }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    expect(await screen.findByText(/still owed after this: Rp\s?150\.000/i)).toBeInTheDocument();
    expect(stored()?.bookings[0].status ?? "checked_in").toBe("checked_in");
    await user.click(screen.getByRole("button", { name: /check out anyway/i }));
    expect(stored().bookings[0].status).toBe("checked_out");
  });

  it("picked up early: ends the stay today, so only the nights stayed are charged", async () => {
    const early = stay({ status: "checked_in", checkIn: addDays(today, -1), payments: paidIn(50_000) }); // booked 4 nights, 1 so far
    const user = await open(early);
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByLabelText(/end the stay today: 1 night/i)).toBeChecked();
    expect(dialog.getByText(/nothing is owed/i)).toBeInTheDocument();
    await user.click(dialog.getByLabelText(/keep the booked dates/i));
    expect(dialog.getByText(/still owed after this: Rp\s?150\.000/i)).toBeInTheDocument();
    await user.click(dialog.getByLabelText(/end the stay today/i));
    await user.click(dialog.getByRole("button", { name: /^check out$/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "checked_out", checkOut: today });
  });

  it("picked up late: adds the extra nights when the cage is free", async () => {
    const late = stay({ status: "checked_in", checkIn: addDays(today, -3), checkOut: addDays(today, -1) });
    const user = await open(late);
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByLabelText(/add the extra night/i)).toBeChecked();
    await user.click(dialog.getByRole("button", { name: /check out anyway/i }));
    expect(stored().bookings[0].checkOut).toBe(today);
  });

  it("asks from the bookings list as well", async () => {
    const user = await open(staying, {}, "/app/bookings");
    await user.click(await screen.findByRole("tab", { name: /staying/i }));
    await user.click(await screen.findByRole("button", { name: /^check out$/i }));
    expect(await screen.findByRole("dialog", { name: "Check out" })).toBeInTheDocument();
  });
});

describe("cancelling", () => {
  const deposit = [{ id: "d", at: new Date().toISOString(), amount: 60_000, method: "transfer" as const, kind: "deposit" as const, reference: "", note: "" }];

  it("asks why and what happens to the deposit, then gives back what was chosen", async () => {
    const user = await open(stay({ payments: deposit }));
    await user.click(await screen.findByRole("button", { name: /cancel booking/i }));
    const dialog = within(await screen.findByRole("dialog", { name: /cancel this booking/i }));
    expect(dialog.getByText(/Rp\s?60\.000 was paid/)).toBeInTheDocument();
    await user.click(dialog.getByLabelText(/give part of it back/i));
    await user.type(dialog.getByLabelText(/amount to give back/i), "70000");
    await user.click(dialog.getByRole("button", { name: /^cancel booking$/i }));
    expect(dialog.getByText(/no more than was paid/i)).toBeInTheDocument();
    await user.clear(dialog.getByLabelText(/amount to give back/i));
    await user.type(dialog.getByLabelText(/amount to give back/i), "30000");
    await user.click(dialog.getByRole("button", { name: /^cancel booking$/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "cancelled", cancelReason: "owner" });
    expect(stored().bookings[0].payments.at(-1)).toMatchObject({ kind: "refund", amount: 30_000 });
  });

  it("marks a late arrival as a no-show from today's board, keeping the deposit", async () => {
    const user = await open(stay({ checkIn: addDays(today, -1), payments: deposit }), {}, "/app");
    await user.click(await screen.findByRole("button", { name: /no-show/i }));
    const dialog = within(await screen.findByRole("dialog", { name: /cancel this booking/i }));
    expect(dialog.getByLabelText(/keep it/i)).toBeChecked();
    await user.click(dialog.getByRole("button", { name: /^cancel booking$/i }));
    expect(stored().bookings[0]).toMatchObject({ status: "cancelled", cancelReason: "no_show", payments: deposit });
  });
});

describe("the daily care log and report", () => {
  const staying = stay({ status: "checked_in" });

  it("logs a meal with one tap and puts it in the owner's report", async () => {
    const user = await open(staying);
    const log = await screen.findByRole("region", { name: /daily care log/i });
    expect(within(log).getByText(/nothing logged yet/i)).toBeInTheDocument();
    await user.click(within(log).getByRole("button", { name: "All eaten" }));

    expect(stored().careLog).toEqual([expect.objectContaining({ bookingId: "b1", kind: "meal", preset: "all" })]);
    expect(within(log).queryByText(/nothing logged yet/i)).not.toBeInTheDocument();
    const report = screen.getByRole("region", { name: /report for the owner/i });
    expect((within(report).getByRole("textbox") as HTMLTextAreaElement).value).toContain("Makan: habis");
  });

  it("will not log an incident without words", async () => {
    const user = await open(staying);
    const log = await screen.findByRole("region", { name: /daily care log/i });
    await user.click(within(log).getByRole("button", { name: /incident/i }));
    await user.click(within(log).getByRole("button", { name: /add to log/i }));
    expect(await within(log).findByText(/write a few words/i)).toBeInTheDocument();
    expect(stored()?.careLog ?? []).toEqual([]);

    await user.type(within(log).getByLabelText(/details/i), "Scratched the cage door");
    await user.click(within(log).getByRole("button", { name: /add to log/i }));
    expect(stored().careLog).toEqual([expect.objectContaining({ kind: "incident", note: "Scratched the cage door" })]);
  });

  it("deletes an entry made by mistake", async () => {
    const user = await open(staying, { careLog: [aCareEntry("c1", "b1", { at: new Date().toISOString() })] });
    await user.click(await screen.findByRole("button", { name: /delete entry/i }));
    expect(stored().careLog).toEqual([]);
  });

  it("opens WhatsApp on the owner's number with the report, and remembers that it was sent", async () => {
    const user = await open(staying, { careLog: [aCareEntry("c1", "b1", { at: new Date().toISOString() })] });
    const report = await screen.findByRole("region", { name: /report for the owner/i });
    expect(within(report).getByText("Not sent yet")).toBeInTheDocument();

    const link = within(report).getByRole("link", { name: /send on whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/6281234567890\?text=Halo%20Kak%20Owner/));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    await user.click(link);

    expect(stored().reportsSent).toEqual([expect.objectContaining({ bookingId: "b1", date: today })]);
    expect(await within(report).findByText(/^Sent at/)).toBeInTheDocument();
    expect(within(report).getByRole("link", { name: /send again/i })).toBeInTheDocument();
  });

  it("sends exactly what was edited", async () => {
    const user = await open(staying);
    const report = await screen.findByRole("region", { name: /report for the owner/i });
    const box = within(report).getByRole("textbox");
    await user.clear(box);
    await user.type(box, "Mochi baik");
    expect(within(report).getByRole("link", { name: /send on whatsapp/i })).toHaveAttribute("href", "https://wa.me/6281234567890?text=Mochi%20baik");
  });

  it("is closed for a pet that is not checked in", async () => {
    await open(stay());
    expect(screen.queryByRole("region", { name: /daily care log/i })).not.toBeInTheDocument();
  });

  it("keeps earlier days to read, but not to change", async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    await open(stay({ status: "checked_in", checkIn: addDays(today, -2) }), { careLog: [aCareEntry("c1", "b1", { at: yesterday, kind: "mood", preset: "happy" })] });
    const log = await screen.findByRole("region", { name: /daily care log/i });
    expect(within(log).getByText(/Day 2/)).toBeInTheDocument();
    expect(within(log).getByText(/Happy/)).toBeInTheDocument();
    expect(within(log).queryAllByRole("button", { name: /delete entry/i })).toHaveLength(0);
  });
});

describe("today's board", () => {
  it("shows who is staying, what is logged, and whether the owner has had the report", async () => {
    await open(stay({ status: "checked_in" }), { careLog: [aCareEntry("c1", "b1", { at: new Date().toISOString() })] }, "/app");
    const section = (await screen.findByRole("heading", { name: /staying now/i, level: 2 })).closest("section")!;
    expect(within(section).getByRole("link", { name: "Pet p1" })).toHaveAttribute("href", "/app/bookings/b1");
    expect(within(section).getByText(/Day 1 of 3/)).toBeInTheDocument();
    expect(within(section).getByText(/1 entry today/)).toBeInTheDocument();
    expect(within(section).getByText("Report not sent")).toBeInTheDocument();
  });

  it("flags an incident", async () => {
    await open(stay({ status: "checked_in" }), { careLog: [aCareEntry("c1", "b1", { at: new Date().toISOString(), kind: "incident", preset: null, note: "Cut paw" })] }, "/app");
    const section = (await screen.findByRole("heading", { name: /staying now/i, level: 2 })).closest("section")!;
    expect(within(section).getByText("Incident")).toBeInTheDocument();
  });

  it("guides a new hotel through its first four steps, and goes away when they are done", async () => {
    await signedInAs({ data: aSmallHotel() });
    const { unmount } = renderApp("/app");
    const steps = await screen.findByRole("region", { name: /getting started/i });
    expect(within(steps).getByRole("link", { name: /add your first booking/i })).toHaveAttribute("href", "/app/bookings/new");
    unmount();

    localStorage.setItem(
      dataKeyFor("acct-test"),
      JSON.stringify(aSmallHotel({ bookings: [stay({ status: "checked_in" })], careLog: [aCareEntry("c1", "b1")], reportsSent: [{ bookingId: "b1", date: today, at: new Date().toISOString() }] })),
    );
    renderApp("/app");
    await screen.findByRole("heading", { name: /staying now/i, level: 2 });
    expect(screen.queryByRole("region", { name: /getting started/i })).not.toBeInTheDocument();
  });
});

describe("changing a booking", () => {
  it("moves the stay to another free cage", async () => {
    const user = await open(stay());
    await user.click(await screen.findByRole("button", { name: /change dates or cage/i }));
    const form = screen.getByRole("form", { name: /change dates or cage/i });
    await choose(user, within(form).getByLabelText(/^cage/i), "m1");
    await user.click(within(form).getByRole("button", { name: /save changes/i }));
    expect(stored().bookings[0].cageId).toBe("m1");
    expect(screen.queryByRole("form", { name: /change dates or cage/i })).not.toBeInTheDocument();
  });

  it("will not extend into a stay that is already booked", async () => {
    await signedInAs({
      data: aSmallHotel({ bookings: [stay(), aBooking("b2", { petId: "p2", cageId: "s1", checkIn: addDays(today, 4), checkOut: addDays(today, 6) })] }),
    });
    const user = userEvent.setup();
    renderApp("/app/bookings/b1");
    await user.click(await screen.findByRole("button", { name: /change dates or cage/i }));
    const form = screen.getByRole("form", { name: /change dates or cage/i });
    const out = within(form).getByLabelText(/check-out/i);
    await user.clear(out);
    await user.type(out, addDays(today, 5));
    await user.click(within(form).getByRole("button", { name: /save changes/i }));
    expect(await within(form).findByText(/just taken/i)).toBeInTheDocument();
    expect(stored()?.bookings[0].checkOut ?? addDays(today, 3)).toBe(addDays(today, 3));
  });

  it("fixes the check-in day once the pet is in", async () => {
    const user = await open(stay({ status: "checked_in" }));
    await user.click(await screen.findByRole("button", { name: /change dates or cage/i }));
    expect(screen.getByLabelText(/^check-in$/i)).toBeDisabled();
  });

  it("offers no change for a finished stay", async () => {
    await open(stay({ status: "checked_out" }));
    await screen.findByRole("heading", { name: "Pet p1" });
    expect(screen.queryByRole("button", { name: /change dates or cage/i })).not.toBeInTheDocument();
  });

  it("says so for a booking that doesn't exist", async () => {
    await open(stay(), {}, "/app/bookings/ghost");
    expect(await screen.findByText(/that booking doesn't exist/i)).toBeInTheDocument();
  });
});

describe("messages to the owner", () => {
  it("offers a confirmation that matches the booking, ready for WhatsApp", async () => {
    const user = await open(stay());
    const panel = await screen.findByRole("region", { name: /messages to the owner/i });
    await user.click(within(panel).getByText("Booking confirmation", { selector: "summary" }));
    const box = within(panel).getByRole("textbox", { name: "Booking confirmation" }) as HTMLTextAreaElement;
    expect(box.value).toContain("3 malam");
    const link = within(box.closest("details")!).getByRole("link", { name: /open in whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/6281234567890?text="));
  });

  it("warns that there is no number to send to, and still lets the operator pick the contact", async () => {
    await signedInAs({ data: aSmallHotel({ owners: [{ id: "o1", name: "Owner o1", whatsapp: "", language: "id" }], bookings: [stay()] }) });
    localStorage.setItem(modeKeyFor("acct-test"), "advanced");
    renderApp("/app/bookings/b1");
    const panel = await screen.findByRole("region", { name: /messages to the owner/i });
    expect(within(panel).getByText(/no whatsapp number saved/i)).toBeInTheDocument();
  });
});

describe("the cage calendar", () => {
  it("shows a stay as a bar that opens the booking", async () => {
    const user = await open(stay(), {}, "/app/calendar");
    await user.click(await screen.findByRole("link", { name: "Pet p1" }));
    expect(await screen.findByRole("heading", { name: "Pet p1", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /payments/i })).toBeInTheDocument();
  });

  it("turns an empty day into a new booking for that cage and day", async () => {
    await signedInAs({ data: aSmallHotel() });
    const user = userEvent.setup();
    renderApp("/app/calendar");
    const tomorrow = addDays(today, 1);
    const cells = await screen.findAllByRole("link", { name: /new booking in S2 from/i });
    await user.click(cells[1]);
    expect(await screen.findByLabelText(/^check-in$/i)).toHaveValue(tomorrow);
    expect(screen.getByLabelText(/^check-out$/i)).toHaveValue(addDays(tomorrow, 1));
    expect(screen.getByLabelText(/^cage ·/i)).toHaveAttribute("data-value", "s2");
  });

  it("does not offer a night that is taken", async () => {
    await open(stay({ checkOut: addDays(today, 2) }), {}, "/app/calendar");
    await screen.findByRole("link", { name: "Pet p1" });
    // S1 has two nights taken out of 14; S2 and M1 are empty.
    expect(screen.getAllByRole("link", { name: /new booking in S1 from/i })).toHaveLength(12);
    expect(screen.getAllByRole("link", { name: /new booking in S2 from/i })).toHaveLength(14);
  });

  it("pages forward and back", async () => {
    const user = await open(stay({ checkIn: addDays(today, 20), checkOut: addDays(today, 22) }), {}, "/app/calendar");
    await screen.findAllByRole("link", { name: /new booking in S1 from/i });
    expect(screen.queryByRole("link", { name: "Pet p1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /later/i }));
    await user.click(screen.getByRole("button", { name: /later/i }));
    expect(await screen.findByRole("link", { name: "Pet p1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^today$/i }));
    expect(screen.queryByRole("link", { name: "Pet p1" })).not.toBeInTheDocument();
  });

  it("asks for cages first when there are none", async () => {
    await signedInAs({ data: aSmallHotel({ cages: [] }) });
    renderApp("/app/calendar");
    expect(await screen.findByText(/add cages first/i)).toBeInTheDocument();
  });
});
