import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { decodeCard } from "@/shared/lib/bookingLink";
import { dataKeyFor } from "@/app/store/storage";
import { signedInAs } from "@/app/testing/auth";
import { aCage, aPet, aSmallHotel, anOwner } from "@/app/testing/fixtures";
import type { HotelData } from "@/app/domain/types";
import AppRoutes from "./AppRoutes";

const stored = (): HotelData => JSON.parse(localStorage.getItem(dataKeyFor("acct-test")) ?? "null");

async function open(path: string, data: HotelData = aSmallHotel()) {
  await signedInAs({ data });
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/*" element={<AppRoutes />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
  return user;
}

describe("the booking link page", () => {
  it("makes a link that carries the hotel and the owner's choices", async () => {
    const user = await open("/app/link");
    const field = await screen.findByLabelText("Your link");
    const read = () => decodeCard((field as HTMLInputElement).value.split("#")[1])!;
    expect((field as HTMLInputElement).value).toMatch(/\/book#[A-Za-z0-9_-]+$/);
    expect(read()).toMatchObject({ hotel: "Rumah Meong", wa: "6281234567890", species: ["cat", "dog"] });
    expect(read().prices.length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText("Show my price list"));
    await user.click(screen.getByLabelText("Rabbit"));
    await user.type(screen.getByLabelText(/a note for owners/i), "Vaccines required");
    expect(read()).toMatchObject({ prices: [], species: ["cat", "dog", "rabbit"], note: "Vaccines required" });
    expect(screen.getByRole("link", { name: /share on whatsapp/i })).toHaveAttribute("href", expect.stringContaining(encodeURIComponent("/book#")));
  });

  it("asks for a WhatsApp number first when the hotel has none", async () => {
    const data = aSmallHotel();
    await open("/app/link", { ...data, hotel: { ...data.hotel!, whatsapp: "" } });
    expect(await screen.findByText(/add your hotel's whatsapp number first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeDisabled();
  });
});

describe("a request from the link, opened in Pethommie", () => {
  it("fills in a new owner and pet, the dates and the source", async () => {
    const user = await open("/app/bookings/new?in=2099-03-01&out=2099-03-04&source=link&owner=Sari&wa=6285711112222&petName=Rex&species=dog");
    expect(await screen.findByLabelText(/owner name/i)).toHaveValue("Sari");
    expect(screen.getByLabelText(/pet's name/i)).toHaveValue("Rex");
    expect(screen.getByLabelText(/^check-in$/i)).toHaveValue("2099-03-01");
    expect(screen.getByLabelText("Booked via")).toHaveAttribute("data-value", "link");
    await user.click(screen.getByLabelText(/^cage ·/i));
    await user.click(screen.getAllByRole("option")[1]);
    await user.click(screen.getByRole("button", { name: /save booking/i }));
    const s = stored();
    expect(s.owners.find((o) => o.whatsapp === "6285711112222")?.name).toBe("Sari");
    expect(s.bookings[0]).toMatchObject({ source: "link", checkIn: "2099-03-01", checkOut: "2099-03-04" });
  });

  it("recognises an owner on record by their number", async () => {
    await open("/app/bookings/new?in=2099-03-01&out=2099-03-04&source=link&owner=S&wa=6281234567890&petName=mochi&species=cat", aSmallHotel({ cages: [aCage("s1")], owners: [anOwner("o1", "6281234567890")], pets: [aPet("p1", "o1", { name: "Mochi" })] }));
    expect(await screen.findByLabelText(/^Mochi/)).toBeChecked();
    expect(screen.queryByLabelText(/owner name/i)).not.toBeInTheDocument();
  });
});
