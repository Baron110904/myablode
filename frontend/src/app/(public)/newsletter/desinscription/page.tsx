import type { Metadata } from 'next';
import { Desinscription } from './Desinscription';

export const metadata: Metadata = {
  title: 'Désinscription',
  robots: { index: false, follow: false },
};

/*
 * Depuis Next 15, `params` et `searchParams` arrivent sous forme de
 * promesses : le rendu peut commencer avant que la requete soit
 * entierement analysee. Il faut donc les attendre avant de les lire.
 */
export default async function PageDesinscription({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <Desinscription token={(await searchParams).token ?? ''} />;
}
