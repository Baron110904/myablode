import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { EnTete } from '@/components/public/EnTete';
import { PiedDePage } from '@/components/public/PiedDePage';

export default async function PageIntrouvable() {
  const t = await getTranslations('erreurs');

  return (
    <div className="flex min-h-screen flex-col">
      <EnTete />
      <main className="conteneur flex flex-1 items-center py-24">
        <div className="max-w-lg">
          <p className="font-mono text-etiquette uppercase text-ablode-vert">404</p>
          <h1 className="mt-4 text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
            {t('titre404')}
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ablode-gris">
            {t('texte404')}
          </p>
          <Link href="/" className="bouton-principal mt-8">
            {t('retourAccueil')}
          </Link>
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
