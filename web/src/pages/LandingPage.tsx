import { TopBar } from "../components/layout/TopBar";
import { Footer } from "../components/layout/Footer";
import { InkFilm } from "../components/ink/InkFilm";
import { FilmSwitcher } from "../components/film-switcher/FilmSwitcher";
import { films } from "../content/film";
import { useFilmChoice } from "../hooks/useFilmChoice";
import { Hero } from "../sections/Hero";
import { Features } from "../sections/Features";
import { RaporPreview } from "../sections/RaporPreview";
import { LebaranPackage } from "../sections/LebaranPackage";
import { WaitlistForm } from "../sections/WaitlistForm";

export function LandingPage() {
  const [filmId, setFilmId] = useFilmChoice();
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
