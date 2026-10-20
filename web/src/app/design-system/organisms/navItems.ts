import type { IconName } from "@/app/design-system/atoms/Icon";

export type NavKey = "today" | "bookings" | "calendar" | "customers" | "payments" | "reports" | "pets" | "cages" | "settings" | "help" | "more";
export type NavItem = { to: string; key: NavKey; icon: IconName; end?: boolean; advanced?: boolean };

const today: NavItem = { to: "/app", key: "today", icon: "today", end: true };
const bookings: NavItem = { to: "/app/bookings", key: "bookings", icon: "bookings" };
const calendar: NavItem = { to: "/app/calendar", key: "calendar", icon: "calendar" };
const pets: NavItem = { to: "/app/pets", key: "pets", icon: "pets" };
const customers: NavItem = { to: "/app/customers", key: "customers", icon: "users", advanced: true };
const payments: NavItem = { to: "/app/payments", key: "payments", icon: "wallet", advanced: true };
const reports: NavItem = { to: "/app/reports", key: "reports", icon: "chart", advanced: true };
const cages: NavItem = { to: "/app/cages", key: "cages", icon: "cages" };
const settings: NavItem = { to: "/app/settings", key: "settings", icon: "settings" };
const help: NavItem = { to: "/app/help", key: "help", icon: "help" };

/** Every page, in sidebar order. Advanced-only pages are left out in simple mode. */
export const sideItems = (advanced: boolean): NavItem[] =>
  [today, bookings, calendar, customers, payments, reports, pets, cages, settings, help].filter((i) => advanced || !i.advanced);

/** The four things used all day sit on the phone's tab bar; the rest are one tap away under "More". */
export const tabItems: NavItem[] = [today, bookings, calendar, pets, { to: "/app/more", key: "more", icon: "more" }];

/** What "More" lists: everything that isn't on the tab bar. */
export const moreItems = (advanced: boolean): NavItem[] => sideItems(advanced).filter((i) => !tabItems.some((t) => t.key === i.key));
