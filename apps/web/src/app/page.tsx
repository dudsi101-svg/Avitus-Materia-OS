import { InquiryForm } from '../components/inquiry-form';

const materials = [
  {
    number: '01',
    title: 'Stary dąb',
    text: 'Drewno z historią — pozyskiwane z rozbiórek, z zachowanymi śladami czasu, spękaniami i niepowtarzalnym rysunkiem.',
  },
  {
    number: '02',
    title: 'Naturalny dąb',
    text: 'Selekcjonowany materiał o wyraźnej strukturze. Szczotkowanie, olejowanie i ręczne wykończenie wydobywają jego głębię zamiast ją przykrywać.',
  },
  {
    number: '03',
    title: 'Drewno z odzysku',
    text: 'Materiał, który nie kończy swojego życia wraz ze starym budynkiem. Oczyszczamy go, selekcjonujemy i nadajemy mu nową funkcję.',
  },
];

const collections = [
  {
    label: 'SORA',
    title: 'Spokojna forma. Precyzyjny detal.',
    text: 'Kierunek inspirowany Japandi: lekkość, naturalne proporcje i funkcjonalność bez wizualnego hałasu.',
  },
  {
    label: 'RUSTIC',
    title: 'Charakter materiału na pierwszym planie.',
    text: 'Rustykalne formy, w których stare i nowe drewno spotykają się z trwałą konstrukcją i wyrazistą strukturą.',
  },
  {
    label: 'OLD OAK',
    title: 'Stary dąb bez udawania nowego.',
    text: 'Kolekcja oparta na szlachetnym, starym dębie. Każdy element zachowuje indywidualne ślady czasu i własną historię.',
  },
];

const process = [
  ['01', 'Rozmowa', 'Wymiary, zdjęcia miejsca, inspiracje i funkcja. Nie potrzebujesz gotowego projektu.'],
  ['02', 'Kierunek i wycena', 'Dobieramy materiał, proporcje i rozwiązania. Powstaje indywidualna propozycja oraz wycena.'],
  ['03', 'Wykonanie', 'Projekt trafia do produkcji. Kluczowe ustalenia i kolejne etapy pozostają widoczne w jednym procesie.'],
  ['04', 'Odbiór', 'Gotowy mebel lub element wnętrza opuszcza pracownię dopiero po kontroli wykonania i wykończenia.'],
];

