# How Indonesian UMKM (SMBs) Adopt and Pay for SaaS: UX and Go-To-Market Lessons for a Pet Hotel SaaS

Research date: 2026-10-13. Scope: Indonesia, 2022-2026 preferred. Note: this pass used about 14 search/fetch calls, so several sub-questions are only partly answered (see Gaps). Many price figures come from third-party comparison blogs, not official pricing pages.

## 1. UMKM digital adoption levels, devices, Android dominance

### Takeaway
About 38-39% of Indonesia's ~64 million UMKM had "onboarded digitally" by Sept 2024 (25.2M), short of the government's 30M target. Here "digital" mostly means a presence on marketplaces or social media, or accepting digital payments, not using business software. Smartphones (Android) are the main computing device. I found no hard data on laptop use or device specs for this segment.

### Cited Findings
- Kemenkop UKM (Sept 2024): 64.2 million UMKM; about 25.2 million (about 38%) onboarded digitally. — [InvestorTrust](https://investortrust.id/business/42055/kemenkop-ukm-terus-dorong-daya-saing-umkm-yang-sudah-onboarding-digital)
- The government roadmap targeted 13.7M (2021), 19M (2022), 24.5M (2023) and 30M (2024) UMKM onboarded. It reached 13.5M (21%) in May 2021 and 19.5M (30.4% of about 65M) in June 2022. — [detikFinance](https://finance.detik.com/berita-ekonomi-bisnis/d-5603587/ri-kejar-30-juta-umkm-go-digital-hingga-2024); [InvestorTrust](https://investortrust.id/business/41984/begini-upaya-kemenkop-ukm-dorong-sektor-umkm-dalam-maksimalkan-penerapan-digital)
- Conflicting figure: an OJK-related source cites 20.76M digitally onboarded UMKM in 2023, which I could not reconcile with the Kemenkop series. — (surfaced via search summary; primary not verified)
- e-Conomy SEA 2025 (Google, Temasek, Bain): Indonesia's digital economy is approaching US$100B GMV in 2025. Digital payments GTV is projected at US$538B in 2025, the largest and fastest-growing in SEA, with QRIS a major driver. 46% of Indonesian consumers report lower trust in digital finance providers than in banks. Active video-commerce sellers and shops grew 75% to 800,000. — [Google Indonesia blog](https://blog.google/intl/id-id/company-news/outreach-initiatives/e-conomy-sea-2025-ekonomi-digital-indonesia-mendekati-gmv-us100-miliar/); [Bain](https://www.bain.com/insights/e-conomy-sea-2025); [Marketing-Interactive](https://www.marketing-interactive.com/indonesia-s-digital-economy-closes-in-on-us-100b-as-video-commerce-ai-adoption-surge)
- Android holds the large majority of Indonesia's mobile OS market (Statista citing StatCounter, April 2025; the exact figure is paywalled). Oppo, Samsung and Xiaomi dominate device sales. — [Statista](https://www.statista.com/statistics/262205/market-share-held-by-mobile-operating-systems-in-indonesia)
- StatCounter's all-platform web traffic for Indonesia (mid-2026) shows Windows about 48.6% and Android about 29.5%. This measures page views across desktop and mobile, not device ownership, and should not be read as a mobile-only share. — [StatCounter](https://gs.statcounter.com/os-market-share/android/indonesia)
- A BukuKas founder (2020) said "the Jakarta bubble is very different from the rest of Indonesia in terms of software penetration," and many small businesses still relied on manual processes and paper bookkeeping. — [Crowdfund Insider / TechCrunch-sourced](https://www.crowdfundinsider.com/?p=171138)

### Inferences
- "Digitally onboarded" in government statistics is a low bar. The share of UMKM using paid operational SaaS is far below 38%, probably in the low single digits, though I found no source for that.
- Design mobile-first for Android. The owner and front desk of a pet hotel will likely run it on a mid- or low-range Oppo, Samsung or Xiaomi phone. A web or desktop admin view is useful mainly for larger multi-outlet operators.
- The 46% lower-trust figure for digital finance suggests that holding customer deposits or payments through a new SaaS will meet trust friction. Use well-known payment rails (QRIS, bank virtual accounts).

### Gaps
- I found no BPS or Kemenkop breakdown of UMKM smartphone vs laptop use for business, and no data on RAM, storage or device age among UMKM owners. IDC, Counterpoint or GfK shipment data would be needed.
- I found no 2025-2026 update of the Kemenkop onboarding figure.
- No pet-services-specific adoption data was found.

## 2. WhatsApp-first behavior and WhatsApp Business API costs

### Takeaway
WhatsApp is the default business communication channel for UMKM, but I found no national survey giving the percentage using WhatsApp Business. The official WhatsApp Business Platform (API) moved from per-conversation to per-message pricing on 1 July 2025. Indonesian rates are roughly Rp586 per marketing message and Rp357 per utility or authentication message (from July 2026, plus 11% VAT). Utility messages are free inside the 24-hour customer-service window.

### Cited Findings
- WhatsApp Business reached 200 million users globally in 2023, up from 50 million in mid-2020. Coverage frames Indonesia's roughly 60M UMKM as a key market. — [detikInet](https://inet.detik.com/cyberlife/d-6795612/jurus-whatsapp-business-raup-200-juta-pengguna-dalam-5-tahun)
- A 2024 study of UMKM in Samarinda found limited digital literacy to be the main barrier. Many owners did not understand WhatsApp Business features such as product catalogs and customer labels. — [Jurnal Akuntansi Keuangan dan Bisnis (PCR), 2024](https://jurnal.pcr.ac.id/index.php/jakb/article/view/6443/2217)
- Small community-service studies report that WhatsApp Business helped UMKM sales (qualitative, small samples). — [Universitas Pamulang](https://openjournal.unpam.ac.id/index.php/JPDM/article/view/17878); [Unsri](https://beceris.ejournal.unsri.ac.id/index.php/beceris/article/download/4/3/36)
- Since 1 July 2025, Meta charges per delivered template message (marketing, utility, authentication) instead of per 24-hour conversation. — [SleekFlow help](https://help.sleekflow.io/en_US/whatsapp/pricing); [ChatMaxima](https://chatmaxima.com/whatsapp-api-pricing/indonesia/)
- Indonesia rate card effective 1 July 2026 (reseller-reported): marketing Rp586.33 per message, utility Rp356.65, authentication Rp356.65, plus 11% VAT. Utility templates are free inside the 24-hour customer-service window. — [ChatMaxima](https://chatmaxima.com/whatsapp-api-pricing/indonesia/)
- Older per-conversation pricing (pre-July 2025) from Qontak (Mekari): marketing about Rp596 and utility about Rp295 per 24-hour conversation. — [Qontak blog](https://qontak.com/en/blog/whatsapp-business-api-pricing/)
- Conflicting third-party figures exist (e.g., marketing about Rp780, utility about Rp336) from a low-quality blog. Treat them as unreliable. — [wordpress mirror](https://wordpress-1rwf.onrender.com/?p=679)
- Pricing depends on the recipient's country. Business Solution Providers (Qontak, SleekFlow, etc.) add their own platform subscription fees on top of Meta's rates. — [SleekFlow](https://help.sleekflow.io/en_US/daftar-harga); [Qontak](https://qontak.com/en/blog/whatsapp-business-api-pricing/)

### Inferences
- Unit economics for a pet hotel SaaS: a booking confirmation, check-in notice, daily pet-update notification or payment reminder is a utility template at about Rp357 + VAT, roughly Rp400 per message, or free when replying within 24 hours of a customer message. For a hotel sending about 300 utility messages a month, that is about Rp120k/month. At typical SMB price points (Rp50k-300k/month) this is material, so WA API costs should be metered, bundled as a quota or passed through.
- A cheaper first step is "click-to-WhatsApp" deep links (wa.me with prefilled text) that open the owner's own WhatsApp or WhatsApp Business app. This costs nothing in API fees and matches existing behavior. Move to the API only for automation at scale.
- Pet owners already expect "foto/video update anabul" over WhatsApp. Shareable status links or images sent via WA fit that habit better than requiring the end customer to install an app. This is an inference; I found no pet-specific source.

### Gaps
- I found no BPS, Kemenkop or Meta statistic on the percentage of Indonesian UMKM using WhatsApp Business, or on the share of sales conducted via chat.
- Meta's official IDR rate card was not directly fetched. Verify before budgeting.

## 3. Payments: QRIS, bank transfer, e-wallets; SaaS price points; freemium

### Takeaway
QRIS is now near-universal on the merchant side: 42M merchants, about 90% UMKM, and 59M users by end-2025. Indonesian SMB POS and SaaS pricing clusters from free, through about Rp33k-55k/month at the low end (Qasir, Kasir Pintar), to Rp129k-599k/month per outlet for full-featured tools (Olsera, majoo, Moka). Freemium and lifetime-free tiers are common at the low end.

### Cited Findings
- Bank Indonesia (Dec 2025): QRIS users reached 59M (target 58M) and merchants 42M (target 40M), with about 90% UMKM. There were 13.66 billion transactions in 2025, against a 6.5 billion target. 2026 targets: 45M merchants, 60M users, 17 billion transactions. — [Bisnis.com](https://ekonomi.bisnis.com/read/20251218/9/1937730/transaksi-qris-2-kali-lipat-dari-target-ekonomi-ri-cerah)
- H1 2025: 57M users and 39.3M merchants (93.16% UMKM); transaction value Rp579 trillion in H1 2025. — [Kontan](https://keuangan.kontan.co.id/news/bi-sebut-pengguna-qris-tembus-57-juta-orang-per-semester-i-2025); [Kontan](https://nasional.kontan.co.id/news/bi-catat-transaksi-qris-capai-rp-579-triliun-pada-semester-i-2025); [IDX Channel](https://www.idxchannel.com/banking/transaksi-qris-capai-rp579-triliun-hingga-semester-i-2025/all)
- Q1 2025 QRIS transactions grew nearly 600% (GoodStats headline). — [GoodStats](https://goodstats.id/article/transaksi-qris-tumbuh-hampir-600-pada-kuartal-i-2025-Wo7Cm)
- SMB POS price points, monthly (HitPay comparison, 2025; vendor blog, not official pages):
  - Moka: Rp299,000/month per outlet, 14-day trial.
  - majoo: Starter Rp149,000, Advance Rp299,000, Prime Rp599,000.
  - Olsera: Basic Rp128,000, Premium Rp218,000, Pro Rp298,000.
  - Kasir Pintar: free lifetime tier; PRO from Rp55,000/month.
  - Qasir: about Rp399,600/year (about Rp33k/month); IDX Channel cites Qasir Pro about Rp36,908/month.
  - Sources: [HitPay](https://hitpayapp.com/blog/pos-system-indonesia-comparison); [IDX Channel](https://www.idxchannel.com/technology/7-rekomendasi-aplikasi-untuk-kasir-gratis-sudah-coba/all)
- Conflict: IDX Channel lists majoo at about Rp129k per year, inconsistent with HitPay's monthly tiers. It is likely outdated or a promo. — [IDX Channel](https://www.idxchannel.com/technology/7-rekomendasi-aplikasi-untuk-kasir-gratis-sudah-coba/all)
- General SMB SaaS benchmark (not Indonesia-specific): SMB monthly churn is about 3-7%, which compounds to 30-58% a year, driven by price sensitivity and the owner paying "out of pocket." — [Tenet](https://www.wearetenet.com/blog/saas-churn-rate-statistics); [SaaStr](https://www.saastr.com/the-challenge-with-smb-saas-high-growth-can-only-mask-high-churn-for-just-so-long/)

### Inferences
- A plausible price ladder for a pet hotel SaaS is a free or very cheap entry tier (≤Rp50k/month), a core tier around Rp99k-199k/month, and a multi-outlet tier around Rp299k+. This is anchored on the POS market above; pet hotels charge per night, so even one extra booking a month can justify about Rp150k.
- Offer annual or semi-annual plans paid by QRIS, bank virtual account or e-wallet, with WhatsApp reminders before expiry. Auto-debit by credit card is uncommon among UMKM (this is an inference; I found no source in this pass). Manual prepaid renewal is the norm, so build renewal nudges into the product and WA.
- QRIS ubiquity means the SaaS can include "terima pembayaran QRIS / DP booking" via a payment gateway as a value-add and possible take-rate revenue. Several players (BukuWarung, majoo) monetize payments rather than only subscriptions.

### Gaps
- I found no Indonesian survey on SMB willingness to pay for software, or on payment-method preference for SaaS subscriptions (card vs VA vs QRIS vs e-wallet).
- I found no official Jurnal (Mekari) pricing in this pass. Its plans are generally higher-priced accounting tiers (unverified).
- I found no published freemium-to-paid conversion rates for Indonesian SMB apps.

## 4. Why SMB SaaS fails or churns in Indonesia, and what made winners succeed

### Takeaway
The free bookkeeping-app wave of 2019-2022 (BukuKas/Lummo, BukuWarung) acquired millions of free users but struggled to monetize subscriptions. Lummo raised US$80M in 2022, pivoted to LummoSHOP, then wound down in 2023 and returned about US$70M to investors. BukuWarung shifted toward payments and EDC terminals with field sales. majoo grew with a paid subscription, sales reps in 100+ cities, and offline-to-online integrations. I found no detailed post-mortem on Lummo.

### Cited Findings
- BukuKas launched in Dec 2019 as a bookkeeping app for UMKM. In Nov 2020 it launched TOKKO, an online store builder later renamed LummoSHOP. It raised an US$80M Series C in early 2022 (Tiger Global, Sequoia India; Jeff Bezos participated). — [Bisnis.com](https://finansial.bisnis.com/read/20220120/563/1491154/platform-enabler-umkm-lummo-disuntik-pendanaan-seri-c-senilai-us80-juta)
- Mid-2023: Lummo laid off staff in India and Indonesia. Inc42's sources linked this to a shift in focus away from LummoShop; the company said only single-digit staff were affected in India. — [Inc42](https://inc42.com/buzz/sequoia-capital-backed-lummo-lays-off-50-indian-workforce/)
- 26 Apr 2023: Lummo was reported to be weighing a shutdown and returning over US$70M to investors. Later ACRA filings showed voluntary liquidation. CB Insights lists a Sept 2023 bankruptcy filing, a conflicting characterization. — [DealStreetAsia](https://www.dealstreetasia.com/stories/lummo-may-close-operations-340722); [DealStreetAsia](https://media.dealstreetasia.com/stories/indonesia-lummo-liquidation-360554); [CB Insights](https://www.cbinsights.com/company/bukukas)
- The Ken reported management weighing a sale or shutdown, with Sequoia India influencing the outcome. — [The Ken](https://the-ken.com/story/how-an-indonesian-saas-startups-destiny-may-be-rewritten-by-sequoia-india/)
- BukuWarung: originally a free replacement for pen-and-paper ledgers, with plans for credit, savings and insurance. It added digital payments (bank, OVO, DANA) and raised a US$60M Series A in 2021 (Valar, Goodwater). — [KrASIA](https://amp.kr-asia.com/bukuwarung-snags-usd-60-million-in-new-round-led-by-peter-thiels-valar-ventures-and-goodwater); [e27](https://e27.co/bukuwarung-rakes-in-us60m-to-build-an-os-for-indonesias-60m-msmes-20210609/); [TechCrunch](https://techcrunch.com/?p=2052983)
- 2025-2026 BukuWarung job listings are mainly "Sales Canvassing EDC" contract roles across regencies (Nias, Klungkung, Banjarnegara, Lampung, Pasaman Barat, etc.). This shows a field-sales, payments-terminal model reaching tier-2/3 regions. — [Kalibrr](https://www.kalibrr.com/id-ID/c/buku-warung/jobs/267109/sales-canvassing-edc-lampung-barat); [Kalibrr](https://www.kalibrr.com/id-ID/c/buku-warung/jobs/267016/sales-canvassing-edc-banjarnegara)
- majoo:
  - Sells a monthly SaaS subscription with POS as the entry product, expanding into inventory, CRM, online store and marketplace or GrabFood integrations.
  - Has sales representatives in more than 100 cities.
  - Reported strong pandemic growth (figures vary: 250%, 800%, "8x").
  - Raised US$9M pre-Series A (AC Ventures, Quona, BRI Ventures, Xendit; 2021-22), then a Series A (reported as Rp149B / about US$10M).
  - Sources: [DailySocial](https://en.dailysocial.id/post/majoo-announces-funding-of-566-billion-rupiah-from-ac-ventures-bri-ventures-and-xendit); [Jakarta Post](https://thejakartapost.com/paper/2022/02/13/majoo-bags-5m-more-in-pre-series-a-round); [DailySocial Series A](https://en.dailysocial.id/post/majoo-rampungkan-pendanaan-seri-a-senilai-149-miliar-rupiah); [Invisible Hand](https://invisiblehand.beehiiv.com/p/majoo-indonesia-answer-to-shopify); [Yespress](https://yespress.io/majoo-indonesia)

### Inferences
- Lesson from Lummo and BukuWarung: free single-purpose tools such as digital ledgers produce large but low-intent user bases that do not convert to subscriptions. Venture-scale outcomes then depend on payments or lending, and pivots (store builder, EDC) burned capital. A pet hotel SaaS should charge early, tie value directly to revenue (bookings, deposits, fewer no-shows), and avoid relying on free users to monetize later.
- Lesson from majoo and Moka: paid POS that runs daily operations has stickier retention. They won with human-assisted sales and onboarding across many cities plus integrations (marketplace, delivery, payments). For a niche vertical like pet hotels, the equivalent is founder-led or partner-led onboarding: demo visits, WA video calls, migrating the hotel's existing booking book or Excel, and partnerships with pet shops, vets and communities.
- Vertical focus helps: horizontal UMKM tools faced heavy competition and low switching costs. A pet-specific product (vaccination records, kennel occupancy, feeding schedules, owner photo updates) has fewer direct substitutes beyond WhatsApp plus paper or Excel.

### Gaps
- I found no reliable primary post-mortem of Lummo's failure, or Lummo or BukuWarung churn and conversion metrics.
- Moka's history (GoTo/Gojek acquisition in 2020, hardware bundles, onboarding model) was not sourced in this pass; verify separately.
- I found no sources on Qasir, Olsera or Kasir Pintar go-to-market (resellers, hardware bundles), or on Jurnal/Mekari's SMB sales model.
- I found no evidence on hardware bundles (tablets, printers) as a growth driver, though it is commonly assumed.

## 5. UX principles for non-tech-savvy UMKM owners

### Takeaway
Direct Indonesian evidence on UX patterns is thin. The available sources point to low digital literacy, even for features of free tools like WhatsApp Business. Combined with the device and channel data above, this supports a Bahasa Indonesia, Android-first, minimal-input, WhatsApp-integrated design with human-assisted onboarding.

### Cited Findings
- Limited digital literacy is the main barrier: UMKM owners do not use WhatsApp Business catalogs or labels even though these are free. — [Jurnal PCR 2024](https://jurnal.pcr.ac.id/index.php/jakb/article/view/6443/2217)
- Software penetration outside Jakarta is much lower ("Jakarta bubble"); manual processes dominate. — [Crowdfund Insider](https://www.crowdfundinsider.com/?p=171138)
- Successful players use local sales reps across 100+ cities (majoo) and regional field canvassers (BukuWarung). — [DailySocial](https://en.dailysocial.id/post/majoo-announces-funding-of-566-billion-rupiah-from-ac-ventures-bri-ventures-and-xendit); [Kalibrr](https://www.kalibrr.com/id-ID/c/buku-warung/jobs/267070/sales-canvassing-edc-nias)
- 46% of Indonesian consumers trust digital finance providers less than banks, so trust signals matter. — [Google e-Conomy SEA 2025 ID](https://blog.google/intl/id-id/company-news/outreach-initiatives/e-conomy-sea-2025-ekonomi-digital-indonesia-mendekati-gmv-us100-miliar/)

### Inferences (design recommendations; not directly sourced)
- Language: Bahasa Indonesia by default, in casual, non-accounting wording ("Tamu", "Anabul", "Kamar/Kandang", "DP", "Lunas"), with English optional.
- Minimal input: one-screen booking (pet name, owner WA number, dates, room), with autofill for returning customers from their phone number. Use photo capture rather than forms for pet condition at check-in. Prefer large tap targets and pickers over typing.
- Offline tolerance: cache today's bookings and allow check-in and check-out offline with later sync. This matters given connectivity in tier-2/3 areas; I found no direct source in this pass.
- Lightweight: a PWA or small Android APK that performs on low-RAM devices, with low data usage.
- WhatsApp as the interface for the end customer: booking confirmation, invoice or QRIS link, and daily photo updates go out via WA, so the customer never installs an app.
- Onboarding: WA-based support (a CS number), short vertical videos in Bahasa, assisted data import (photo of a paper ledger or Excel), and an optional video-call or visit setup. Recruit early users through pet communities, vets and pet shops.
- Trust: show the business's own name and branding on invoices; route payments through recognized QRIS or VA providers; make data export easy.

### Gaps
- I found no Indonesian usability studies or published onboarding and activation metrics from majoo, Moka, Qasir and similar companies.
- I found no data on offline-mode usage or on the impact of video or WA onboarding on activation or churn in Indonesian SMB SaaS.
- I found nothing specific to pet hotels or pet services in Indonesia within this scope.
