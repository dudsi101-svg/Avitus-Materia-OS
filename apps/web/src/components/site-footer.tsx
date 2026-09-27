import Link from 'next/link';
import { BrandMark } from './brand-mark';

export function SiteFooter() {
  return (
    <footer className="v04Footer">
      <div className="v04Shell v04FooterGrid">
        <div className="v04FooterBrand">
          <BrandMark compact />
          <div>
            <strong>AVITUS MATERIA</strong>
            <p>Naturalne materiały. Rzeczywiste historie.</p>
          </div>
        </div>
        <div>
          <span className="v04FooterLabel">MARKA</span>
          <Link href="/o-nas">O nas</Link>
          <Link href="/realizacje">Realizacje</Link>
          <Link href="/kolekcje">Kolekcje</Link>
        </div>
        <div>
          <span className="v04FooterLabel">WSPÓŁPRACA</span>
          <Link href="/kreator">Kreator</Link>
          <Link href="/dla-firm">Dla firm</Link>
          <Link href="/kontakt">Kontakt</Link>
        </div>
        <div>
          <span className="v04FooterLabel">KONTAKT</span>
          <a href="tel:+48724042596">+48 724 042 596</a>
          <span>Krzesimów 56A · 21-007 Mełgiew</span>
          <a href="mailto:biuro@stolarnia-drakkar.pl">biuro@stolarnia-drakkar.pl</a>
        </div>
      </div>
    </footer>
  );
}
