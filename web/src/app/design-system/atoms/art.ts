/** The illustrated navigation icons in public/icons/nav (cut from one sheet by scripts/prepare-resources.py). */
export const NAV_ART = [
  "today", "bookings", "calendar", "pets", "customers", "payments", "invoices", "reports",
  "tax", "cages", "settings", "help", "more", "website", "logout", "new-booking",
  "dashboard", "link", "transactions", "upgrade", "chat", "night", "grooming", "play",
] as const;
export type NavArt = (typeof NAV_ART)[number];

/** The illustrations the app shows (public/illustrations). Some are shared with the landing page. */
export const ILLUSTRATIONS = [
  "app-welcome", "app-hotel", "app-cages", "app-done", "app-pets", "app-cage", "app-closed", "app-guests", "app-link",
  "feature-calendar", "feature-payments", "feature-tax", "feature-care",
] as const;
export type IllustrationName = (typeof ILLUSTRATIONS)[number];
