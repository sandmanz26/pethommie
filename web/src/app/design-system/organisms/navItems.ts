import type { NavArt } from "@/app/design-system/atoms/art";

export type NavKey = "today" | "dashboard" | "link" | "transactions" | "expenses" | "finance" | "bookings" | "calendar" | "customers" | "payments" | "invoices" | "tax" | "reports" | "pets" | "cages" | "settings" | "bookingSettings" | "help" | "more";
export type NavItem = { to: string; key: NavKey; art: NavArt; end?: boolean; advanced?: boolean };

const today: NavItem = { to: "/app", key: "today", art: "today", end: true };
const dashboard: NavItem = { to: "/app/dashboard", key: "dashboard", art: "dashboard" };
const bookings: NavItem = { to: "/app/bookings", key: "bookings", art: "bookings" };
const calendar: NavItem = { to: "/app/calendar", key: "calendar", art: "calendar" };
const pets: NavItem = { to: "/app/pets", key: "pets", art: "pets" };
const customers: NavItem = { to: "/app/customers", key: "customers", art: "customers", advanced: true };
const payments: NavItem = { to: "/app/payments", key: "payments", art: "payments", advanced: true };
const transactions: NavItem = { to: "/app/transactions", key: "transactions", art: "transactions", advanced: true };
const expenses: NavItem = { to: "/app/expenses", key: "expenses", art: "expenses", advanced: true };
const finance: NavItem = { to: "/app/finance", key: "finance", art: "finance", advanced: true };
const invoices: NavItem = { to: "/app/invoices", key: "invoices", art: "invoices", advanced: true };
const tax: NavItem = { to: "/app/tax", key: "tax", art: "tax", advanced: true };
const reports: NavItem = { to: "/app/reports", key: "reports", art: "reports" };
const cages: NavItem = { to: "/app/cages", key: "cages", art: "cages" };
const link: NavItem = { to: "/app/link", key: "link", art: "link" };
const settings: NavItem = { to: "/app/settings", key: "settings", art: "settings", end: true };
const bookingSettings: NavItem = { to: "/app/settings/booking", key: "bookingSettings", art: "settings" };
const help: NavItem = { to: "/app/help", key: "help", art: "help" };

/** Every page, in sidebar order. Advanced-only pages are left out in simple mode. */
export const sideItems = (advanced: boolean): NavItem[] =>
  [today, dashboard, bookings, calendar, customers, payments, transactions, expenses, invoices, finance, reports, tax, pets, cages, link, settings, bookingSettings, help].filter((i) => advanced || !i.advanced);

export type NavGroupKey = "customers" | "money" | "insights" | "setup";
export type NavGroup = { key: NavGroupKey; art: NavArt; items: NavItem[] };

/**
 * The sidebar, kept short: the three pages used all day sit on top, everything else folds into a few groups.
 * A group left with one page (simple mode) shows that page on its own; an empty group isn't shown.
 */
export function sideNav(advanced: boolean): { top: NavItem[]; groups: NavGroup[] } {
  const keep = (items: NavItem[]) => items.filter((i) => advanced || !i.advanced);
  const groups: NavGroup[] = [
    { key: "customers", art: "customers", items: keep([customers, pets]) },
    { key: "money", art: "payments", items: keep([payments, transactions, invoices, expenses, finance, tax]) },
    { key: "insights", art: "reports", items: keep([dashboard, reports]) },
    { key: "setup", art: "settings", items: keep([cages, link, settings, bookingSettings, help]) },
  ];
  return { top: [today, calendar, bookings], groups: groups.filter((g) => g.items.length) };
}

/** The four things used all day sit on the phone's tab bar; the rest are one tap away under "More". */
export const tabItems: NavItem[] = [today, bookings, calendar, pets, { to: "/app/more", key: "more", art: "more" }];

/** What "More" lists: everything that isn't on the tab bar. */
export const moreItems = (advanced: boolean): NavItem[] => sideItems(advanced).filter((i) => !tabItems.some((t) => t.key === i.key));
