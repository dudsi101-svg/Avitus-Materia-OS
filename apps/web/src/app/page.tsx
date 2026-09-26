import { InquiryForm } from '../components/inquiry-form';

const pillars = [
  {
    number: '01',
    title: 'Materia',
    text: 'Drewno dobierane do charakteru projektu — od współczesnego dębu po stare, niepowtarzalne elementy z własną historią.',
  },
  {
    number: '02',
    title: 'Projekt',
    text: 'Nie zaczynamy od katalogu. Zaczynamy od przestrzeni, funkcji i proporcji, które mają działać przez lata.',
  },
  {
    number: '03',
    title: 'Wykonanie',
    text: 'Projekt przechodzi przez jeden cyfrowy proces: konfigurację, wycenę, produkcję i kontrolę realizacji.',
  },
];

const productDirections = [
  ['Stoły i blaty', 'Indywidualne wymiary, krawędzie, wykończenia i konstrukcje.'],
  ['Meble na wymiar', 'Zabudowy i pojedyncze obiekty projektowane pod konkretną przestrzeń.'],
  ['Stare drewno', 'Nowe funkcje dla materiału z historią — z zachowaniem charakteru i śladów czasu.'],
  ['Elementy wnętrz', 'Panele, ściany, półki, detale i niestandardowe elementy architektoniczne.'],
];

export default function HomePage() {
  return (
    <main>
      <nav className="nav shell">
        <a className="wordmark" href="#top" aria-label="Avitus Materia — strona główna">
          <span>AVITUS</span>
          <span>MATERIA</span>
        </a>
        <div className="navLinks">
          <a href="#materia">Materia</a>
          <a href="#proces">Proces</a>
          <a href="#projekty">Projekty</a>
          <a className="navCta" href="#kontakt">Rozpocznij projekt</a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="heroCopy">
          <p className="eyebrow">Avitus Materia · custom woodcraft</p>
          <h1>Przedmioty z drewna, które zaczynają się od miejsca.</h1>
          <p className="lead">
            Projektujemy i wykonujemy indywidualne meble oraz elementy wnętrz. Łączymy rzemiosło, materiał i cyfrowy proces, żeby od pierwszego pomysłu do gotowej realizacji było mniej chaosu i więcej kontroli.
          </p>
          <div className="heroActions">
            <a className="button primary" href="#kontakt">Opowiedz nam o projekcie</a>
            <a className="button ghost" href="#proces">Zobacz jak pracujemy</a>
          </div>
        </div>
        <div className="heroObject" aria-hidden="true">
          <div className="woodPlane woodPlaneOne" />
          <div className="woodPlane woodPlaneTwo" />
          <span className="materialLabel">OAK · CUSTOM · 01</span>
        </div>
      </section>

      <section className="manifesto" id="materia">
        <div className="shell manifestoGrid">
          <p className="sectionTag">Materia ponad modą</p>
          <div>
            <h2>Nie chcemy produkować kolejnych anonimowych rzeczy.</h2>
            <p>
              Dobre drewno starzeje się razem z wnętrzem. Dlatego interesują nas proporcja, dotyk, detal i pochodzenie materiału — nie krótkotrwały efekt katalogowy.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section" id="proces">
        <div className="sectionIntro">
          <p className="sectionTag">Proces</p>
          <h2>Od rozmowy do rzeczywistego obiektu.</h2>
        </div>
        <div className="pillarGrid">
          {pillars.map((pillar) => (
            <article className="pillar" key={pillar.number}>
              <span>{pillar.number}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="configuratorBand">
        <div className="shell configuratorGrid">
          <div>
            <p className="sectionTag light">Konfigurator Avitus Materia</p>
            <h2>Docelowo klient zobaczy projekt zanim drewno trafi na stół.</h2>
          </div>
          <div>
            <p>
              Budujemy konfigurator połączony z realną wyceną i historią realizacji. Kolejny etap doda zdjęcie pomieszczenia, warianty produktu i wizualizację w kontekście wnętrza.
            </p>
            <div className="configStatus">
              <span>01</span> konfiguracja
              <span>02</span> wycena
              <span>03</span> wizualizacja
            </div>
          </div>
        </div>
      </section>

      <section className="shell section" id="projekty">
        <div className="sectionIntro splitIntro">
          <div>
            <p className="sectionTag">Kierunki realizacji</p>
            <h2>Jedna pracownia, wiele skal.</h2>
          </div>
          <p>To pierwsza wersja nowego serwisu. Docelowe realizacje fotograficzne zostaną podpięte do centralnej biblioteki Avitus Materia OS.</p>
        </div>
        <div className="projectGrid">
          {productDirections.map(([title, text], index) => (
            <article className="projectCard" key={title}>
              <div className={`materialSwatch swatch${index + 1}`} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="contactSection" id="kontakt">
        <div className="shell contactGrid">
          <div className="contactCopy">
            <p className="sectionTag">Nowy projekt</p>
            <h2>Zacznijmy od tego, co chcesz stworzyć.</h2>
            <p>
              Nie musisz mieć gotowego projektu. Wystarczą wymiary, zdjęcie miejsca albo opis potrzeby. System zapisze zapytanie jako początek dalszej konfiguracji i wyceny.
            </p>
          </div>
          <InquiryForm />
        </div>
      </section>

      <footer className="footer shell">
        <div className="wordmark footerMark"><span>AVITUS</span><span>MATERIA</span></div>
        <p>Materia · projekt · wykonanie</p>
        <p>Avitus-Materia.com</p>
      </footer>
    </main>
  );
}
