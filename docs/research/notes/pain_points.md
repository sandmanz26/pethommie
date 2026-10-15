# Pet Hotel / Pet Boarding Pain Points: Operators and Pet Owners (Indonesia focus)

Research date: 2026-10-13. About 20 tool calls. Indonesian sources are labeled [ID]; global sources are labeled [GLOBAL]. Several key sources (Kompas Megapolitan, Pikiran Rakyat, Hukumonline premium) returned blank pages or 403 errors, so details from those come only from search snippets and are marked as such.

## Q1. Operator side: what do pet hotel operators struggle with?

### Takeaway
In Indonesia the most visible operator pain is the **Lebaran peak**. Demand jumps 3–4x, small hotels (12–30 slots) are fully booked well ahead, and bookings still come in by phone or WhatsApp. Every Indonesian academic requirements study found the same base problem: **manual paper/WhatsApp recordkeeping**. That causes lost pet history, calculation errors, duplicate data and slow reports. Global evidence adds no-shows/deposits (about 5–8% of bookings) and staffing as chronic problems.

### Cited Findings
**Peak capacity (Lebaran/mudik) [ID]**
- Petshop Indonesia (chain) saw boarding demand **up to 3x normal across all branches** before Lebaran 2022. One branch took about 50 animals/day and some branches were fully booked. Reservations were required, and staff assigned cages "based on which branch has space" (manual cross-branch capacity juggling). Prices: cats Rp35,000/day, dogs Rp45,000/day, food excluded — [IDX Channel, 29 Apr 2022](https://www.idxchannel.com/economics/jelang-lebaran-jasa-penitipan-hewan-meningkat-tiga-kali-lipat/all)
- A pet hotel in Pati that normally boards about 10 animals took **30–40** before Lebaran 2025 — [detikJateng](https://www.detik.com/jateng/jawa-tengah-meriah/d-7847427/libur-lebaran-penitipan-peliharaan-di-pati-laris-manis) (via search snippet)
- A Semarang cat hotel with **12 slots** was fully booked from about 7–8 April through 13–14 April 2024 (Lebaran). It was cats only, vaccination was mandatory, and it charged Rp45,000/day with owners supplying food. It was "temporarily" not accepting dogs — [Kompas TV, 8 Apr 2024](https://www.kompas.tv/regional/499042/tempat-penitipan-hewan-ramai-diserbu-pemudik)
- Tam Tam Petshop (Gresik) had **30 capacity, 20 filled**, at Rp55,000/day with owners bringing food. It "usually fills up around H-3/H-2". Sunny Pet Hotel (Surabaya) was **taking bookings by phone** and held 35 cats. Both stressed repeat customers and trust — [detikJatim, 15 Apr 2023](https://www.detik.com/jatim/berita/d-6675159/rumah-penitipan-hewan-mulai-banjir-peliharaan-titipan-pemilik-yang-mudik)
- Jakarta cat hotel at Rp180–200k/night was full for Lebaran 2025 — [CNBC Indonesia, 24 Mar 2025](https://www.cnbcindonesia.com/lifestyle/20250324162249-34-621296/potret-hotel-kucing-penuh-di-musim-mudik-lebaran-2025) (via search snippet)
- RSH UNAIR (Surabaya vet hospital) said its pet hotel reservations reached the **maximum quota** during Lebaran 2026 — [UNAIR](https://unair.ac.id/rsh-unair-berkomitmen-tetap-melayani-24-jam-dikala-libur-lebaran-2026/) (via search snippet)

**Manual records, bookkeeping and calculation errors [ID, academic requirements studies]**
- Juanda Petshop & Clinic (Depok): manual recording "sometimes causes losses", both material and in **customer trust** — [Jurnal String, Unindra](https://journal.lppmunindra.ac.id/index.php/STRING/article/download/2435/1833) (via search snippet)
- King Petshop & Animal Clinic (Bekasi): data not computerized. The proposed fix covered bookkeeping, data processing and transaction receipts to reduce human error — [Semnas Ristek 2021](https://proceeding.unindra.ac.id/index.php/semnasristek/article/download/4977/885) (via search snippet)
- Jurassic Pet Shop: customers had to come in person to drop off and pick up, and **manual payment caused calculation errors** — [Gaung Informatika, 2020](https://jurnal.usahidsolo.ac.id/index.php/GI/article/download/537/448/894) (via search snippet)
- PT Kumara Putra Indonesia / Loly Pet Station: manual records made pet history slow to find, transactions inaccurate and reports slow. Built a combined grooming + boarding + bookkeeping web system — [Jurnal Intekom](https://jurnal.intekom.id/index.php/njms/article/view/2104) (via search snippet)
- Radhiyan Pet & Care: sterilization/vaccination registrations kept in paper books. Problems were **duplicate or inaccurate data, lost pet data, and fee miscalculation** — [JRAMI, 2023](https://jim.unindra.ac.id/index.php/jrami/article/download/5305/1227) (via search snippet)

**No-shows and deposits [GLOBAL, vendor source]**
- About **5–8%** of kennel bookings are no-shows or very late cancellations ("industry figures", no source cited). The standard deposit is 25–30%, and 50% or non-refundable at peak. One kennel's no-shows fell from about 1 in 12 to "almost zero" after 30% online deposits. The post also recommends peak-season waitlists and reminders at 7 days, 48h and the morning of check-in — [KennelBooker blog, Dec 2025](https://www.kennelbooker.com/blog/how-to-reduce-no-shows-at-your-kennel.html) (vendor with commercial interest)

**Staffing [GLOBAL]**
- A Great Falls (US) facility turned clients away: "We have the capacity, but we don't have the help" — [KRTV](https://krtv.com/news/great-falls-news/staffing-shortage-hits-great-falls-pet-boarding-facility) (via search snippet)
- Seattle-area owners could wait months for boarding amid staffing shortages — [KING5](https://king5.com/article/news/local/pet-owners-could-wait-months-dog-boarding-amid-staffing-shortages/281-40a28e96-61bd-4e66-b19a-ee19d4bf42b8) (via search snippet)
- AAHA links the decline of traditional vet-clinic boarding to staffing, changing attitudes toward pets and financial factors — [AAHA Trends](https://www.aaha.org/trends-magazine/publications/traditional-boarding-services-run-into-changing-times/) (via search snippet)

**Communication workload [GLOBAL]**
- Consultant: "the biggest complaint I hear from clients isn't about the price—it's about the lack of communication" — cited in a search snippet from a [DoggieDashboard blog](https://blog.doggiedashboard.com/blog/risks-starting-dog-pet-boarding-business-nbs) (exact attribution unverified)

### Inferences
- Indonesian pet hotels are mostly **small (10–50 slots)**, run by pet shops or clinics, and bundled with grooming/retail/vet services. Software should handle boarding plus grooming plus POS together, as the Loly Pet Station system did.
- The Lebaran crunch is short and predictable: bookings open weeks ahead, the hotel fills by H-3/H-2, and demand runs 3–4x baseline. Booking still happens by phone/WA without a visible calendar. That combination makes double-booking, overbooking and unpaid holds likely. No Indonesian source explicitly documents a double-booking incident, though.
- "Owners bring their own food" is the norm, which adds per-pet feeding instructions and labelling. This is a likely source of feeding mix-ups. It is not directly evidenced.
- The Petshop Indonesia multi-branch overflow ("assign whichever branch has space") points to a need for cross-branch capacity views in chains.

### Gaps
- No Indonesian source quantifies no-show rates, deposit (DP) practices, or late pickups. Late pickup after Lebaran (owners returning late from mudik) is plausible but unsourced.
- No direct evidence on feeding/medication errors, shift handover failures, or pet fights in Indonesian facilities.
- I did not obtain the full text of the Indonesian journal papers. Findings come from abstracts/snippets, so the BAB III requirements tables were not reviewed.
- No source covers Indonesian staff turnover or wages for pet hotel attendants.

## Q2. Owner side: what do Indonesian pet owners complain about?

### Takeaway
The dominant owner fear is **a pet dying, getting sick or getting lost while boarded, combined with poor or late communication**. Every viral Indonesian case found centres on how the owner was (not) informed as much as on the death itself. Other owner pains: Lebaran slots vanish early, disease transmission (vaccination of other boarders), hygiene, and wanting daily reports/CCTV.

### Cited Findings
**Viral death/incident cases [ID]**
- **Maxi (bulldog, Tangerang Selatan, 2022):** boarded at a Serpong pet shop over Lebaran, 28 Apr – 10 May 2022 (11–12 days). The owner said he was sick and possibly injured at pickup and he died soon after. The owner reported the shop to police and started #JusticeForMaxi; the petition had about **31,831 signatures** by 24 May 2022. It was settled amicably and the shop apologized — [Kompas Megapolitan, 24 May 2022](https://megapolitan.kompas.com/read/2022/05/24/09325411/kesedihan-pemilik-anjing-yang-mati-usai-dititipkan-di-pet-shop-bikin?page=all); [Kompas, 26 Jul 2022](https://megapolitan.kompas.com/read/2022/07/26/20350331/kasus-anjing-mati-usai-dititipkan-di-pet-shop-serpong-berakhir-damai) (both pages blank on fetch, details from search snippets); [Hukumonline](https://www.hukumonline.com/stories/article/lt62b0761cad04b/perjanjian-penitipan-hewan-dan-masalah-hukum-yang-sering-muncul) (confirms dates and the "sick, possibly injured at pickup" account; the legal analysis is paywalled)
- **JJ (dog, Depok, Feb 2023):** dropped off 14:13 on 3 Feb 2023. By about 15:33 the facility called to say the dog had died, while the owner was in Semarang. The owner said the facility had promised a sanitary cage, **24-hour supervision, twice-daily cleaning, photo/video updates on request**, and walks. Reposted by celebrity Michelle Ziudith. The facility's lawyers disputed the article, citing **CCTV footage** as evidence, and Liputan6 issued a correction — [Liputan6, 12/16 Feb 2023](https://www.liputan6.com/showbiz/read/5204847/update-michelle-ziudith-syok-ada-kasus-anjing-mati-mengenaskan-saat-dititipkan-di-penitipan-binatang); [Viva](https://www.viva.co.id/showbiz/gosip/1574448-anjing-peliharaannya-mati-saat-dititipkan-michelle-ziudith-tuntut-ganti-rugi) (headline says compensation was demanded)
- **Sky (husky, Sawangan Depok, Jan 2019):** the owner found the dog dead, bloodied, in a dog-food sack at pickup. Allegations: **no call while the dog was dying, no notice of death, no diagnosis, no first aid**, and an Rp2.5M transfer made without the owner's knowledge. Claims were unverified and there were counter-claims — [Hipwee, 23 Jan 2019](https://www.hipwee.com/feature/anjing-mati-mengenaskan-di-tangan-pet-shop-pemilik-tanyakan-kenapa-anjingnya-sampai-berdarah-darah/) (older than the 2021+ preference, but illustrative)
- Asumsi used a viral dog death at a penitipan to raise the question of **petshop licensing procedures**, which suggests a regulatory vacuum — [Asumsi](https://asumsi.co/post/57552/viral-anjing-peliharaan-mati-di-penitipan-hewan-bagaimana-prosedur-perizinan-petshop/) (headline only)
- A Pikiran Rakyat report alleged dozens of dogs neglected to death at a boarding operator who was reportedly receiving monthly transfers — [Pikiran Rakyat](https://www.pikiran-rakyat.com/nasional/pr-014216818/viral-diduga-dapat-transferan-penitipan-hewan-tiap-bulan-tapi-puluhan-anjing-ditelantarkan-hingga-tewas) (403 on fetch; headline only, details unverified)

**Lost pets / escape during transfer and antar-jemput [ID social]**
- X user @hikokucing: "Uda beberapa kali lihat kasus kucing hilang waktu mau diantar pulang sama petshop/pet hotel", asking why cats weren't put in carriers indoors. This points to **pickup/delivery handling SOP gaps** — [X post](https://x.com/hikokucing/status/1780434884114387159)
- Threads/@gemoimedia shared a chat screenshot where a pet hotel owner immediately offered a cash amount after a cat went missing, which drew criticism — [Threads](https://www.threads.com/@gemoimedia/post/DWrAAJwFFhF/emang-gitu-ya-kalau-kucing-dititip-di-pet-hotel-terus-hilang-langsung-aja-sebut) (unverified)
- [Regional, MY] The cat "Oyen" escaped a Kelantan pet hotel when the door was left open while staff filmed a video. It was found after a month — [The Rakyat Post, Dec 2023](https://www.therakyatpost.com/trpbm/2023/12/27/oyen-hilang-dari-hotel-kucing-ditemui-semula-setelah-lebih-sebulan/)
- [Regional, MY] A cat fell ill on day 3 of a 5-day cat hotel stay and died; the story went viral on Twitter — [SAYS](https://says.com/my/seismik/pemilik-luah-kecewa-bila-kucing-mati-lepas-tinggal-5-hari-di-pet-hotel)

**Communication/monitoring gap [ID academic]**
- A UMN thesis on a dog boarding app (questionnaire + interviews + FGD) found owner–provider communication relies on **manual WhatsApp**, monitoring during boarding is limited, and **no medium summarizes the pet's welfare during the stay**. It rated problem urgency "cukup tinggi" — [UMN Knowledge Center](https://kc.umn.ac.id/id/eprint/34415/)

**Disease transmission [ID + GLOBAL]**
- A Bekasi vet advises vaccinating before boarding to reduce transmission, but "even vaccinated, animals can still get sick" — [CNA Indonesia](https://www.cna.id/lifestyle/tips-ajak-mudik-anabul-titip-pet-hotel-pet-sitter-liburan-30396) (via search snippet)
- Cats in pet shops, shelters, kennels and **boarding facilities** are more susceptible to panleukopenia (FPV). The virus spreads via feces, urine, secretions and contaminated cages/bowls, persists in the environment for months to years, and resists many disinfectants — [AVMA](https://www.avma.org/resources-tools/pet-owners/petcare/feline-panleukopenia); [Alodokter](https://www.alodokter.com/panleukopenia-penyakit-akibat-virus-yang-menyerang-kucing)
- Indonesian consumer guides tell owners to check vaccination requirements, flea-free status, vet availability, hygiene and ventilation, cat/dog separation, written agreements (duration, cost, feeding schedule, vet visits, **daily reports**), and **phone-accessible CCTV** — [ruparupa](https://www.ruparupa.com/blog/cara-memilih-tempat-penitipan-hewan/); [Shopee Inspirasi](https://shopee.co.id/inspirasi-shopee/hal-ini-harus-diperhatikan-saat-memilih-pet-hotel-untuk-si-peliharaan/); [Orami](https://www.orami.co.id/magazine/penitipan-kucing); [Hello Sehat](https://hellosehat.com/sehat/informasi-kesehatan/pet-hotel-jakarta/) (via search snippets)

**Slot scarcity at Lebaran [ID]**
- Operators advise booking "jauh-jauh hari" because many pet hotels are full near Lebaran (see Q1 sources: Kompas TV, detik, CNBC).

### Inferences
- **Information asymmetry is the core trust problem.** In Maxi, JJ and Sky, the dispute turned on what happened, when, and when the owner was told. A timestamped care log (feeding, stool, behaviour, photos, vet notes), owner-visible incident reports and a health check at intake would protect both sides. In the JJ case the operator defended itself with CCTV.
- Viral escalation is real and costly: a 31k-signature petition, police reports, a celebrity repost, and operator claims of revenue loss. Documented intake condition (photos, weight, health check at check-in) is a liability shield operators lack.
- Lebaran stays are long (Maxi: 11+ days), happen at peak capacity, and are often staffed by short-handed teams while staff also go home. This is likely the highest-risk window for illness and incidents. The link is inferred, not proven.
- Antar-jemput (pickup/delivery) is a distinct risk point for escapes.

### Gaps
- **No Indonesian viral case specifically about panleukopenia/parvo/scabies/ringworm contracted at a pet hotel** was found in news search. Anecdotes likely live on TikTok, IG and FB groups, which this toolset could not index.
- Google Maps review themes for Indonesian pet hotels, Kaskus threads and Reddit r/indonesia threads were not retrieved (search returned no relevant hits). This is the biggest evidence gap.
- No Indonesian survey quantifying owner preferences (e.g. % wanting daily photos or CCTV) was found.
- Price transparency complaints, and pricing by size (S/M/L dog) in Indonesia, are unsourced. The only price points found are flat per-species daily rates (Rp35k–55k/day budget; Rp180–200k/night premium Jakarta).

## Q3. What do existing pet software reviews say is still missing or painful?

### Takeaway
[GLOBAL] Capterra reviews of Gingr, KennelBooker, BusyPaws, Revelation Pets, PetSitClick and Time To Pet repeatedly mention: clunky multi-step booking, poor handling of **multi-pet households and mixed cat+dog facilities**, no daily activity logging for long stays, inflexible deposit/drop-off rules, online bookings arriving **without vaccine/health info**, weak financial reports and accounting integration, slow or unreliable performance, weekend support gaps, and price too high for small operators. No Indonesian-localized boarding SaaS reviews were found.

### Cited Findings
- Gingr: "shouldn't take 17 steps to schedule your dog for boarding" (1-star, Aug 2024). Also no useful weekend support; "almost unusable… 9+ seconds" per click; lost client records; could not accommodate a "very typical" kennel pricing system; too expensive for a small nonprofit; no notes on the lodging calendar — [Capterra Gingr reviews](https://www.capterra.com/p/136469/Gingr/reviews/?page=2) (multiple pages; via search summary)
- KennelBooker: a client's 5 dogs appear as 5 separate calendar slots; handles **cats + dogs poorly** in mixed facilities; a user built their own Airtable to **record daily activity** for long-stay dogs — [Capterra compare](https://www.capterra.com/compare/102808-143168/Kennel-Connection-vs-Kennel-Booker); [Capterra ZA](https://capterra.co.za/reviews/143168/kennel-booker)
- BusyPaws: users want to block certain drop-off/pickup days and to require a **partial deposit only** online; called the lack of direct support "incredibly frustrating" — [Capterra compare](https://www.capterra.com/compare/143168-231681/Kennel-Booker-vs-BusyPaws)
- Revelation Pets: online bookings arrive **without health, vaccine and contact details**, so staff chase customers with a separate form — [Capterra](https://www.capterra.com/p/129314/Revelation-Pets/reviews/?page=5)
- PetSitClick: "no financial business reports"; no Xero export — [Capterra](https://capterra.com/p/122471/PetSitClick/reviews/)
- Time To Pet: missed new clients after notification failures — [Capterra](https://capterra.com/p/144329/Time-To-Pet/reviews/)
- A user only used about 35% of a competitor's features, so it "wasn't worth the cost" — [Capterra ZA KennelBooker](https://capterra.co.za/reviews/143168/kennel-booker)

### Inferences
- Gaps that matter specifically for Indonesia, where Western tools are not built for local operators: WhatsApp-native communication (not email/SMS), IDR pricing and local payments (QRIS, bank transfer DP), Bahasa Indonesia UI, the Lebaran surge calendar (H-x booking windows, peak surcharges, mandatory DP), cat-heavy mixed facilities, owner-supplied food tracking, and price points affordable for 10–30 slot shops.
- Indonesian academic systems (Java desktop, PHP web) focus on recordkeeping and receipts. They rarely address owner-facing transparency (daily report/photo feed), incident documentation, or vaccine verification workflows. That looks like whitespace, but full texts were not reviewed.

### Gaps
- No reviews of Indonesian or SEA pet business software (local POS such as Moka/Majoo used by pet shops, or any local pet hotel app) were found.
- MoeGo/Gingr blog content on boarding challenges was not fetched in full.

## Q4. Ranked problem list (synthesis)

### Takeaway
Ranked by evidence strength × severity × how poorly current tools solve it in Indonesia. The top three problems are **trust/transparency during the stay**, **incident and liability documentation**, and **Lebaran peak capacity/booking management**.

### Cited Findings
1. **Owner trust and transparency gap (daily updates, photos, welfare summary).** WA-only communication and limited monitoring ([UMN](https://kc.umn.ac.id/id/eprint/34415/)); "photo/video updates on request" promised but not delivered in the JJ case ([Liputan6](https://www.liputan6.com/showbiz/read/5204847/update-michelle-ziudith-syok-ada-kasus-anjing-mati-mengenaskan-saat-dititipkan-di-penitipan-binatang)); guides tell owners to demand daily reports and CCTV ([ruparupa](https://www.ruparupa.com/blog/cara-memilih-tempat-penitipan-hewan/)). Global software lacks daily activity logs ([KennelBooker review](https://capterra.co.za/reviews/143168/kennel-booker)).
2. **Incidents (death, illness, injury, escape) and liability disputes, with no documented intake condition or timeline.** Maxi/JJ/Sky cases, a 31k petition, police reports ([Kompas](https://megapolitan.kompas.com/read/2022/07/26/20350331/kasus-anjing-mati-usai-dititipkan-di-pet-shop-serpong-berakhir-damai), [Hipwee](https://www.hipwee.com/feature/anjing-mati-mengenaskan-di-tangan-pet-shop-pemilik-tanyakan-kenapa-anjingnya-sampai-berdarah-darah/)); escapes during delivery ([X](https://x.com/hikokucing/status/1780434884114387159)). The legal framework for animals as "barang titipan" is unclear ([Hukumonline](https://www.hukumonline.com/stories/article/lt62b0761cad04b/perjanjian-penitipan-hewan-dan-masalah-hukum-yang-sering-muncul)).
3. **Lebaran/peak capacity: overflow, phone/WA bookings, fully booked by H-3.** Demand 3–4x ([IDX](https://www.idxchannel.com/economics/jelang-lebaran-jasa-penitipan-hewan-meningkat-tiga-kali-lipat/all), [detik Pati](https://www.detik.com/jateng/jawa-tengah-meriah/d-7847427/libur-lebaran-penitipan-peliharaan-di-pati-laris-manis)); owners struggle to find slots ([Kompas TV](https://www.kompas.tv/regional/499042/tempat-penitipan-hewan-ramai-diserbu-pemudik)).
4. **Manual records, leading to lost pet history, duplicate data, billing miscalculation and slow reports.** Five Indonesian requirements studies ([Intekom](https://jurnal.intekom.id/index.php/njms/article/view/2104), [JRAMI](https://jim.unindra.ac.id/index.php/jrami/article/download/5305/1227), [Gaung Informatika](https://jurnal.usahidsolo.ac.id/index.php/GI/article/download/537/448/894), [String](https://journal.lppmunindra.ac.id/index.php/STRING/article/download/2435/1833), [Semnas Ristek](https://proceeding.unindra.ac.id/index.php/semnasristek/article/download/4977/885)).
5. **Disease transmission and vaccination verification.** Vaccination is required but verification is manual; FPV persists in the environment ([AVMA](https://www.avma.org/resources-tools/pet-owners/petcare/feline-panleukopenia)); online bookings arrive without vaccine data ([Revelation Pets review](https://www.capterra.com/p/129314/Revelation-Pets/reviews/?page=5)).
6. **No-shows and deposits at peak.** 5–8% no-shows globally; 30% DP nearly eliminates them ([KennelBooker blog](https://www.kennelbooker.com/blog/how-to-reduce-no-shows-at-your-kennel.html)). Software deposit rules are inflexible ([BusyPaws reviews](https://www.capterra.com/compare/143168-231681/Kennel-Booker-vs-BusyPaws)).
7. **Software fit and cost for small operators.** Clunky booking, poor multi-pet and cat+dog handling, weak financial reports, too expensive ([Capterra Gingr](https://www.capterra.com/p/136469/Gingr/reviews/?page=2), [PetSitClick](https://capterra.com/p/122471/PetSitClick/reviews/)).
8. **Staffing (capacity limited by staff, not cages).** [GLOBAL] [KRTV](https://krtv.com/news/great-falls-news/staffing-shortage-hits-great-falls-pet-boarding-facility).
9. **Pickup/delivery (antar-jemput) logistics and escape risk.** Social evidence only ([X](https://x.com/hikokucing/status/1780434884114387159)).

### Inferences
- Problems 1, 2 and 5 are linked. A per-stay digital "rapor" or care log, fed by staff photo check-ins, intake health checks and vaccine card uploads and shared over WhatsApp, would address owner trust, operator liability and disease control at once. Based on the reviews found, no existing tool targets this for Indonesian small operators.
- Problem 3 is the most acute seasonal pain, and the clearest moment of willingness to pay (DP collection, waitlists, peak pricing).

### Gaps
- The ranking is qualitative. There is no Indonesian quantitative survey of operators or owners. Primary interviews with 10–20 pet hotel operators, plus scraping Google Maps 1–2 star reviews of Indonesian pet hotels, would validate the order.
- Feeding/medication errors, late pickups, shift handovers, and pricing by pet size are plausible but **unsourced for Indonesia**.
