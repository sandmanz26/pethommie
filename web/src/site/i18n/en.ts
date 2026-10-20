// English copy (default locale). This file defines the shape every locale must match.
// Edit text here, not in components.

/** The small app screen shown beside a caption. */
export type MomentKind = "profile" | "booking" | "checkin" | "care" | "extra" | "night" | "report" | "pickup";
/** A caption of the film. `at` is the second of the film it belongs to. */
export type Chapter = { at: number; moment: MomentKind; when: string; title: string; body: string };
/** The real app screen captured for a feature (scripts/capture-features.mjs). */
export type FeatureShot = "calendar" | "checkin" | "care" | "report" | "invoice" | "tax";

export const en = {
  meta: {
    title: "Pethommie · Pet hotel management software for Indonesia",
    description:
      "Pet hotel management software for operators in Indonesia: a cage calendar, check-in, payments, a daily care log, and reports to owners on WhatsApp. Works offline.",
  },
  brand: {
    name: "Pethommie",
    tagline: "Pet hotel management software",
  },
  nav: {
    ariaLabel: "Main",
    links: [
      { href: "#tour", label: "See it" },
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
    login: "Log in",
    cta: "Try it free",
    languageLabel: "Language",
  },
  hero: {
    titleStart: "Fully booked, and still ",
    titleAccent: "calm",
    titleEnd: ".",
    lead: "Bookings, check-in, the daily care log, payments and WhatsApp reports for your pet hotel. On one phone, even without signal.",
    primaryCta: { href: "/app/register", label: "Try free for 30 days" },
    secondaryCta: { href: "/app/login", label: "Open the demo" },
    note: "No card needed · Bahasa Indonesia & English",
    scrollHint: "Scroll to follow one stay",
  },
  film: {
    ariaLabel: "One pet's stay, from booking to pickup",
    loading: "Loading the film",
    label: "One stay",
    skip: "Skip the story",
    inApp: "In Pethommie",
    switcher: { label: "Hero film", options: { ink: "V1 · Ink", turntable: "V2 · Turntable" }, drag: "Drag to move" },
    /** Story clock under each film, keyed to the video's beats (seconds). */
    clock: {
      ink: [
        { at: 0, label: "D-3 · Booking in" },
        { at: 3, label: "Day 1 · 08:30" },
        { at: 5.5, label: "Day 1 · 09:15" },
        { at: 8, label: "Day 1 · 21:00" },
        { at: 10.8, label: "Day 2 · 07:30" },
        { at: 12.8, label: "Day 5 · 16:00" },
      ],
      turntable: [
        { at: 0, label: "D-3 · Booking in" },
        { at: 1, label: "D-3 · New regulars" },
        { at: 3, label: "Day 1 · 08:30" },
        { at: 5, label: "Day 1 · 09:15" },
        { at: 7, label: "Day 1 · 10:00" },
        { at: 9, label: "Day 1 · 15:00" },
        { at: 11, label: "Day 1 · 21:00" },
        { at: 13, label: "Day 2 · 07:30" },
        { at: 15, label: "Day 4 · 10:00" },
        { at: 16.5, label: "Day 5 · 16:00" },
      ],
    },
    /** The small app screens shown next to each caption. Sample data, in the visitor's language. */
    moments: {
      profile: { title: "Mochi", meta: "Persian cat · Rina K.", chips: ["Vaccine OK", "3 stays"] },
      booking: { title: "Cage calendar", rows: [["S-01", "Mochi"], ["S-02", "Kopi"]], freeCage: "M-01", free: "Free", note: "S-01 booked · 20 → 24 Oct" },
      checkin: { title: "Check-in · 09:15", items: ["Healthy", "Flea-free", "Weight 4.2 kg", "Own food, 2× a day"] },
      care: { title: "Care log · today", items: [["07:30", "🍽️", "Meal · finished"], ["10:00", "🎾", "Play · 20 min"], ["12:10", "🚽", "Toilet · normal"]] },
      extra: { title: "Mochi's stay", lines: [["4 nights × Rp50.000", "Rp200.000"], ["Grooming", "Rp75.000"]], total: ["Total", "Rp275.000"] },
      night: { title: "Tonight", stats: [["9/12", "cages free"], ["3", "staying"]], note: "Tomorrow: 2 arrivals, 1 pickup" },
      report: { title: "Mochi's report · Day 2", lines: ["Finished breakfast", "Played 20 minutes", "Mood: happy"], time: "07:32 ✓✓" },
      pickup: { title: "INV-2026-0012", status: "Paid", lines: [["Total", "Rp275.000"], ["Balance", "Rp0"]], note: "Next stay: two taps" },
    },
  },
  /** Captions per film. `moment` picks the app screen shown beside it. */
  chapters: {
    ink: [
      { at: 3.8, moment: "booking", when: "Day 1 · 08:30 · Drop-off", title: "Every cage, booked once.", body: "Bookings sit on the cage calendar. A taken cage can't be booked twice." },
      { at: 6.5, moment: "checkin", when: "Day 1 · 09:15 · Check-in", title: "Check-in in under a minute.", body: "Health, fleas, weight and food on record. Expiring vaccines get flagged." },
      { at: 9.5, moment: "care", when: "Day 1 · 21:00 · Night shift", title: "Nothing forgotten at handover.", body: "Meals, play, toilet and medicine: one tap each, with the time." },
      { at: 12, moment: "report", when: "Day 2 · 07:30 · Morning report", title: "Reports go out. Chats go down.", body: "The day's report is written for you. Add a photo and send it from your WhatsApp." },
      { at: 14, moment: "pickup", when: "Day 5 · 16:00 · Pickup", title: "Paid in full, back next month.", body: "Payments, invoice and history in one place. Regulars rebook in seconds." },
    ],
    turntable: [
      { at: 2, moment: "profile", when: "D-3 · Pet profiles", title: "Every guest has a profile.", body: "Pet, owner, WhatsApp and vaccines in one place. Regulars are saved." },
      { at: 4, moment: "booking", when: "Day 1 · 08:30 · Arrival", title: "Every cage, booked once.", body: "Bookings sit on the cage calendar. A taken cage can't be booked twice." },
      { at: 6, moment: "checkin", when: "Day 1 · 09:15 · Check-in", title: "Check-in in under a minute.", body: "Health, fleas, weight and food on record. Expiring vaccines get flagged." },
      { at: 8, moment: "care", when: "Day 1 · 10:00 · Playtime", title: "Every play session, on record.", body: "Meals, play, toilet and medicine: one tap each, with the time." },
      { at: 10, moment: "extra", when: "Day 1 · 15:00 · Grooming", title: "Extras land on the same bill.", body: "Grooming, pickup or a discount, added to the stay and its invoice." },
      { at: 12, moment: "night", when: "Day 1 · 21:00 · Lights out", title: "Know every cage, every night.", body: "Who sleeps where tonight, and what's free tomorrow." },
      { at: 14, moment: "report", when: "Day 2 · 07:30 · Morning report", title: "Reports go out. Chats go down.", body: "The day's report is written for you. Add a photo and send it from your WhatsApp." },
      { at: 16.8, moment: "pickup", when: "Day 5 · 16:00 · Pickup", title: "Paid in full, back next month.", body: "Payments, invoice and history in one place. Regulars rebook in seconds." },
    ],
  } as Record<"ink" | "turntable", Chapter[]>,
  tour: {
    eyebrow: "See it",
    title: "The real app, not a mockup.",
    items: [
      { key: "today", title: "Today", body: "Who arrives, who leaves, whose report is still unsent." },
      { key: "booking", title: "One stay", body: "Check-in, payments, care log and the owner's report on one page." },
      { key: "calendar", title: "Calendar", body: "Cages down the side, days across. Tap a free day to book." },
    ],
    tabsLabel: "Screens",
    phoneAlt: (title: string) => `Pethommie on a phone: ${title}`,
    imageAlt: (title: string) => `Pethommie screen: ${title}`,
    cta: "Open the demo",
    ctaNote: "No sign-up. Sample data included.",
  },
  features: {
    eyebrow: "Features",
    title: "Everything a pet hotel runs on.",
    soon: "Soon",
    shotAlt: (title: string) => `Pethommie screen: ${title}`,
    items: [
      { art: "feature-calendar", shot: "calendar", title: "Cage calendar", body: "Tap a free day to book. No double bookings." },
      { art: "feature-checkin", shot: "checkin", title: "Check-in & vaccines", body: "A one-minute checklist. Expiring vaccines flagged." },
      { art: "feature-care", shot: "care", title: "Daily care log", body: "Meals, play, toilet, medicine, with the time." },
      { art: "feature-report", shot: "report", title: "WhatsApp reports", body: "Written for you, sent from your own number." },
      { art: "feature-payments", shot: "invoice", title: "Payments & invoices", body: "Deposits, balances, invoices in two languages." },
      { art: "feature-tax", shot: "tax", title: "Monthly & tax reports", body: "Turnover and PPh final estimate, CSV for your accountant." },
      { art: "feature-offline", title: "Works offline", body: "Keeps going when the signal drops.", chip: "Saved on this phone · no signal needed" },
      { art: "feature-booking-link", title: "Booking link with deposit", body: "Owners book from your Instagram bio.", chip: "Book a stay at Rumah Meong →", soon: true },
    ] as { art: string; shot?: FeatureShot; title: string; body: string; chip?: string; soon?: boolean }[],
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Start free. Pay only if it helps.",
    soon: "Coming soon",
    plans: [
      {
        name: "Early access",
        art: "pricing-free",
        price: "Free",
        unit: "for 30 days",
        points: ["Every feature", "No card needed", "Help moving from your notebook"],
        cta: { href: "/app/register", label: "Start free" },
        soon: false,
      },
      {
        name: "Lebaran package",
        art: "pricing-lebaran",
        price: "Rp299k",
        unit: "per season",
        points: ["Booking link with deposits", "Waitlist when you're full", "Reports to every owner, fast"],
        cta: { href: "#join", label: "Tell me when it's ready" },
        soon: true,
      },
    ],
    note: "The price after the trial is announced before anyone is charged.",
  },
  faq: {
    eyebrow: "Questions",
    title: "What people ask first.",
    items: [
      { q: "How much does it cost?", a: "Free for 30 days, no card. The price after that is announced before anyone is charged." },
      { q: "Does it work on my phone?", a: "Yes. Open it in your Android browser and add it to your home screen. Laptops work too." },
      { q: "Do I need internet?", a: "Only the first time. After that it opens and works without a connection." },
      { q: "Where is my data?", a: "On your own device for now, not on our server. Download a backup from Settings now and then." },
      { q: "Does it send WhatsApp messages by itself?", a: "No. It writes the message and opens your WhatsApp. You press send, from your own number." },
      { q: "Does it do my taxes?", a: "It estimates PPh final and exports a sheet for your accountant. It doesn't file anything." },
      { q: "Can my staff use it?", a: "On the same device today. Separate staff logins and syncing between phones are coming." },
    ],
  },
  cta: {
    title: "Your next full house, calm.",
    lead: "Set up your cages in five minutes and run tomorrow from your phone.",
    primary: { href: "/app/register", label: "Try free for 30 days" },
    secondary: { href: "/app/login", label: "Open the demo" },
    chips: ["No card needed", "Works offline", "Bahasa Indonesia & English"],
    help: "Rather we set it up with you?",
    helpLead: "Leave your details. We'll reach out on WhatsApp and help move your records over.",
  },
  waitlist: {
    fields: {
      hotelName: { label: "Pet hotel name", placeholder: "e.g. Rumah Meong Bintaro" },
      city: { label: "City", placeholder: "e.g. South Tangerang" },
      cages: { label: "Number of cages" },
      whatsapp: { label: "WhatsApp number", placeholder: "08xx xxxx xxxx" },
    },
    cageOptions: ["Under 15", "15 to 50", "50 to 150", "More than 150"],
    submit: "Contact me on WhatsApp",
    errors: {
      missing: "Please fill in your pet hotel name, city, and WhatsApp number.",
      whatsapp: "That WhatsApp number doesn't look right. A valid example: 0812 3456 7890.",
    },
    success: "Thanks, your pet hotel is signed up. Our team will reach out on WhatsApp to schedule your setup.",
    demoNote: "Demo mode: there's no server yet, so this was only saved in this browser.",
  },
  notFound: {
    title: "This page isn't on the scroll.",
    body: "The address may have a typo, or the page has moved.",
    cta: "Back to home",
  },
  legal: {
    updated: "Last updated 20 October 2026",
    back: "Back to home",
    privacy: {
      title: "Privacy policy",
      intro: "This page says what Pethommie does with information today. It will be updated before that changes.",
      sections: [
        { h: "Who we are", p: ["Pethommie is pet hotel management software for operators in Indonesia, run by {company}."] },
        { h: "What stays on your device", p: ["Everything you type into the app (your hotel, cages, pets, owners' names and WhatsApp numbers, bookings, payments, care notes) and what you enter in the sign-up form on this website is stored in your own browser. At this stage it is not sent to us or to anyone else.", "That means we cannot see it, and we cannot recover it for you. Use Settings → Download backup to keep a copy."] },
        { h: "What we do receive", p: ["Our website host (Vercel) keeps ordinary server logs, such as the address of your device and the pages requested, for security and reliability. We do not run advertising or analytics trackers, and the fonts are served from this site, not from a third party."] },
        { h: "The owners' details you enter", p: ["When you save a pet owner's name or WhatsApp number, you decide why and how it is used. Tell your customers you keep these details, and use them only for their pet's stay."] },
        { h: "Your choices", p: ["You can download all your data, restore it, or erase it from Settings at any time. Clearing this site's data in your browser erases it as well."] },
        { h: "When this changes", p: ["When we add accounts on a server, we will say here, in plain words, what is collected, why, where it is kept and for how long, before we collect any of it. We aim to follow Indonesia's personal data protection law (Law No. 27 of 2022)."] },
        { h: "Contact", p: ["Questions about this page: {contact}."] },
      ],
    },
    terms: {
      title: "Terms of use",
      intro: "Plain terms for using Pethommie while it is in early access.",
      sections: [
        { h: "Early access", p: ["Pethommie is in early access. It can change, and some features are not ready yet. We try to keep it working, but we cannot promise it will always be available or free of mistakes."] },
        { h: "Your data and backups", p: ["Your data is kept on your own device. You are responsible for keeping backups. Clearing your browser's data, losing the device or switching browsers can erase it."] },
        { h: "Your messages and your customers", p: ["Messages go out from your own WhatsApp account, when you press send. You are responsible for what you send and for following WhatsApp's own rules. You are also responsible for the personal details of your customers that you enter."] },
        { h: "Money", p: ["Pethommie does not take, hold or move money. It only records what you tell it. Check every payment in your own bank or e-wallet."] },
        { h: "Using it properly", p: ["Do not use Pethommie to break the law, to send spam, or to harm other people or the service."] },
        { h: "Limits", p: ["To the extent the law allows, Pethommie is provided as it is, and we are not liable for lost business, lost data or indirect loss that comes from using it."] },
        { h: "Changes and law", p: ["We may update these terms, and will change the date above when we do. These terms are governed by the laws of Indonesia."] },
        { h: "Contact", p: ["Questions about these terms: {contact}."] },
      ],
    },
  },
  footer: {
    tagline: "Pet hotel management software for Indonesia",
    product: "Product",
    legal: "Legal",
    contact: "Contact",
    privacy: "Privacy policy",
    terms: "Terms of use",
    demo: "Open the demo",
    contactEmpty: "Join the waitlist and we'll be in touch.",
    email: "Email",
    whatsapp: "WhatsApp",
    rights: "All rights reserved.",
    art: "Ink illustrations made for Pethommie",
  },
};

export type Messages = typeof en;
