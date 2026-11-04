'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraphiqueEvolution } from '@/components/graphiques/GraphiqueEvolution';
import { PyramideAgeSexe } from '@/components/graphiques/PyramideAgeSexe';
import { EncadreFlux, useFluxEntrant } from '@/components/carte/FluxEntrant';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { API_URL } from '@/lib/api';
import { date, nombre, paliersPrevalence, pourcentage } from '@/lib/format';
import type {
  FiltresCarte,
  Periode,
  PointEvolution,
  RepartitionAgeSexe,
  ResumeStats,
  StatCommune,
  TypeDepistage,
} from '@/lib/types';

const RESUME_VIDE: ResumeStats = {
  totalDepistages: 0,
  casDetectes: 0,
  preDiabete: 0,
  orientesCentre: 0,
  communesCouvertes: 0,
  totalCommunes: 77,
  campagnesRealisees: 0,
  tauxPrevalence: 0,
  variationDepistages7j: 0,
  variationCas7j: 0,
};

const PERIODES: Array<{ valeur: Periode; cle: string }> = [
  { valeur: '7j', cle: 'septJours' },
  { valeur: '30j', cle: 'trenteJours' },
  { valeur: 'annee', cle: 'annee' },
  { valeur: 'tout', cle: 'tout' },
];

const TYPES: Array<{ valeur: TypeDepistage | 'tous'; cle: string }> = [
  { valeur: 'tous', cle: 'tous' },
  { valeur: 'diabete', cle: 'diabete' },
  { valeur: 'obesite', cle: 'obesite' },
  { valeur: 'endocrinopathie', cle: 'endocrinopathie' },
];

type Tri = { colonne: 'nom' | 'depistages' | 'cas' | 'taux'; sens: 'asc' | 'desc' };