export default function HomePage() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="Avitus Materia — strona główna">
          <span className="brandMonogram">AM</span>
          <span className="brandCopy">
            <strong>AVITUS MATERIA</strong>
            <small>BUILT FOR GENERATIONS</small>
          </span>
        </a>
        <div className="navLinks">
          <a href="#o-nas">O nas</a>
          <a href="#materialy">Materiały</a>
          <a href="#kolekcje">Kolekcje</a>
          <a href="#proces">Proces</a>
          <a className="navCta" href="#kontakt">Rozpocznij projekt</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="shell heroGrid">
          <div className="heroCopy">
            <p className="eyebrow">Rzemiosło · naturalne materiały · indywidualny projekt</p>
            <h1>Drewno z historią. Formy na pokolenia.</h1>
            <p className="lead">
              Tworzymy indywidualne meble i elementy wnętrz z litego oraz odzyskanego drewna. Łączymy rzemiosło, świadomy dobór materiału i nowoczesny proces projektowy — od pierwszej rozmowy po gotową realizację.
            </p>
            <div className="heroActions">
              <a className="button primary" href="#kontakt">Opowiedz nam o projekcie</a>
              <a className="button ghost" href="#kolekcje">Poznaj kierunki</a>
            </div>
          </div>
          <div className="heroVisual" aria-hidden="true">
            <div className="oakFrame">
              <div className="oakGrain" />
              <div className="heroSeal">
                <span>AVITUS</span>
                <strong>MATERIA</strong>
                <small>CRAFTED IN WOOD</small>
              </div>
            </div>
            <span className="materialLabel">OAK · OLD OAK · RECLAIMED WOOD</span>
          </div>
        </div>
      </section>

      <section className="manifesto" id="o-nas">
        <div className="shell manifestoGrid">
          <p className="sectionTag">Avitus Materia</p>
          <div>
            <h2>Naturalny materiał nie potrzebuje przebrania.</h2>
            <p>
              Zaczynaliśmy od fascynacji drewnem, które przeżyło już jedno życie. Dziś pracujemy szerzej — ze starym dębem, naturalnym dębem, orzechem i drewnem z odzysku — ale zasada pozostaje ta sama: zachować autentyczność materiału i nadać mu formę, która będzie służyć przez lata.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section" id="materialy">
        <div className="sectionIntro splitIntro">
          <div>
            <p className="sectionTag">Materiały</p>
            <h2>Piękno zaczyna się przed pierwszym cięciem.</h2>
          </div>
          <p>
            Selekcja surowca jest częścią projektu. Preferujemy naturalne wykończenia — oleje i olejowoski — które podkreślają strukturę drewna zamiast tworzyć na nim sztuczną warstwę.
          </p>
        </div>
        <div className="materialGrid">
          {materials.map((material) => (
            <article className="materialCard" key={material.number}>
              <span>{material.number}</span>
              <div className={`materialTexture texture${material.number}`} aria-hidden="true" />
              <h3>{material.title}</h3>
              <p>{material.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="collectionsSection" id="kolekcje">
        <div className="shell">
          <div className="sectionIntro collectionsIntro">
            <p className="sectionTag light">Kolekcje</p>
            <h2>Trzy języki. Jedna materia.</h2>
          </div>
          <div className="collectionGrid">
            {collections.map((collection, index) => (
              <article className="collectionCard" key={collection.label}>
                <div className={`collectionVisual collectionVisual${index + 1}`} aria-hidden="true">
                  <span>{collection.label}</span>
                </div>
                <div className="collectionCopy">
                  <p className="collectionLabel">{collection.label}</p>
                  <h3>{collection.title}</h3>
                  <p>{collection.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section" id="proces">
        <div className="sectionIntro splitIntro">
          <div>
            <p className="sectionTag">Proces</p>
            <h2>Od pomysłu do przedmiotu, bez zgadywania.</h2>
          </div>
          <p>
            Projekty są indywidualne, ale proces nie powinien być chaotyczny. Dlatego porządkujemy ustalenia, konfigurację, wycenę i realizację w jednym przepływie.
          </p>
        </div>
        <div className="processGrid">
          {process.map(([number, title, text]) => (
            <article className="processItem" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="heritageBand">
        <div className="shell heritageGrid">
          <div>
            <p className="sectionTag light">Built for generations</p>
            <h2>Nie produkujemy anonimowych rzeczy.</h2>
          </div>
          <div>
            <p>
              Projektujemy meble pod konkretną przestrzeń i konkretnego człowieka. Możesz uczestniczyć w decyzjach dotyczących proporcji, materiału i wykończenia, a my pilnujemy strony technicznej i użytkowej.
            </p>
            <div className="qualityMarks">
              <span>INDYWIDUALNY PROJEKT</span>
              <span>NATURALNE WYKOŃCZENIA</span>
              <span>RZEMIEŚLNICZA KONTROLA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="configuratorBand">
        <div className="shell configuratorGrid">
          <div>
            <p className="sectionTag light">Avitus Materia OS</p>
            <h2>Rzemiosło z cyfrowym zapleczem.</h2>
          </div>
          <div>
            <p>
              Budujemy konfigurator połączony z historią realizacji, wyceną i planowaniem. Kolejne etapy pozwolą klientowi konfigurować produkt, dodać zdjęcie wnętrza i zobaczyć wizualizację przed rozpoczęciem produkcji.
            </p>
            <div className="configStatus">
              <span>01</span> konfiguracja
              <span>02</span> wycena
              <span>03</span> wizualizacja
            </div>
          </div>
        </div>
      </section>

      <section className="contactSection" id="kontakt">
        <div className="shell contactGrid">
          <div className="contactCopy">
            <p className="sectionTag">Nowy projekt</p>
            <h2>Zacznijmy od miejsca, materiału albo pomysłu.</h2>
            <p>
              Wystarczą orientacyjne wymiary, zdjęcie przestrzeni lub krótki opis potrzeby. Na tej podstawie możemy rozpocząć rozmowę, dobrać kierunek i przygotować dalszą konfigurację.
            </p>
            <div className="contactDetails">
              <a href="tel:+48724042596">+48 724 042 596</a>
              <span>Krzesimów 56A · 21-007 Mełgiew</span>
              <a href="mailto:biuro@stolarnia-drakkar.pl">biuro@stolarnia-drakkar.pl</a>
            </div>
          </div>
          <InquiryForm />
        </div>
      </section>

      <footer className="footer shell">
        <div className="brand footerBrand">
          <span className="brandMonogram">AM</span>
          <span className="brandCopy">
            <strong>AVITUS MATERIA</strong>
            <small>BUILT FOR GENERATIONS</small>
          </span>
        </div>
        <p>Natural materials · lasting meaning</p>
        <p>Avitus-Materia.com</p>
      </footer>
    </main>
  );
}
