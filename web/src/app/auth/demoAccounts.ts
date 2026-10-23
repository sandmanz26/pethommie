import type { Account } from "./types";

/**
 * The hotels behind "Try now". They are not accounts anyone registers or logs in to: they have no password,
 * the login form never finds them, and their data is kept under their own ids, apart from real accounts.
 */
export type DemoAccount = Omit<Account, "createdAt" | "demo" | "offer">;

export const demoAccounts: DemoAccount[] = [
  {
    id: "demo-rina",
    name: "Rina Kusuma",
    email: "demo@pethommie.id",
    whatsapp: "6281234567890",
    hotelName: "Rumah Meong Bintaro",
    startsWithSampleData: true,
  },
  {
    id: "demo-pro",
    name: "Dewi Lestari",
    email: "pro@pethommie.id",
    whatsapp: "6281399001122",
    hotelName: "Kandang Ceria Pet Hotel",
    startsWithSampleData: true,
    sampleKind: "advanced",
  },
  {
    id: "demo-baru",
    name: "Budi Santoso",
    email: "baru@pethommie.id",
    whatsapp: "6285711223344",
    hotelName: "Anabul Sejahtera",
  },
];

export const isDemoId = (id: string) => demoAccounts.some((a) => a.id === id);
