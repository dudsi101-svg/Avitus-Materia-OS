import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://avitus-materia.com'),
  title: {
    default: 'Avitus Materia — meble i wnętrza z drewna',
    template: '%s · Avitus Materia',
  },
  description:
    'Avitus Materia tworzy indywidualne meble i elementy wnętrz z drewna. Projekt, konfiguracja, wycena i realizacja w jednym procesie.',
  openGraph: {
    title: 'Avitus Materia',
    description: 'Indywidualne meble i wnętrza z drewna — od pomysłu do realizacji.',
    type: 'website',
    locale: 'pl_PL',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
