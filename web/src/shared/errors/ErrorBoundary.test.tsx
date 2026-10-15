import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { isStaleDeployError } from "./staleDeploy";

function Boom({ message }: { message: string }): never {
  throw new Error(message);
}

const renderBroken = (message: string) =>
  render(
    <LocaleProvider>
      <ErrorBoundary>
        <Boom message={message} />
      </ErrorBoundary>
    </LocaleProvider>,
  );

describe("ErrorBoundary", () => {
  it("shows a way out instead of a blank page", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderBroken("kaboom");
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /homepage/i })).toHaveAttribute("href", "/");
  });

  it("speaks the chosen language", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    localStorage.setItem("pethommie.locale", "id");
    renderBroken("kaboom");
    expect(screen.getByRole("alert")).toHaveTextContent(/ada yang tidak beres/i);
  });

  it("reloads once when a file from an older deploy is gone, never in a loop", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    renderBroken("Failed to fetch dynamically imported module: /assets/AppRoutes-abc.js");
    expect(reload).toHaveBeenCalledTimes(1);
    renderBroken("Failed to fetch dynamically imported module: /assets/AppRoutes-abc.js");
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("isStaleDeployError", () => {
  it.each([
    ["Failed to fetch dynamically imported module: x", true],
    ["Importing a module script failed.", true],
    ["error loading dynamically imported module", true],
    ["Cannot read properties of undefined", false],
  ])("%s", (message, expected) => {
    expect(isStaleDeployError(new Error(message))).toBe(expected);
  });
});
