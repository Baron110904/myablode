import Link from 'next/link';
import { dateHeure } from '@/lib/format';
import type { FormulaireMarchePublic } from '@/lib/types';

/**
 * Appel à s'inscrire, affiché dans l'article.
 *
 * L'article raconte la marche ; le bulletin se remplit ailleurs. Un formulaire
 * de neuf champs posé au milieu d'une lecture coupe le récit en deux, et le
 * lecteur venu s'informer se retrouve devant une corvée administrative.
 *
 * Fermé, le bloc reste : il annonce la clôture plutôt que de laisser croire
 * qu'aucune inscription n'a jamais existé.
 */
export function AppelInscription({
  formulaire,
  slug,
}: {
  formulaire: FormulaireMarchePublic;
  slug: string;
}) {
  const echeance = formulaire.dateFermeture;

  return (
    <aside className="mx-auto mt-12 max-w-lecture rounded-bloc border border-ablode-trait bg-ablode-voile p-7 sm:p-8">
      <p className="etiquette">
        {formulaire.ouvert ? 'Participer' : 'Inscriptions closes'}
      </p>

      <h2 className="mt-3 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
        {formulaire.titre}
      </h2>

      {formulaire.ouvert ? (
        <>
          {echeance && (
            <p className="mt-3 text-[0.9375rem] text-ablode-gris">
              Clôture le {dateHeure(echeance)} · {joursRestants(echeance)}
            </p>
          )}
          {formulaire.inscrits > 0 && (
            <p className="mt-1 text-[0.9375rem] text-ablode-gris">
              {formulaire.inscrits} personne{formulaire.inscrits > 1 ? 's' : ''} déjà
              inscrite{formulaire.inscrits > 1 ? 's' : ''}.
            </p>
          )}

          <Link
            href={`/actualites/${slug}/inscription`}
            className="bouton-principal mt-6"
          >
            Je m’inscris à la marche
          </Link>
        </>
      ) : (
        <>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
            {formulaire.messageFerme?.trim() ||
              'Les inscriptions à la marche sont terminées.'}
          </p>
          {echeance && (
            <p className="mt-1 text-[0.9375rem] text-ablode-gris">
              Clôturées le {dateHeure(echeance)}
            </p>
          )}
        </>
      )}
    </aside>
  );
}

/**
 * Délai avant clôture, en clair.
 *
 * Une date seule oblige le lecteur à compter. « Il reste 3 jours » agit ;
 * « le 12 octobre » informe seulement.
 */
export function joursRestants(echeance: string): string {
  const reste = new Date(echeance).getTime() - Date.now();
  if (reste <= 0) return 'inscriptions closes';

  const jours = Math.floor(reste / 86_400_000);
  if (jours >= 2) return `il reste ${jours} jours`;
  if (jours === 1) return 'il reste un jour';

  const heures = Math.max(1, Math.floor(reste / 3_600_000));
  return `il reste moins de ${heures} heure${heures > 1 ? 's' : ''}`;
}
