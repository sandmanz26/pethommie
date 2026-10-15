import { useDocumentMeta } from "@/shared/hooks/useDocumentMeta";
import { useSiteT } from "@/site/i18n/useSiteT";
import { TopBar } from "@/site/components/layout/TopBar";
import { Footer } from "@/site/components/layout/Footer";
import { InkFilm } from "@/site/components/ink/InkFilm";
import { FilmSwitcher } from "@/site/components/film-switcher/FilmSwitcher";
import { films } from "@/site/content/film";
import { useFilmChoice } from "@/site/hooks/useFilmChoice";
import { Hero } from "@/site/sections/Hero";
import { Features } from "@/site/sections/Features";
import { RaporPreview } from "@/site/sections/RaporPreview";
import { LebaranPackage } from "@/site/sections/LebaranPackage";
import { WaitlistForm } from "@/site/sections/WaitlistForm";

export function LandingPage() {
  const [filmId, setFilmId] = useFilmChoice();
  const { t } = useSiteT();
  useDocumentMeta({ title: t.meta.title, description: t.meta.description, themeColor: films[filmId].paper });
  return (
    <>
      <TopBar />
      <main id="top">
        {/* Keyed by film so switching remounts and preloads the new frames. */}
        <InkFilm key={filmId} film={films[filmId]} intro={<Hero />} />
        <Features />
        <RaporPreview />
        <LebaranPackage />
        <WaitlistForm />
      </main>
      <Footer />
      <FilmSwitcher value={filmId} onChange={setFilmId} />
    </>
  );
}
