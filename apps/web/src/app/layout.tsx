import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://avitus-materia.com'),
  title: {
    default: 'Avitus Materia — meble na wymiar, stary dąb i naturalne drewno',
    template: '%s · Avitus Materia',
  },
  description:
    'Avitus Materia tworzy indywidualne meble i elementy wnętrz z naturalnego oraz odzyskanego drewna. Stary dąb, projekty na wymiar i rzemieślnicze wykonanie w pracowni pod Lublinem.',
  openGraph: {
    title: 'Avitus Materia — Built for generations',
    description:
      'Indywidualne meble i wnętrza z drewna. Naturalny materiał, projekt na wymiar i rzemieślnicze wykonanie.',
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
