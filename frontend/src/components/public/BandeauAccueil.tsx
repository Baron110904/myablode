import { CartePouls } from '@/components/carte/CartePouls';
import type { SignalDepistage } from '@/components/carte/CartePouls';
import { ChiffresCles } from './ChiffresCles';
import type { CarteGeoJson, ResumeStats } from '@/lib/types';

/**
 * Carte et chiffres du bandeau d'accueil.
 *
 * Les chiffres sont ceux de la base et la carte ne réagit qu'aux dépistages
 * réellement arrivés : quand le terrain est au repos, elle reste immobile.
 * C'est l'information.
 */
export function BandeauAccueil({
  carte,
  resume,
  signauxInitiaux,
  children,
}: {
  carte: CarteGeoJson;
  resume: ResumeStats;
  signauxInitiaux: SignalDepistage[];
  /**
   * Colonne de gauche de la bannière : titre, chapeau, boutons. Elle est
   * passée depuis la page parce que ses textes viennent du serveur.
   */
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="bg-bandeau">
        <div className="conteneur grid items-center gap-10 py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-20">
          <div>{children}</div>

          <div className="relative h-[340px] sm:h-[440px] lg:h-[560px]">
            <CartePouls donnees={carte} signauxInitiaux={signauxInitiaux} />
          </div>
        </div>
      </section>

      <section className="conteneur border-b border-ablode-trait py-10">
        <ChiffresCles resume={resume} />
      </section>
    </>
  );
}
