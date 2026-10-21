import type { NavArt } from "@/app/design-system/atoms/art";

export type NavKey = "today" | "dashboard" | "link" | "transactions" | "expenses" | "finance" | "bookings" | "calendar" | "customers" | "payments" | "invoices" | "tax" | "reports" | "pets" | "cages" | "settings" | "help" | "more";
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
const settings: NavItem = { to: "/app/settings", key: "settings", art: "settings" };
const help: NavItem = { to: "/app/help", key: "help", art: "help" };

/** Every page, in sidebar order. Advanced-only pages are left out in simple mode. */
export const sideItems = (advanced: boolean): NavItem[] =>
  [today, dashboard, bookings, calendar, customers, payments, transactions, expenses, invoices, finance, reports, tax, pets, cages, link, settings, help].filter((i) => advanced || !i.advanced);

/** The four things used all day sit on the phone's tab bar; the rest are one tap away under "More". */
export const tabItems: NavItem[] = [today, bookings, calendar, pets, { to: "/app/more", key: "more", art: "more" }];

/** What "More" lists: everything that isn't on the tab bar. */
export const moreItems = (advanced: boolean): NavItem[] => sideItems(advanced).filter((i) => !tabItems.some((t) => t.key === i.key));
