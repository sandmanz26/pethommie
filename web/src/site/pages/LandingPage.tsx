import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { useSiteT } from "@/site/i18n/useSiteT";
import { TopBar } from "@/site/components/layout/TopBar";
import { Footer } from "@/site/components/layout/Footer";
import { InkFilm } from "@/site/components/ink/InkFilm";
import { film } from "@/site/content/film";
import { Hero } from "@/site/sections/Hero";
import { ProductTour } from "@/site/sections/ProductTour";
import { Features } from "@/site/sections/Features";
import { Pricing } from "@/site/sections/Pricing";
import { Faq } from "@/site/sections/Faq";
import { FinalCta } from "@/site/sections/FinalCta";

/**
 * The story first (one stay, scrubbed by scroll), then the proof (real screens), what it does, what it costs,
 * the questions people ask, and one last ask.
 */
export function LandingPage() {
  const { t } = useSiteT();
  useDocumentMeta({ title: t.meta.title, description: t.meta.description, themeColor: film.paper });
  return (
    <>
      <TopBar />
      <main id="top">
        <InkFilm film={film} intro={<Hero />} />
        <ProductTour />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
