import type { ReactNode } from 'react';

/**
 * Explication du fonctionnement des seuils, à destination des équipes.
 *
 * Le même texte sert dans Paramètres et à l'import : ce sont les deux
 * endroits où quelqu'un se demande « pourquoi cette ligne est classée
 * comme ça » ou « pourquoi celle-là est signalée ».
 */
export function ExplicationSeuils({
  seuils,
  compact = false,
}: {
  seuils: {
    glycemieNormale: number;
    glycemieDiabete: number;
    imcSurpoids: number;
    imcObesite: number;
  };
  /** Version courte, pour la modale d'import. */
  compact?: boolean;
}) {
  const { glycemieNormale, glycemieDiabete, imcSurpoids, imcObesite } = seuils;

  if (compact) {
    return (
      <div className="rounded-carte bg-admin-fond p-4 text-[0.8125rem] leading-relaxed text-admin-gris">
        <p className="font-semibold text-admin-encre">
          Ce que l’import fait de vos mesures
        </p>
        <p className="mt-1.5">
          Chaque ligne est classée automatiquement : une glycémie de{' '}
          {glycemieDiabete} mg/dL ou plus donne « Diabète », entre{' '}
          {glycemieNormale} et {glycemieDiabete - 1} « Pré-diabète », en dessous
          « Normal ». Un IMC de {imcObesite} ou plus donne « Obésité ».
        </p>
        <p className="mt-1.5">
          Une valeur invraisemblable — glycémie hors de 20–900 mg/dL, IMC hors de
          8–90 — n’est <strong>pas refusée</strong> : la ligne entre en base et
          apparaît dans le filtre « Hors norme » pour être reprise.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 text-[0.9375rem] leading-relaxed text-admin-encre">
      <Section titre="Comment un résultat est décidé">
        <p>
          Le site ne porte aucun jugement clinique. Il compare une mesure à un
          seuil, et rien d’autre. Le résultat est calculé à l’enregistrement,
          quelle que soit la porte d’entrée — formulaire Kobo, fichier importé
          ou saisie manuelle.
        </p>

        <Regles
          titre="Dépistage du diabète — seule la glycémie compte"
          lignes={[
            [`Moins de ${glycemieNormale} mg/dL`, 'Normal', 'normal'],
            [
              `De ${glycemieNormale} à ${glycemieDiabete - 1} mg/dL`,
              'Pré-diabète',
              'attention',
            ],
            [`${glycemieDiabete} mg/dL et plus`, 'Diabète', 'alerte'],
            ['Glycémie absente', 'Autre', 'neutre'],
          ]}
        />

        <Regles
          titre="Dépistage de l’obésité — seul l’IMC compte"
          lignes={[
            [`Moins de ${imcObesite}`, 'Normal', 'normal'],
            [`${imcObesite} et plus`, 'Obésité', 'obesite'],
            ['Poids ou taille absent', 'Autre', 'neutre'],
          ]}
        />

        <p className="rounded-carte border border-admin-trait bg-admin-fond p-4">
          <strong className="text-admin-encre">L’IMC n’est pas saisi.</strong> Le
          formulaire relève le <strong>poids</strong> en kilogrammes et la{' '}
          <strong>taille</strong> en centimètres ; la plateforme applique{' '}
          <em>poids ÷ taille²</em>. Une erreur de saisie sur le poids se repère,
          sur un IMC recopié elle passe inaperçue.
        </p>

        <p>
          Le seuil de surpoids ({imcSurpoids}) est affiché à titre indicatif sur
          les fiches : il n’entre pas dans le classement. Un dépistage
          d’endocrinopathie est toujours classé « Autre » — aucun seuil ne
          remplace l’examen d’un soignant.
        </p>
      </Section>

      <Section titre="Ce qui compte comme cas détecté">
        <p>
          Les résultats <strong>Diabète</strong>, <strong>Obésité</strong> et{' '}
          <strong>Autre</strong> sont comptés comme cas détectés. « Pré-diabète »
          et « Normal » n’en font pas partie.
        </p>
        <p>
          Le taux affiché sur la carte est le rapport{' '}
          <em>cas détectés ÷ personnes dépistées</em>. Il porte sur les
          personnes venues se faire dépister, et non sur la population de la
          commune : ce n’est donc pas une prévalence.
        </p>
      </Section>

      <Section titre="Quand une mesure devient suspecte">
        <p>
          Une seconde famille de bornes, indépendante des seuils cliniques,
          repère les valeurs qui ne peuvent pas être vraies :
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Glycémie</strong> : de 20 à 900 mg/dL
          </li>
          <li>
            <strong>IMC</strong> : de 8 à 90 kg/m²
          </li>
          <li>
            <strong>Poids</strong> : de 2 à 400 kg
          </li>
          <li>
            <strong>Taille</strong> : de 30 à 250 cm
          </li>
        </ul>
        <p>
          Au-delà, la ligne est <strong>enregistrée quand même</strong> et
          marquée, et son résultat devient <strong>« À vérifier »</strong> : une
          mesure impossible ne peut pas conclure. Une glycémie de 12 mg/dL n’est
          pas « normale » sous prétexte qu’elle est basse.
        </p>
        <p>
          Pour lever le signalement, corrigez la mesure depuis la liste des
          dépistages (bouton <strong>Corriger</strong>) : le résultat, l’IMC et
          le signalement sont recalculés. Le bouton <strong>Valider</strong> dit
          seulement qu’un humain a relu la ligne — utile quand la mesure est
          définitivement perdue.
        </p>
        <p>
          La cause la plus fréquente est une unité. Les glucomètres francophones
          affichent souvent des g/L : une valeur inférieure à 10 est donc
          convertie automatiquement, 1,26 g/L devenant 126 mg/dL.
        </p>
      </Section>

      <Section titre="Deux familles de seuils à ne pas confondre">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.875rem]">
            <thead>
              <tr>
                <th className="admin-th !pl-0">Seuils cliniques</th>
                <th className="admin-th">Bornes de vraisemblance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-admin-trait">
                <td className="admin-td !pl-0">Décident du résultat</td>
                <td className="admin-td">Ne décident de rien</td>
              </tr>
              <tr className="border-t border-admin-trait">
                <td className="admin-td !pl-0">Modifiables ci-dessous</td>
                <td className="admin-td">Fixées dans le code</td>
              </tr>
              <tr className="border-t border-admin-trait">
                <td className="admin-td !pl-0">
                  Suivent les recommandations médicales
                </td>
                <td className="admin-td">
                  Suivent le domaine du physiologiquement possible
                </td>
              </tr>
              <tr className="border-t border-admin-trait">
                <td className="admin-td !pl-0">
                  S’appliquent aux nouvelles saisies
                </td>
                <td className="admin-td">
                  Signalent sans jamais bloquer l’entrée
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[1.0625rem] font-bold tracking-[-0.015em]">{titre}</h3>
      <div className="space-y-3 text-admin-gris [&_strong]:text-admin-encre">
        {children}
      </div>
    </section>
  );
}

/** Tableau seuil → résultat, avec la pastille telle qu'elle apparaît ailleurs. */
function Regles({
  titre,
  lignes,
}: {
  titre: string;
  lignes: Array<[string, string, string]>;
}) {
  const classe: Record<string, string> = {
    normal: 'pastille pastille-normal',
    attention: 'pastille pastille-attention',
    alerte: 'pastille pastille-alerte',
    obesite: 'pastille pastille-obesite',
    neutre: 'pastille pastille-neutre',
  };

  return (
    <div className="rounded-carte border border-admin-trait">
      <p className="border-b border-admin-trait px-4 py-2.5 text-[0.8125rem] font-semibold text-admin-encre">
        {titre}
      </p>
      <ul>
        {lignes.map(([condition, resultat, ton]) => (
          <li
            key={condition}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-trait px-4 py-2.5 last:border-0"
          >
            <span className="text-[0.875rem] text-admin-encre">{condition}</span>
            <span className={classe[ton]}>{resultat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
