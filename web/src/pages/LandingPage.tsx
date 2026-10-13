import { TopBar } from "../components/layout/TopBar";
import { Footer } from "../components/layout/Footer";
import { InkFilm } from "../components/ink/InkFilm";
import { Hero } from "../sections/Hero";
import { Features } from "../sections/Features";
import { RaporPreview } from "../sections/RaporPreview";
import { LebaranPackage } from "../sections/LebaranPackage";
import { WaitlistForm } from "../sections/WaitlistForm";

export function LandingPage() {
  return (
    <>
      <TopBar />
      <main id="top">
        <InkFilm intro={<Hero />} />
        <Features />
        <RaporPreview />
        <LebaranPackage />
        <WaitlistForm />
      </main>
      <Footer />
    </>
  );
}
