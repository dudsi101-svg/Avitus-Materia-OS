import type { Metadata } from 'next';
import { RealizationGrid } from '../../components/realization-grid';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'Realizacje',
  description: 'Prawdziwe realizacje Avitus Materia i archiwum dotychczasowych prac stolarni.',
};

export default function RealizationsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">Realizacje</p>
          <h1>Nie wizualizacje. Rzeczy, które naprawdę powstały.</h1>
          <p>
            Biblioteka realizacji będzie jednym z najważniejszych zasobów Avitus Materia. Każdy projekt ma z czasem zawierać zdjęcia, materiał, wymiary, czas wykonania, kosztorys historyczny i warianty — tak, aby kolejne wyceny były coraz lepsze.
          </p>
        </div>
      </section>
      <section className="v04Section v04SectionDark">
        <div className="v04Shell"><RealizationGrid /></div>
      </section>
      <section className="v04Band">
        <div className="v04Shell v04BandGrid">
          <div><p className="v04Tag">Jak z tego korzystać</p><h2>Zainspiruj się, nie kopiuj 1:1.</h2></div>
          <div><p>Wybierz realizację jako punkt startowy. W kreatorze zmienimy proporcje, materiał i funkcję pod Twoją przestrzeń. Docelowo każda karta będzie mogła zasilać konfigurator i wstępną wycenę.</p></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
