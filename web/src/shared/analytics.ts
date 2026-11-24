/**
 * Anonymous page-view analytics (PostHog), on only once `VITE_POSTHOG_KEY` is set — exactly the same
 * "configured or it's a silent no-op" pattern as Supabase (`@/app/supabase/client.ts`). See
 * docs/backend/analytics-setup.md for the owner's setup steps and what this does and doesn't collect.
 *
 * Deliberately narrow for now, since the privacy policy hasn't had its lawyer review yet (see CLAUDE.md):
 * page views only, no autocapture of clicks or form input, no identify() tying events to a signed-in
 * account, and PostHog's own "Do Not Track" opt-out respected.
 *
 * `posthog-js` is dynamically imported, not at the top of this file: without a key it never downloads at all
 * (the common case today), and even once configured it loads as its own chunk instead of growing the bundle
 * every page waits on.
 */
import type { PostHog } from "posthog-js";

let client: PostHog | null = null;
let starting: Promise<void> | null = null;

export const analyticsConfigured = () => Boolean(import.meta.env.VITE_POSTHOG_KEY);

export function initAnalytics(): Promise<void> | undefined {
  if (starting || !analyticsConfigured()) return starting ?? undefined;
  starting = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY!, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: false, // tracked by hand on route change (trackPageview): an SPA, not a fresh page load each time
      respect_dnt: true,
      disable_session_recording: true,
    });
    client = posthog;
  });
  return starting;
}

/** Call on every route change; a no-op until initAnalytics() has actually finished loading (or nothing is configured). */
export function trackPageview(path: string) {
  client?.capture("$pageview", { $current_url: path });
}
