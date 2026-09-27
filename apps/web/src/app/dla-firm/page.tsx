import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'Dla firm',
  description: 'Avitus Materia dla architektów, inwestorów i partnerów wykonawczych.',
};

export default function BusinessPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">B2B</p>
          <h1>Dla architektów, inwestorów i partnerów.</h1>
          <p>
            Chcemy budować nie tylko sprzedaż detaliczną, ale również uporządkowany model współpracy z projektantami, wykonawcami i firmami, które potrzebują powtarzalnej jakości, szybkiej wyceny i przewidywalnego procesu.
          </p>
        </div>
      </section>
      <section className="v04Section v04SectionWarm">
        <div className="v04Shell v04PageGrid">
          <article className="v04TextCard"><h3>Architekci i projektanci</h3><p>Wsparcie materiałowe, warianty wykonania, dokumentacja realizacji oraz później własna przestrzeń do śledzenia projektów.</p></article>
          <article className="v04TextCard"><h3>Hotele i gastronomia</h3><p>Meble, zabudowy i elementy wnętrz projektowane pod intensywne użytkowanie i spójność całej przestrzeni.</p></article>
          <article className="v04TextCard"><h3>Sieć wykonawcza</h3><p>Docelowo Avitus Materia OS ma umożliwiać bezpieczne przekazywanie części zleceń zweryfikowanym podwykonawcom przy zachowaniu standardu jakości.</p></article>
          <article className="v04TextCard"><h3>Serie i powtarzalne modele</h3><p>Po ustabilizowaniu konfiguracji i kosztów wybrane produkty mogą być wyceniane szybciej i wykonywane w krótszym, bardziej przewidywalnym cyklu.</p></article>
        </div>
        <div className="v04Shell v04Actions"><Link className="v04Button v04ButtonPrimary" href="/kontakt">Porozmawiajmy o współpracy</Link></div>
      </section>
      <section className="v04Band">
        <div className="v04Shell v04BandGrid">
          <div><p className="v04Tag">Avitus Materia OS</p><h2>Jedna historia projektu zamiast dziesięciu wątków.</h2></div>
          <div><p>Docelowo oferta B2B będzie korzystać z tych samych danych co sprzedaż, konfiguracja i produkcja: wersje wycen, akceptacje, pliki, terminy, realizacje i rozliczenia.</p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
