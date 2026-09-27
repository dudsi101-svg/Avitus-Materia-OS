import type { Metadata } from 'next';
import { InquiryForm } from '../../components/inquiry-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Rozpocznij projekt z Avitus Materia.',
};

export default function ContactPage() {
  return (
    <main>
      <SiteHeader />
      <section className="v04PageHero">
        <div className="v04Shell">
          <p className="v04Tag">Kontakt</p>
          <h1>Nie musisz mieć gotowego projektu.</h1>
          <p>Wystarczy zdjęcie miejsca, orientacyjny wymiar, inspiracja albo opis problemu. Na tej podstawie możemy rozpocząć rozmowę i ustalić dalszy kierunek.</p>
        </div>
      </section>
      <section className="v04Contact">
        <div className="v04Shell v04ContactGrid">
          <div className="v04ContactCopy">
            <p className="v04Tag">Pracownia</p>
            <h2>Opowiedz nam, czego potrzebujesz.</h2>
            <p>Formularz zapisuje zapytanie w systemie Avitus Materia. To początek procesu — nie wiążące zamówienie ani automatyczna wycena.</p>
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
