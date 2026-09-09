import type { Metadata } from 'next';
import { Desinscription } from './Desinscription';

export const metadata: Metadata = {
  title: 'Désinscription',
  robots: { index: false, follow: false },
};

export default function PageDesinscription({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <Desinscription token={searchParams.token ?? ''} />;
}
