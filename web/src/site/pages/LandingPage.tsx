import { useRef } from "react";
import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { useScrollEffects } from "@/site/hooks/useScrollEffects";
import { useSiteT } from "@/site/i18n/useSiteT";
import { TopBar } from "@/site/components/layout/TopBar";
import { Footer } from "@/site/components/layout/Footer";
import { InkFilm } from "@/site/components/ink/InkFilm";
import { film } from "@/site/content/film";
import { Hero } from "@/site/sections/Hero";
import { Problem } from "@/site/sections/Problem";
import { BeforeAfter } from "@/site/sections/BeforeAfter";
import { ProductTour } from "@/site/sections/ProductTour";
import { Features } from "@/site/sections/Features";
import { Kinds } from "@/site/sections/Kinds";
import { LinkSpot } from "@/site/sections/LinkSpot";
import { Pricing } from "@/site/sections/Pricing";
import { Faq } from "@/site/sections/Faq";
import { FinalCta } from "@/site/sections/FinalCta";

/**
 * The story first (one stay, scrubbed by scroll), then what running without a system costs (three numbers), the same
 * desk before and after, what it does, who it is for, the booking link, the real app up close, what it costs, the
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
        <Problem />
        <BeforeAfter />
        <Features />
        <Kinds />
        <LinkSpot />
        <ProductTour />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
