import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

/*
 * Polices servies depuis le dépôt, et non téléchargées chez Google.
 *
 * `next/font/google` les récupère pendant la construction : un serveur sans
 * accès à `fonts.gstatic.com` — pare-feu, réseau lent — voit son build
 * échouer sur un délai dépassé. Les fichiers sont donc versionnés ici. La
 * construction n'a plus besoin du réseau, et aucune requête ne part vers
 * Google depuis le navigateur du visiteur.
 *
 * Seul le sous-ensemble latin est embarqué : 76 Ko au total.
 */

/*
 * Plus Jakarta Sans : géométrique à « a » d'un seul étage, terminaisons
 * coupées en biais, « 1 » sans empattement et « 7 » sans barre — les traits
 * relevés sur les maquettes de la refonte. Elle porte les titres comme le
 * texte courant.
 *
 * C'est désormais la seule famille du site. Une monospace y cohabitait pour
 * les libellés en capitales et les colonnes de chiffres ; le mélange se
 * voyait d'une section à l'autre, et l'alignement des chiffres est obtenu
 * par `tabular-nums`, que cette police fournit. Trois fichiers de moins à
 * télécharger au premier affichage.
 *
 * Police variable : un seul fichier couvre les graisses 400 à 800.
 */
const jakarta = localFont({
  src: '../polices/jakarta-variable.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--police-titre',
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  title: {
    default: 'MyABLODE - Dépistage du diabète et de l’obésité au Bénin',
    template: '%s · MyABLODE',
  },
  description:
    'Plateforme de centralisation et de visualisation cartographique des ' +
    'campagnes de dépistage du diabète et de l’obésité menées par l’ABLODE au Bénin.',
  keywords: [
    'diabète',
    'obésité',
    'dépistage',
    'Bénin',
    'ABLODE',
    'santé publique',
    'maladies non transmissibles',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_BJ',
    siteName: 'MyABLODE',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#101614',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={jakarta.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
