import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { collectionCopy } from '../../lib/realizations';

export const metadata: Metadata = {
  title: 'Kolekcje',
  description: 'SORA, Rustic i Old Oak — trzy kierunki projektowe Avitus Materia.',
};

export default function CollectionsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">Kolekcje</p>
          <h1>Trzy języki. Jedna materia.</h1>
          <p>Kolekcja nie jest zamkniętym katalogiem. To język proporcji, materiałów i detalu, z którego możemy zbudować projekt pod konkretną przestrzeń.</p>
        </div>
      </section>
      <section className="v04Section v04SectionDark">
        <div className="v04Shell v04CollectionGrid">
          {collectionCopy.map((collection) => (
            <article className="v04CollectionCard" key={collection.label}>
              <small>{collection.label}</small>
              <h3>{collection.title}</h3>
              <p>{collection.text}</p>
              <div className="v04Actions"><Link className="v04Button v04ButtonGhost" href={`/kreator?kolekcja=${collection.label}`}>Użyj jako kierunku</Link></div>
            </article>
          ))}
        </div>
      </section>
      <section className="v04Section v04SectionWarm">
        <div className="v04Shell v04PageGrid">
          <article className="v04TextCard"><h3>SORA</h3><p>Spokojniejsze bryły, Japandi, lżejsze proporcje, naturalny dąb i precyzyjny detal.</p></article>
          <article className="v04TextCard"><h3>RUSTIC</h3><p>Wyraźna struktura, stare i nowe drewno, szczotkowanie, stal i bardziej surowa ekspresja materiału.</p></article>
          <article className="v04TextCard"><h3>OLD OAK</h3><p>Stary dąb pozostaje bohaterem projektu. Nie wygładzamy jego historii do anonimowego, nowego wyglądu.</p></article>
          <article className="v04TextCard"><h3>Między kolekcjami</h3><p>Możemy mieszać kierunki, jeśli funkcja i przestrzeń tego wymagają. Kolekcje pomagają zacząć rozmowę, nie ograniczają projektu.</p></article>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
