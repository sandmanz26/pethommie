import { useRef } from "react";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { useScrollEffects } from "@/site/hooks/useScrollEffects";
import { useSiteT } from "@/site/i18n/useSiteT";
import { TopBar } from "@/site/components/layout/TopBar";
import { Footer } from "@/site/components/layout/Footer";
import { InkFilm } from "@/site/components/ink/InkFilm";
import { film } from "@/site/content/film";
import { Hero } from "@/site/sections/Hero";
import { Cost } from "@/site/sections/Cost";
import { ProductTour } from "@/site/sections/ProductTour";
import { Features } from "@/site/sections/Features";
import { Kinds } from "@/site/sections/Kinds";
import { LinkSpot } from "@/site/sections/LinkSpot";
import { Compare } from "@/site/sections/Compare";
import { Insights } from "@/site/sections/Insights";
import { Pricing } from "@/site/sections/Pricing";
import { Faq } from "@/site/sections/Faq";
import { FinalCta } from "@/site/sections/FinalCta";

/**
 * The story first (one stay, scrubbed by scroll), then what running without it costs (the leaks, in money), the proof
 * (real screens), who it is for, what it does, what changes, the numbers, the booking link, what it costs, the
 * questions people ask, and one last ask. After the film, the page keeps moving with the scroll (useScrollEffects).
 */
export function LandingPage() {
  const { t } = useSiteT();
  useDocumentMeta({ title: t.meta.title, description: t.meta.description, themeColor: film.paper });
  const main = useRef<HTMLElement>(null);
  useScrollEffects(main);
  return (
    <>
      <TopBar />
      <main id="top" ref={main}>
        <InkFilm film={film} intro={<Hero />} />
        <Cost />
        <ProductTour />
        <Features />
        <Kinds />
        <Insights />
        <Compare />
        <LinkSpot />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
