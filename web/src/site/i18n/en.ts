// English copy (default locale). This file defines the shape every locale must match.
// Edit text here, not in components.

/** A caption over the film. `at` is the second in the film where it sits mid-screen. */
export type Chapter = { at: number; side: "left" | "right"; when: string; title: string; body: string };

export const en = {
  meta: {
    title: "Pethommie · Pet hotel management software for Indonesia",
    description:
      "Pet hotel management software for operators in Indonesia: bookings with QRIS deposits, a cage calendar, check-in, and daily reports to owners on WhatsApp.",
  },
  brand: {
    name: "Pethommie",
    tagline: "Pet hotel management software",
  },
  nav: {
    ariaLabel: "Main",
    links: [
      { href: "#features", label: "Features" },
      { href: "#report", label: "Daily report" },
      { href: "#peak-season", label: "Lebaran package" },
      { href: "#join", label: "Sign up" },
    ],
    cta: "Try it free",
    languageLabel: "Language",
  },
  hero: {
    titleStart: "Fully booked, and still ",
    titleAccent: "calm",
    titleEnd: ".",
    lead: "Pethommie is pet hotel management software for operators in Indonesia. Bookings with QRIS deposits, a cage calendar, check-in, and daily reports to owners on WhatsApp, all from one Android phone.",
    primaryCta: { href: "/app", label: "Try free for 30 days" },
    secondaryCta: { href: "#features", label: "See the features" },
    scrollHint: "Scroll to follow one stay from the operator's side",
  },
  film: {
    ariaLabel: "One pet's stay, from booking to pickup",
    loading: "Loading the film",
    label: "One stay",
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
  },
  /** Captions per film. */
  chapters: {
    ink: [
      {
        at: 3.8,
        side: "right",
        when: "Day 1 · 08:30 · Drop-off",
        title: "The booking is done before the owner arrives.",
        body: "Owners book from the link in your Instagram bio, upload their pet's vaccine card, and pay a deposit by QRIS. The cage is locked on your calendar right away. No back-and-forth chats, no double bookings.",
      },
      {
        at: 6.5,
        side: "left",
        when: "Day 1 · 09:15 · Check-in",
        title: "Check-in in under a minute.",
        body: "Staff photograph the pet's condition on arrival, check vaccines, and note any food the owner brought. Everything is timestamped, so if there's ever a complaint, you have a record.",
      },
      {
        at: 9.5,
        side: "right",
        when: "Day 1 · 21:00 · Night shift",
        title: "The night shift knows what to do.",
        body: "Feeding and medication schedules for every cage show up on staff phones. Finished tasks get ticked off, so shift handovers don't depend on anyone's memory.",
      },
      {
        at: 12,
        side: "left",
        when: "Day 2 · 07:30 · Morning report",
        title: "Reports go out. Chats go down.",
        body: "One tap sends a photo and a daily summary to each owner on WhatsApp. They relax, and you stop answering \"how is my baby doing?\" one message at a time.",
      },
      {
        at: 14,
        side: "right",
        when: "Day 5 · 16:00 · Pickup",
        title: "Paid in full, and they'll be back.",
        body: "The remaining balance goes out by QRIS at pickup. Every stay is on record, so you know who your regulars are and their next booking takes seconds.",
      },
    ],
    turntable: [
      {
        at: 2,
        side: "right",
        when: "D-3 · Pet profiles",
        title: "Every guest has a profile.",
        body: "Pet, owner, WhatsApp number, vaccines and care notes in one place. Regulars are saved, so their next booking takes seconds.",
      },
      {
        at: 4,
        side: "left",
        when: "Day 1 · 08:30 · Arrival",
        title: "The booking is done before they walk in.",
        body: "Owners book from the link in your Instagram bio and pay a deposit by QRIS. The cage is locked on your calendar right away. No back-and-forth chats, no double bookings.",
      },
      {
        at: 6,
        side: "right",
        when: "Day 1 · 09:15 · Check-in",
        title: "Check-in in under a minute.",
        body: "Staff photograph the pet's condition, check the vaccine card and note any food the owner brought. Everything is timestamped, so if there's ever a complaint, you have a record.",
      },
      {
        at: 8,
        side: "left",
        when: "Day 1 · 10:00 · Playtime",
        title: "Every play session, on the record.",
        body: "Staff log play, meals, toilet breaks and medication for each pet from their phone. Shift handovers stay tidy and nothing gets missed.",
      },
      {
        at: 10,
        side: "right",
        when: "Day 1 · 15:00 · Grooming",
        title: "Grooming, on the same bill.",
        body: "Add grooming or bathing as an extra service during the stay. It goes straight onto the owner's invoice, so nothing is forgotten at pickup.",
      },
      {
        at: 12,
        side: "left",
        when: "Day 1 · 21:00 · Lights out",
        title: "Know every cage, every night.",
        body: "The cage calendar shows who is sleeping where tonight and which cages are free. The night shift sees feeding and medication tasks on their phone.",
      },
      {
        at: 14,
        side: "right",
        when: "Day 2 · 07:30 · Morning report",
        title: "Reports go out. Chats go down.",
        body: "One tap sends a photo and daily summary to each owner on WhatsApp. They relax, and you stop answering \"how is my baby doing?\" one message at a time.",
      },
      {
        at: 16.8,
        side: "left",
        when: "Day 5 · 16:00 · Pickup",
        title: "Paid in full, and they'll be back.",
        body: "The balance goes out by QRIS at pickup. Every stay is on record, so you know who your regulars are and their next booking is faster.",
      },
    ],
  } as Record<"ink" | "turntable", Chapter[]>,
  features: {
    eyebrow: "Built for operators",
    title: "Your whole boarding workflow in one app.",
    lead: "Made for pet hotels with 10 to 150 cages that still run on notebooks, spreadsheets, and WhatsApp chats. Not a point-of-sale app with hotel features bolted on.",
    items: [
      { title: "Cage calendar", body: "See free cages by date and by size. A booked slot can't be filled twice." },
      { title: "Booking link with QRIS deposit", body: "Put it in your Instagram bio or send it on WhatsApp. A slot only locks once the deposit is in, so fewer guests go no-show." },
      { title: "Automatic vaccine checks", body: "Owners upload a photo of the vaccine card when they book. Expired vaccines are flagged right away." },
      { title: "Daily and incident log", body: "Meals, medication, toileting, mood, and anything unusual, all timestamped. Shift handovers stay tidy." },
      { title: "Reports to owners on WhatsApp", body: "One tap sends a photo and daily summary from your pet hotel's own WhatsApp number." },
      { title: "Works when the signal drops", body: "Check-ins and logs can be recorded offline and sync when the connection comes back." },
    ],
  },
  report: {
    eyebrow: "Daily pet report",
    title: "The reason owners book with you again.",
    body: "An owner's biggest worry is not knowing how their pet is doing. A daily report answers that before they ask. Every entry is also kept on record in case there's ever a complaint or dispute.",
    points: [
      "Sent from your pet hotel's own WhatsApp number",
      "Photo, meals, sleep, and mood in one message",
      "Owners don't need to install anything",
    ],
    phoneAriaLabel: "Example daily report on WhatsApp",
    sample: {
      hotel: "Rumah Meong Bintaro",
      subtitle: "Daily report · example",
      image: "/films/ink/f0084.webp",
      imageAlt: "Illustration of a caretaker petting a dog",
      heading: "Mochi's report · Day 2",
      lines: ["Finished breakfast (owner's Royal Canin)", "Played 20 min, napped 3 hours", "Mood: relaxed, happy to be petted"],
      sentAt: "07:32",
      reply: "Oh what a relief, thank you so much 🥹",
      replyAt: "07:40",
    },
  },
  peakSeason: {
    eyebrow: "Lebaran package",
    title: "Your busiest week, without the chaos.",
    lead: "Before Lebaran (Eid al-Fitr), boarding demand can jump three to seven times. The Lebaran package gets your bookings, capacity, and owner updates ready for peak season, so you can take more guests without more chaos.",
    timeline: [
      { day: "D-30", tag: "open", body: "Your Lebaran booking link goes live with required deposits and vaccine checks." },
      { day: "D-7", tag: "full", body: "When cages fill up, slots close on their own and new requests join a waitlist. If someone cancels, you know who's next." },
      { day: "D+0", tag: "reports", body: "Daily reports to dozens of owners at once, without answering chats one by one." },
      { day: "D+7", tag: "pickup", body: "Pickups are scheduled and balance invoices go out by QRIS." },
    ],
    price: "Rp299k",
    priceUnit: "per Lebaran season",
    priceNote: "Pay once for the season. After Lebaran, subscribe only if it works for you.",
    cta: { href: "#join", label: "Get the Lebaran package" },
  },
  waitlist: {
    eyebrow: "Early access for pet hotels",
    title: "We'll help you set up until it runs.",
    lead: "Fill in a few details. Our team will reach out on WhatsApp, help move your customer records from notebooks or spreadsheets, and show your staff how to use the app. Free for 30 days, no credit card.",
    fields: {
      hotelName: { label: "Pet hotel name", placeholder: "e.g. Rumah Meong Bintaro" },
      city: { label: "City", placeholder: "e.g. South Tangerang" },
      cages: { label: "Number of cages" },
      whatsapp: { label: "WhatsApp number", placeholder: "08xx xxxx xxxx" },
    },
    cageOptions: ["Under 15", "15 to 50", "50 to 150", "More than 150"],
    submit: "Sign up my pet hotel",
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
  footer: {
    left: "Pethommie · Pet hotel management software for Indonesia",
    right: "Ink illustrations made for Pethommie",
  },
};

export type Messages = typeof en;
