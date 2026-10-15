import { describe, expect, it, vi } from "vitest";
import { localWaitlistStore } from "./waitlist";

const entry = { hotelName: "Rumah Meong", city: "Bintaro", cages: "15 to 50", whatsapp: "6281234567890" };

describe("localWaitlistStore", () => {
  it("is honest that entries stay on this device", () => {
    expect(localWaitlistStore.isLocalOnly).toBe(true);
  });

  it("keeps every submission, with a timestamp", async () => {
    await localWaitlistStore.submit(entry);
    await localWaitlistStore.submit({ ...entry, hotelName: "Second" });
    const saved = JSON.parse(localStorage.getItem("pethommie.waitlist")!);
    expect(saved.map((e: { hotelName: string }) => e.hotelName)).toEqual(["Rumah Meong", "Second"]);
    expect(Date.parse(saved[0].submittedAt)).not.toBeNaN();
  });

  it("doesn't fail the form when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    await expect(localWaitlistStore.submit(entry)).resolves.toBeUndefined();
  });
});
