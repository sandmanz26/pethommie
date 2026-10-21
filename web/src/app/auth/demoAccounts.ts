import type { Account } from "./types";

/** Mock data for the demo: accounts that already exist, and sample people for filling the sign-up form. */

export const DEMO_PASSWORD = "Demo1234";

export type SeedAccount = Omit<Account, "createdAt"> & { password: string };

/** Created the first time the mock service runs, so there is something to log in with. */
export const demoAccounts: SeedAccount[] = [
  {
    id: "demo-rina",
    name: "Rina Kusuma",
    email: "demo@pethommie.id",
    whatsapp: "6281234567890",
    hotelName: "Rumah Meong Bintaro",
    password: DEMO_PASSWORD,
    startsWithSampleData: true,
  },
  {
    id: "demo-baru",
    name: "Budi Santoso",
    email: "baru@pethommie.id",
    whatsapp: "6285711223344",
    hotelName: "Anabul Sejahtera",
    password: DEMO_PASSWORD,
  },
  {
    id: "demo-pro",
    name: "Dewi Lestari",
    email: "pro@pethommie.id",
    whatsapp: "6281399001122",
    hotelName: "Kandang Ceria Pet Hotel",
    password: DEMO_PASSWORD,
    startsWithSampleData: true,
    sampleKind: "advanced",
  },
];

export const MOCK_REGISTRANT_PASSWORD = "Pethommie123";

type Registrant = { name: string; hotelName: string; emailName: string; whatsapp: string };

/** Made-up people who run pet hotels, for the "fill with sample data" button on the sign-up form. */
const registrants: Registrant[] = [
  { name: "Dewi Lestari", hotelName: "Kucing Manja Pet Hotel", emailName: "dewi.lestari", whatsapp: "0812 7788 4455" },
  { name: "Agus Prasetyo", hotelName: "Rumah Anjing Ceria", emailName: "agus.prasetyo", whatsapp: "0857 2200 1133" },
  { name: "Maya Anggraini", hotelName: "Bintang Pet Lodge", emailName: "maya.anggraini", whatsapp: "0878 6644 9021" },
  { name: "Hendra Wijaya", hotelName: "Si Bulu Penitipan Hewan", emailName: "hendra.wijaya", whatsapp: "0813 9900 5577" },
  { name: "Putri Ayu", hotelName: "Pawfect Stay Surabaya", emailName: "putri.ayu", whatsapp: "0821 3344 6688" },
  { name: "Rizky Ramadhan", hotelName: "Kandang Nyaman Bandung", emailName: "rizky.ramadhan", whatsapp: "0896 1122 7755" },
];

export type MockRegistration = { name: string; hotelName: string; email: string; whatsapp: string; password: string };

/**
 * The next sample person, cycling through the list. The email gets a random number and uses the
 * reserved example.com domain, so repeated clicks never collide with an account that already exists.
 */
export function mockRegistration(turn: number, random = Math.random): MockRegistration {
  const r = registrants[((turn % registrants.length) + registrants.length) % registrants.length];
  const suffix = 100 + Math.floor(random() * 900);
  return {
    name: r.name,
    hotelName: r.hotelName,
    email: `${r.emailName}.${suffix}@example.com`,
    whatsapp: r.whatsapp,
    password: MOCK_REGISTRANT_PASSWORD,
  };
}