export function VueResultats() {
  const t = useTranslations('resultats');
  const tc = useTranslations('commun');

  const [filtres, setFiltres] = useState<FiltresCarte>({ periode: 'tout' });
  const [resume, setResume] = useState<ResumeStats>(RESUME_VIDE);
  const [evolution, setEvolution] = useState<PointEvolution[]>([]);
  const [ageSexe, setAgeSexe] = useState<RepartitionAgeSexe[]>([]);
  const [communes, setCommunes] = useState<StatCommune[]>([]);
  const [chargement, setChargement] = useState(true);
  const [injoignable, setInjoignable] = useState(false);
  const [tri, setTri] = useState<Tri>({ colonne: 'taux', sens: 'desc' });

  const charger = useCallback(async (courants: FiltresCarte) => {
    setChargement(true);
    const params = new URLSearchParams({ periode: courants.periode });
    if (courants.type) params.set('type', courants.type);

    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`${API_URL}/api/stats/resume?${params}`),
        fetch(`${API_URL}/api/stats/evolution?${params}`),
        fetch(`${API_URL}/api/stats/age-sexe?${params}`),
        fetch(`${API_URL}/api/stats/communes?${params}`),
      ]);
      if (r1.ok) setResume(await r1.json());
      if (r2.ok) setEvolution(await r2.json());
      if (r3.ok) setAgeSexe(await r3.json());
      if (r4.ok) setCommunes(await r4.json());
      /*
       * Le résumé fait foi pour l'état de la page : sans lui, les compteurs
       * restent à zéro et la page annoncerait « aucune campagne lancée »
       * alors que la vraie cause est une API muette. Dire qu'un fait
       * n'existe pas quand on n'a pas pu aller voir est pire que de ne rien
       * dire.
       */
      setInjoignable(!r1.ok);
    } catch {
      setInjoignable(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger(filtres);
  }, [filtres, charger]);

  const communesTriees = useMemo(() => {
    const copie = [...communes];
    copie.sort((a, b) => {
      const signe = tri.sens === 'asc' ? 1 : -1;
      if (tri.colonne === 'nom') return signe * a.nom.localeCompare(b.nom, 'fr');
      return signe * ((a[tri.colonne] as number) - (b[tri.colonne] as number));
    });
    return copie;
  }, [communes, tri]);

  /*
   * Arrivées de dépistages depuis l'ouverture de la page. Les communes qui
   * viennent d'en recevoir un sont surlignées trente secondes dans le
   * récapitulatif : c'est ce qui rend le tableau vivant sans rien inventer.
   *
   * Le surlignage est retiré par un minuteur plutôt que recalculé à partir de
   * l'heure courante : sans nouveau rendu, une condition sur `Date.now()`
   * resterait vraie indéfiniment.
   */
  const { arrivees } = useFluxEntrant();
  const [communesEnEveil, setCommunesEnEveil] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (arrivees.length === 0) return;
    const noms = arrivees.slice(0, 5).map((a) => a.commune);
    setCommunesEnEveil(new Set(noms));
    const minuteur = window.setTimeout(() => setCommunesEnEveil(new Set()), 30_000);
    return () => window.clearTimeout(minuteur);
  }, [arrivees]);

  /*
   * Rien à montrer. Le cas se présente avant la première campagne, et après
   * un filtrage qui ne ramène aucun dépistage. Ce ne sont pas les mêmes
   * situations : dans la première, le visiteur n'a rien à faire qu'attendre
   * ; dans la seconde, il lui suffit d'élargir sa sélection. Quatre zéros et
   * deux graphiques vides ne disaient ni l'un ni l'autre, et laissaient
   * croire à une panne.
   */
  const filtreActif = filtres.periode !== 'tout' || filtres.type !== undefined;
  const aucuneDonnee = !chargement && !injoignable && resume.totalDepistages === 0;

  const basculerTri = (colonne: Tri['colonne']) => {
    setTri((courant) =>
      courant.colonne === colonne
        ? { colonne, sens: courant.sens === 'asc' ? 'desc' : 'asc' }
        : { colonne, sens: colonne === 'nom' ? 'asc' : 'desc' },
    );
  };

  return (
    <div className="conteneur py-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-etiquette uppercase text-ablode-vert">
            {t('surtitre')}
          </p>
          <h1 className="mt-3 text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
            {t('titre')}
          </h1>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map((periode) => (
            <button
              key={periode.valeur}
              type="button"
              onClick={() => setFiltres((f) => ({ ...f, periode: periode.valeur }))}
              aria-pressed={filtres.periode === periode.valeur}
              className={`puce-filtre ${filtres.periode === periode.valeur ? 'puce-filtre-active' : ''}`}
            >
              {tc(periode.cle)}
            </button>
          ))}
          <span aria-hidden className="mx-1 hidden w-px self-stretch bg-ablode-trait sm:block" />
          {TYPES.map((type) => (
            <button
              key={type.valeur}
              type="button"
              onClick={() =>
                setFiltres((f) => ({
                  ...f,
                  type: type.valeur === 'tous' ? undefined : (type.valeur as TypeDepistage),
                }))
              }
              aria-pressed={
                type.valeur === 'tous' ? !filtres.type : filtres.type === type.valeur
              }
              className={`puce-filtre ${
                (type.valeur === 'tous' ? !filtres.type : filtres.type === type.valeur)
                  ? 'puce-filtre-active'
                  : ''
              }`}
            >
              {tc(type.cle)}
            </button>
          ))}
        </div>
      </div>

      {injoignable && !chargement ? (
        <EtatInjoignable onReessayer={() => void charger(filtres)} />
      ) : aucuneDonnee ? (
        <EtatVide
          filtre={filtreActif}
          onReinitialiser={() => setFiltres({ periode: 'tout' })}
        />
      ) : (
        <>
        <div
          className={`mt-9 border border-ablode-trait bg-white px-5 py-6 transition-opacity duration-300 sm:px-7 sm:py-7 ${
            chargement && resume.totalDepistages > 0 ? 'opacity-60' : ''
          }`}
        >
          {resume.totalDepistages === 0 && chargement ? (
            // Squelette au premier chargement : afficher quatre zéros donnerait
            // à croire qu'aucun dépistage n'a jamais été réalisé.
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <span className="squelette block h-10 w-32" />
                  <span className="squelette mt-3 block h-3 w-28" />
                </div>
              ))}
            </div>
          ) : (
            <ChiffresCles resume={resume} avecVariations />
          )}
        </div>

        {arrivees.length > 0 && (
          <div className="mt-6">
            <EncadreFlux arrivees={arrivees} className="max-w-[380px]" />
          </div>
        )}

        <div
          className={`mt-6 grid gap-6 transition-opacity duration-300 lg:grid-cols-[1.6fr_1fr] ${
            chargement ? 'opacity-60' : ''
          }`}
        >
          <section className="border border-ablode-trait bg-white p-5 sm:p-7">
            <h2 className="etiquette mb-6">Fig. 1 - {t('evolution')}</h2>
            <GraphiqueEvolution donnees={evolution} />
          </section>

          <section className="border border-ablode-trait bg-white p-5 sm:p-7">
            <h2 className="etiquette mb-6">Fig. 2 - {t('ageSexe')}</h2>
            <PyramideAgeSexe donnees={ageSexe} />
          </section>
        </div>

        <section className="mt-6 border border-ablode-trait bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ablode-trait px-7 py-5">
            <h2 className="etiquette">Fig. 3 - {t('recapCommune')}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-ablode-encre">
                  <EnTeteTriable
                    libelle={t('commune')}
                    colonne="nom"
                    tri={tri}
                    onTri={basculerTri}
                  />
                  <th className="admin-th">{t('departement')}</th>
                  <EnTeteTriable
                    libelle="Dépistages"
                    colonne="depistages"
                    tri={tri}
                    onTri={basculerTri}
                    aDroite
                  />
                  <EnTeteTriable
                    libelle={t('cas')}
                    colonne="cas"
                    tri={tri}
                    onTri={basculerTri}
                    aDroite
                  />
                  <EnTeteTriable
                    libelle={t('taux')}
                    colonne="taux"
                    tri={tri}
                    onTri={basculerTri}
                    aDroite
                  />
                  <th className="admin-th text-right">Dernier dépistage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ablode-trait">
                {communesTriees.map((commune) => {
                  const { couleur } = paliersPrevalence(commune.taux, commune.depistages);
                  return (
                    <tr
                      key={commune.id}
                      className={`group transition-colors duration-500 hover:bg-ablode-voile/60 ${
                        communesEnEveil.has(commune.nom) ? 'bg-ablode-vert-voile' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="inline-block h-3 w-3 shrink-0 border border-black/5 transition-transform duration-150 group-hover:scale-125"
                            style={{ backgroundColor: couleur }}
                          />
                          <span className="text-sm font-bold">{commune.nom}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ablode-gris">
                        {commune.departement ?? '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        {nombre(commune.depistages)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm">
                        {nombre(commune.cas)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {commune.depistages > 0 ? (
                          <span
                            className={`pastille ${
                              commune.taux > 11
                                ? 'pastille-alerte'
                                : commune.taux > 5
                                  ? 'pastille-attention'
                                  : 'pastille-normal'
                            }`}
                          >
                            {pourcentage(commune.taux)}
                          </span>
                        ) : (
                          <span className="text-sm text-ablode-gris">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[0.8125rem] text-ablode-gris">
                        {commune.derniere_campagne ? date(commune.derniere_campagne) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ablode-gris">
          {t('methodologie')}
        </p>
        </>
      )}
    </div>
  );
}

/**
 * L'API n'a pas répondu. Distinct de l'absence de données : ici on ne sait
 * pas, et la page le dit plutôt que de conclure à sa place.
 */
function EtatInjoignable({ onReessayer }: { onReessayer: () => void }) {
  return (
    <div
      role="alert"
      className="mt-9 rounded-carte border border-ablode-trait bg-white px-6 py-16 text-center sm:px-10"
    >
      <span
        aria-hidden
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ablode-ambre-voile text-[1.5rem] text-ablode-ambre"
      >
        !
      </span>
      <h2 className="mt-6 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
        Les résultats n’ont pas pu être chargés
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ablode-gris">
        Le service de statistiques ne répond pas pour le moment. Les données
        existent, c’est leur affichage qui est momentanément indisponible.
      </p>
      <button type="button" onClick={onReessayer} className="bouton-principal mt-8">
        Réessayer
      </button>
    </div>
  );
}

/**
 * Ce qui s'affiche à la place des chiffres quand il n'y en a pas.
 *
 * Deux textes pour deux causes : aucune campagne menée à ce jour, ou une
 * sélection trop étroite. Le second propose la sortie, le premier dit
 * simplement où en est le projet.
 */
function EtatVide({
  filtre,
  onReinitialiser,
}: {
  filtre: boolean;
  onReinitialiser: () => void;
}) {
  return (
    <div className="mt-9 rounded-carte border border-ablode-trait bg-white px-6 py-16 text-center sm:px-10">
      <span
        aria-hidden
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ablode-vert-voile text-[1.5rem] text-ablode-vert-sombre"
      >
        ∅
      </span>

      <h2 className="mt-6 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
        {filtre
          ? 'Aucun dépistage sur cette sélection'
          : 'Aucune campagne n’a encore été lancée'}
      </h2>

      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ablode-gris">
        {filtre
          ? 'Les dépistages enregistrés ne couvrent pas la période ou le type ' +
            'retenus. Élargissez la sélection pour voir l’ensemble des données.'
          : 'Les résultats paraîtront ici dès la première campagne de terrain : ' +
            'dépistages réalisés, cas détectés et couverture commune par commune.'}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {filtre ? (
          <button type="button" onClick={onReinitialiser} className="bouton-principal">
            Voir toutes les données
          </button>
        ) : (
          <>
            <Link href="/actualites" className="bouton-principal">
              Suivre les actualités
            </Link>
            <Link href="/benevole" className="bouton-secondaire">
              Devenir bénévole
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function EnTeteTriable({
  libelle,
  colonne,
  tri,
  onTri,
  aDroite = false,
}: {
  libelle: string;
  colonne: Tri['colonne'];
  tri: Tri;
  onTri: (colonne: Tri['colonne']) => void;
  aDroite?: boolean;
}) {
  const actif = tri.colonne === colonne;
  return (
    <th
      className={`admin-th ${aDroite ? 'text-right' : ''}`}
      aria-sort={actif ? (tri.sens === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onTri(colonne)}
        className={`text-etiquette uppercase transition-colors hover:text-ablode-encre ${
          actif ? 'text-ablode-encre' : ''
        }`}
      >
        {libelle}
        {actif && <span aria-hidden> {tri.sens === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}
