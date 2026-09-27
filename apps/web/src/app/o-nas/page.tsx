import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'O nas',
  description: 'Avitus Materia — rzemiosło, naturalne drewno, stare materiały i nowoczesny proces projektowy.',
};

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">O nas</p>
          <h1>Materia, która już coś przeżyła.</h1>
          <p>
            Avitus Materia wyrasta z doświadczenia stolarni pracującej ze starym drewnem, dębem i projektami indywidualnymi. Zachowujemy to, co najcenniejsze — materiał, ręczną pracę i bliski kontakt z klientem — a porządkujemy całą resztę.
          </p>
        </div>
      </section>

      <section className="v04Section v04SectionWarm">
        <div className="v04Shell v04PageGrid">
          <article className="v04TextCard">
            <h3>Stare drewno nie jest wadą.</h3>
            <p>Ślady narzędzi, spękania, przebarwienia i nieregularność są częścią historii materiału. Projekt ma je wykorzystać, nie ukryć.</p>
          </article>
          <article className="v04TextCard">
            <h3>Klient uczestniczy w decyzjach.</h3>
            <p>Proporcje, funkcja, materiał i wykończenie są ustalane wspólnie. My pilnujemy strony technicznej, konstrukcji i trwałości.</p>
          </article>
          <article className="v04TextCard">
            <h3>Technologia ma pomagać.</h3>
            <p>Avitus Materia OS porządkuje zapytania, wyceny, konfiguracje, produkcję i historię projektu. Nie zastępuje rzemiosła — usuwa chaos wokół niego.</p>
          </article>
          <article className="v04TextCard">
            <h3>Built for generations.</h3>
            <p>Nie chodzi o szybką wymianę mebla po kilku latach. Chcemy tworzyć przedmioty, które można naprawić, odnowić, przekazać dalej i nadal chcieć mieć w domu.</p>
          </article>
        </div>
      </section>

      <section className="v04Band">
        <div className="v04Shell v04BandGrid">
          <div><p className="v04Tag">Następny krok</p><h2>Zobacz rzeczywiste realizacje.</h2></div>
          <div><p>Najlepszym opisem sposobu pracy są gotowe projekty i materiał w prawdziwym świetle.</p><div className="v04Actions"><Link className="v04Button v04ButtonGhost" href="/realizacje">Przejdź do realizacji</Link></div></div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
