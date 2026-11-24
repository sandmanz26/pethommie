import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { aSmallHotel } from "@/app/testing/fixtures";
import { signedInAs } from "@/app/testing/auth";
import AppRoutes from "./AppRoutes";

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

/**
 * Only the local-only path is covered here (no Supabase in this test harness): RequestsPanel's synced branch
 * (loading rows, claim/dismiss) is exercised by hand against a live Supabase project, not by an automated test yet -
 * see CLAUDE.md, "Email system rebuild", for that honestly-stated gap.
 */
describe("Requests, for a hotel kept only on this device", () => {
  it("isn't offered in the sidebar", async () => {
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app");
    expect(screen.queryByRole("link", { name: "Requests" })).not.toBeInTheDocument();
  });

  it("explains why, if opened directly", async () => {
    await signedInAs({ data: aSmallHotel() });
    renderApp("/app/requests");
    expect(await screen.findByText(/needs a server account/i)).toBeInTheDocument();
  });
});
