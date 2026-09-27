// Production release marker: v0.4 realization-first public site.
import Link from 'next/link';
import { InquiryForm } from '../components/inquiry-form';
import { RealizationGrid } from '../components/realization-grid';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { collectionCopy } from '../lib/realizations';

const materials = [
  ['01', 'Stary dąb', 'Drewno z historią, pozyskiwane z rozbiórek. Zachowujemy spękania, ślady czasu i indywidualny rysunek.'],
  ['02', 'Naturalny dąb', 'Selekcjonowany materiał, szczotkowanie, olejowanie i ręczne wykończenie zamiast przykrywania struktury.'],
  ['03', 'Drewno z odzysku', 'Materiał, który nie kończy życia wraz ze starym budynkiem. Oczyszczamy go, selekcjonujemy i nadajemy mu nową funkcję.'],
] as const;

const process = [
  ['01', 'Rozmowa', 'Wymiary, zdjęcia miejsca, inspiracje i funkcja. Nie potrzebujesz gotowego projektu.'],
  ['02', 'Kierunek i wycena', 'Dobieramy materiał, proporcje i rozwiązania. Powstaje indywidualna propozycja oraz wycena.'],
  ['03', 'Wykonanie', 'Projekt trafia do produkcji. Ustalenia i kolejne etapy pozostają w jednym uporządkowanym procesie.'],
  ['04', 'Odbiór i relacja', 'Kontrola wykonania, montaż lub odbiór, a później historia projektu i serwis.'],
] as const;

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section
        className="v04Hero"
        style={{ backgroundImage: "url('https://stolarnia-drakkar.pl/wp-content/uploads/2026/03/1000233841.jpg')" }}
      >
        <div className="v04Shell v04HeroInner">
          <p className="v04Eyebrow">Rzemiosło · naturalne materiały · indywidualny projekt</p>
          <h1>Drewno z historią. Formy na pokolenia.</h1>
          <p className="v04HeroLead">
            Tworzymy meble i elementy wnętrz z litego oraz odzyskanego drewna. Prawdziwe realizacje są punktem wyjścia — potem dopasowujemy materiał, proporcje i funkcję do konkretnego miejsca.
          </p>
          <div className="v04Actions">
            <Link className="v04Button v04ButtonPrimary" href="/realizacje">Zobacz realizacje</Link>
            <Link className="v04Button v04ButtonGhost" href="/kreator">Skonfiguruj kierunek</Link>
          </div>
          <div className="v04HeroMeta">
            <span>STARY DĄB</span><span>NATURALNY DĄB</span><span>DREWNO Z ODZYSKU</span><span>PROJEKT INDYWIDUALNY</span>
          </div>
        </div>
      </section>

      <section className="v04Section v04SectionWarm">
        <div className="v04Shell v04Intro">
          <div>
            <p className="v04Tag">Avitus Materia</p>
            <h2>Naturalny materiał nie potrzebuje przebrania.</h2>
          </div>
          <p>
            Zachowujemy autentyczność materiału, ale porządkujemy proces jak nowoczesna firma: od inspiracji i konfiguracji, przez wycenę i wykonanie, po odbiór i późniejszą relację.
          </p>
        </div>
        <div className="v04Shell v04MaterialGrid">
          {materials.map(([number, title, text]) => (
            <article className="v04MaterialCard" key={number}>
              <small>{number}</small><h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="v04Section v04SectionDark">
        <div className="v04Shell v04Intro">
          <div>
            <p className="v04Tag">Prawdziwe realizacje</p>
            <h2>Najpierw zobacz, co już potrafimy.</h2>
          </div>
          <p>
            Zamiast stockowych wizualizacji pokazujemy prace z archiwum stolarni. Każda realizacja docelowo stanie się wejściem do konfiguratora: „podoba mi się — chcę podobny projekt”.
          </p>
        </div>
        <div className="v04Shell"><RealizationGrid limit={6} /></div>
        <div className="v04Shell v04Actions"><Link className="v04Button v04ButtonGhost" href="/realizacje">Pełna biblioteka realizacji</Link></div>
      </section>

      <section className="v04Section v04SectionDark">
        <div className="v04Shell v04Intro">
          <div><p className="v04Tag">Kolekcje</p><h2>Trzy języki. Jedna materia.</h2></div>
          <p>Kolekcje są kierunkami projektowymi, nie zamkniętym katalogiem produktów. Możesz zacząć od stylu, realizacji albo konkretnej funkcji.</p>
        </div>
        <div className="v04Shell v04CollectionGrid">
          {collectionCopy.map((collection) => (
            <article className="v04CollectionCard" key={collection.label}>
              <small>{collection.label}</small><h3>{collection.title}</h3><p>{collection.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="v04Section">
        <div className="v04Shell v04Intro">
          <div><p className="v04Tag">Proces</p><h2>Indywidualny projekt nie musi oznaczać chaosu.</h2></div>
          <p>Rzemiosło zostaje rzemiosłem. Uporządkowany przepływ informacji ma po prostu sprawić, że nic nie ginie między rozmową, wyceną, produkcją i odbiorem.</p>
        </div>
        <div className="v04Shell v04Process">
          {process.map(([number, title, text]) => (
            <article className="v04ProcessItem" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="v04QuoteBand">
        <div className="v04Shell">
          <blockquote>„Bardzo dobry kontakt z Panem Kubą, można liczyć na zdjęcia lub filmiki z procesu tworzenia mebli na każdym etapie.”</blockquote>
          <p>— opinia klienta z dotychczasowej historii stolarni</p>
        </div>
      </section>

      <section className="v04Band">
        <div className="v04Shell v04BandGrid">
          <div><p className="v04Tag">Avitus Materia OS</p><h2>Rzemiosło z cyfrowym zapleczem.</h2></div>
          <div>
            <p>
              Technologia ma być niewidoczna wtedy, kiedy nie jest potrzebna. Klient ma odczuć jej efekt: łatwiejszą konfigurację, czytelną wycenę, historię ustaleń i później status projektu w jednym miejscu.
            </p>
            <div className="v04Steps"><span>01 INSPIRACJA</span><span>02 KONFIGURACJA</span><span>03 WYCENA</span><span>04 REALIZACJA</span><span>05 RELACJA</span></div>
            <div className="v04Actions"><Link className="v04Button v04ButtonGhost" href="/kreator">Wejdź do kreatora</Link></div>
          </div>
        </div>
      </section>

      <section className="v04Contact" id="kontakt">
        <div className="v04Shell v04ContactGrid">
          <div className="v04ContactCopy">
            <p className="v04Tag">Nowy projekt</p>
            <h2>Zacznijmy od miejsca, materiału albo pomysłu.</h2>
            <p>Wystarczą orientacyjne wymiary, zdjęcie przestrzeni lub krótki opis potrzeby. Nie musisz mieć gotowego projektu.</p>
            <div className="v04ContactDetails">
              <a href="tel:+48724042596">+48 724 042 596</a>
              <span>Krzesimów 56A · 21-007 Mełgiew</span>
              <a href="mailto:biuro@stolarnia-drakkar.pl">biuro@stolarnia-drakkar.pl</a>
            </div>
          </div>
          <InquiryForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
