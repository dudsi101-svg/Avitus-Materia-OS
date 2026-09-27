import type { Metadata } from 'next';
import Link from 'next/link';
import { ConfiguratorLite } from '../../components/configurator-lite';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'Kreator',
  description: 'Kreator Avitus Materia — wybierz kierunek, materiał i wymiary projektu.',
};

export default function ConfiguratorPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">Avitus Materia OS · Kreator v1</p>
          <h1>Od „podoba mi się” do konkretnego briefu.</h1>
          <p>
            Pierwsza wersja kreatora porządkuje najważniejsze decyzje bez udawania automatycznej wyceny. Następny etap połączy konfigurację z historią realizacji, kosztami i regułami wyceny.
          </p>
        </div>
      </section>
      <section className="v04Section v04SectionDark">
        <div className="v04Shell"><ConfiguratorLite /></div>
      </section>
      <section className="v04Section v04SectionWarm">
        <div className="v04Shell v04Intro">
          <div><p className="v04Tag">Trzy sposoby startu</p><h2>Nie każdy klient wie od razu, czego chce.</h2></div>
          <p>Kreator docelowo będzie działał w trybie szybkim, prowadzonym przez AI oraz na podstawie istniejącej realizacji. Wizualizacja we własnym wnętrzu jest późniejszą warstwą.</p>
        </div>
        <div className="v04Shell v04PageGrid">
          <article className="v04TextCard"><h3>01 · Szybki</h3><p>Wiesz, jaki mebel, materiał i mniej więcej jakie wymiary Cię interesują.</p></article>
          <article className="v04TextCard"><h3>02 · Prowadź mnie</h3><p>AI zadaje pytania o funkcję, miejsce, styl i priorytety, a potem składa z odpowiedzi brief.</p></article>
          <article className="v04TextCard"><h3>03 · Inspiracja</h3><p>Wybierasz jedną z prawdziwych realizacji Avitus i modyfikujesz ją pod swoją przestrzeń.</p></article>
          <article className="v04TextCard"><h3>04 · Moje wnętrze</h3><p>Docelowo: zdjęcie pomieszczenia, osadzenie wariantu i porównanie proporcji przed produkcją.</p></article>
        </div>
        <div className="v04Shell v04Actions"><Link className="v04Button v04ButtonPrimary" href="/kontakt">Przejdź do rozmowy o projekcie</Link></div>
      </section>
      <SiteFooter />
    </main>
  );
}
