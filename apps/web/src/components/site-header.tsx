import Link from 'next/link';
import { BrandMark } from './brand-mark';

const links = [
  ['O nas', '/o-nas'],
  ['Realizacje', '/realizacje'],
  ['Kolekcje', '/kolekcje'],
  ['Kreator', '/kreator'],
  ['Dla firm', '/dla-firm'],
  ['Kontakt', '/kontakt'],
] as const;

export function SiteHeader() {
  return (
    <header className="v04Header">
      <div className="v04Shell v04HeaderInner">
        <Link className="v04Brand" href="/" aria-label="Avitus Materia — strona główna">
          <BrandMark compact />
          <span className="v04BrandCopy">
            <strong>AVITUS MATERIA</strong>
            <small>BUILT FOR GENERATIONS</small>
          </span>
        </Link>
        <nav className="v04Nav" aria-label="Główna nawigacja">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <Link className="v04NavCta" href="/kontakt">Rozpocznij projekt</Link>
        </nav>
      </div>
    </header>
  );
}
