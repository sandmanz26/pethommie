import { afterEach, describe, expect, it, vi } from "vitest";

const posthog = { init: vi.fn(), capture: vi.fn() };
vi.mock("posthog-js", () => ({ default: posthog }));

async function freshModule() {
  vi.resetModules();
  posthog.init.mockClear();
  posthog.capture.mockClear();
  return import("./analytics");
}

describe("analytics", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does nothing at all without a key configured (posthog-js is never even imported)", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
    const { initAnalytics, trackPageview, analyticsConfigured } = await freshModule();
    expect(analyticsConfigured()).toBe(false);
    await initAnalytics();
    trackPageview("/app");
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("starts once a key is set, and tracks page views by hand (no autocapture)", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "phc_test");
    const { initAnalytics, trackPageview, analyticsConfigured } = await freshModule();
    expect(analyticsConfigured()).toBe(true);
    await initAnalytics();
    await initAnalytics(); // a second call never re-initialises
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith("phc_test", expect.objectContaining({ autocapture: false, capture_pageview: false, person_profiles: "identified_only" }));
    trackPageview("/app/bookings");
    expect(posthog.capture).toHaveBeenCalledWith("$pageview", { $current_url: "/app/bookings" });
  });

  it("never tracks a page view before init has actually run", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
    const { trackPageview } = await freshModule();
    trackPageview("/");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
