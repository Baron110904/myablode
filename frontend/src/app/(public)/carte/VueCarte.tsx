'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { CarteBenin } from '@/components/carte/CarteDynamique';
import { DetailCommune } from '@/components/carte/DetailCommune';
import { PanneauFiltres } from '@/components/carte/FiltresCarte';
import { EncadreFlux, useFluxEntrant } from '@/components/carte/FluxEntrant';
import type { ProprietesCommune } from '@/components/carte/CarteBenin';
import { niveauPourZoom } from '@/lib/niveau-carte';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { API_URL } from '@/lib/api';
import { date } from '@/lib/format';
import type { CarteGeoJson, FiltresCarte, NiveauCarte, ResumeStats } from '@/lib/types';

const CARTE_VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

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

/** Construit la query string en omettant les filtres non renseignés. */
function versParams(filtres: FiltresCarte): string {
  const params = new URLSearchParams({ periode: filtres.periode });
  if (filtres.type) params.set('type', filtres.type);
  if (filtres.sexe) params.set('sexe', filtres.sexe);
  if (filtres.ageMin !== undefined) params.set('ageMin', String(filtres.ageMin));
  if (filtres.ageMax !== undefined) params.set('ageMax', String(filtres.ageMax));
  if (filtres.dateDebut) params.set('dateDebut', filtres.dateDebut);
  if (filtres.dateFin) params.set('dateFin', filtres.dateFin);
  return params.toString();
}

/** Nombre de filtres actifs, affiché sur le bouton mobile. */
function compterFiltres(filtres: FiltresCarte): number {
  let total = 0;
  if (filtres.periode !== 'tout') total += 1;
  if (filtres.type) total += 1;
  if (filtres.sexe) total += 1;
  if (filtres.ageMin !== undefined || filtres.ageMax !== undefined) total += 1;
  return total;
}

export function VueCarte() {
  const t = useTranslations('carte');
  const [filtres, setFiltres] = useState<FiltresCarte>({ periode: 'tout' });
  const [carte, setCarte] = useState<CarteGeoJson>(CARTE_VIDE);
  const [resume, setResume] = useState<ResumeStats>(RESUME_VIDE);
  const [commune, setCommune] = useState<ProprietesCommune | null>(null);
  /** Découpage courant, déduit du zoom : départements vus de loin. */
  const [niveau, setNiveau] = useState<NiveauCarte>('departement');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Tiroir de filtres, sur petits écrans uniquement. */
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  const charger = useCallback(
    async (filtresCourants: FiltresCarte, niveauCourant: NiveauCarte) => {
      setChargement(true);
      setErreur(null);
      /*
       * Le découpage ne concerne que la carte : les autres endpoints de
       * statistiques refusent tout paramètre inconnu, et un `niveau` envoyé
       * au résumé ferait échouer les deux appels d'un coup.
       */
      const params = versParams(filtresCourants);
      const paramsCarte = `${params}&niveau=${niveauCourant}`;

      try {
        const [reponseCarte, reponseResume] = await Promise.all([
          fetch(`${API_URL}/api/stats/carte?${paramsCarte}`),
          fetch(`${API_URL}/api/stats/resume?${params}`),
        ]);
        if (!reponseCarte.ok || !reponseResume.ok) {
          throw new Error('Chargement impossible');
        }
        setCarte(await reponseCarte.json());
        setResume(await reponseResume.json());
      } catch {
        setErreur(t('erreurChargement'));
      } finally {
        setChargement(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void charger(filtres, niveau);
  }, [filtres, niveau, charger]);

  /*
   * Le zoom décide du découpage. La sélection est relâchée au passage : un
   * département sélectionné n'a plus d'équivalent une fois les communes
   * affichées, et le panneau de détail montrerait des chiffres orphelins.
   */
  const surZoom = useCallback((zoom: number) => {
    setNiveau((actuel) => {
      const suivant = niveauPourZoom(zoom, actuel);
      if (suivant !== actuel) setCommune(null);
      return suivant;
    });
  }, []);

  // Le détail affiché doit suivre les filtres : sans cela, les chiffres du
  // panneau resteraient ceux de la période précédente.
  useEffect(() => {
    if (!commune) return;
    const aJour = carte.features.find((f) => f.properties.id === commune.id);
    if (aJour) setCommune(aJour.properties);
  }, [carte]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sur petit écran, le tiroir se referme dès qu'une commune est choisie :
  // sinon il masquerait le détail qu'on vient de demander.
  const choisirCommune = (proprietes: ProprietesCommune | null) => {
    setCommune(proprietes);
    setTiroirOuvert(false);
  };

  const nbFiltres = compterFiltres(filtres);

  /* Arrivées de dépistages depuis l'ouverture de la page. */
  const { arrivees, ondes } = useFluxEntrant();

  return (
    <div>
      {/* ─── Bandeau ─────────────────────────────────────────────────── */}
      <div className="conteneur flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ablode-trait py-4">
        <h1 className="text-lg font-bold">{t('titre')}</h1>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-ablode-gris sm:text-etiquette">
          {carte.features.length > 0 && (
            <>
              {carte.features.length} {t('communes')} ·{' '}
            </>
          )}
          {t('donneesAu')} {date(new Date())}
        </p>
      </div>

      {/* ─── Barre de filtres, petits écrans ─────────────────────────── */}
      <div className="conteneur flex items-center justify-between gap-3 border-b border-ablode-trait py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setTiroirOuvert(true)}
          aria-expanded={tiroirOuvert}
          className="puce-filtre flex items-center gap-2"
        >
          {t('filtrer')}
          {nbFiltres > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center bg-ablode-vert px-1 text-[0.625rem] text-white">
              {nbFiltres}
            </span>
          )}
        </button>

        {chargement && (
          <span className="animate-pulsation font-mono text-etiquette uppercase text-ablode-gris">
            {t('chargement')}
          </span>
        )}
      </div>

      {/*
        Deux dispositions distinctes :
        — petits écrans : carte, puis chiffres, en pile verticale ;
        — grands écrans : panneaux flottants au-dessus d'une carte pleine
          hauteur, comme sur la maquette.
        Superposer les panneaux sur un écran de 375 px masquait la quasi-
        totalité de la carte.
      */}
      <div className="relative bg-ablode-voile">
        <div className="h-[58vh] min-h-[340px] w-full lg:h-[calc(100vh-260px)] lg:min-h-[520px]">
          {chargement && carte.features.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <span className="animate-pulsation font-mono text-etiquette uppercase text-ablode-gris">
                {t('chargement')}
              </span>
            </div>
          ) : (
            <CarteBenin
              donnees={carte}
              onCommuneSelectionnee={choisirCommune}
              communeSelectionneeId={commune?.id ?? null}
              onZoomChange={surZoom}
              ondes={ondes}
            />
          )}
        </div>

        {/* Panneaux flottants — grands écrans seulement. */}
        <div className="pointer-events-none absolute inset-0 hidden p-4 sm:p-6 lg:block">
          <div className="flex h-full flex-col justify-between gap-4">
            <div
              className={`pointer-events-auto w-full max-w-[320px] overflow-y-auto border border-ablode-trait bg-white p-5 shadow-carte ${
                arrivees.length > 0
                  ? 'max-h-[calc(100%-300px)]'
                  : 'max-h-[calc(100%-140px)]'
              }`}
            >
              <h2 className="mb-4 text-base font-bold">{t('filtrer')}</h2>
              <PanneauFiltres filtres={filtres} onChangement={setFiltres} />
              {chargement && (
                <p className="mt-4 animate-pulsation font-mono text-etiquette uppercase text-ablode-gris">
                  {t('chargement')}
                </p>
              )}
              {erreur && (
                <p role="alert" className="mt-4 text-sm text-ablode-alerte">
                  {erreur}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <EncadreFlux
                arrivees={arrivees}
                className="pointer-events-auto w-full max-w-[300px]"
              />

              <div className="pointer-events-auto w-full max-w-[520px] border border-ablode-trait bg-white px-6 py-5 shadow-carte">
                {resume.totalDepistages === 0 && chargement ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index}>
                        <span className="squelette block h-7 w-20" />
                        <span className="squelette mt-2 block h-3 w-24" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ChiffresCles resume={resume} compact />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Détail de la commune : encadré flottant sur grand écran. */}
        {commune && (
          <div className="absolute right-4 top-4 z-[500] hidden w-full max-w-[320px] lg:block sm:right-6 sm:top-6">
            <DetailCommune commune={commune} onFermer={() => setCommune(null)} />
          </div>
        )}

        {!commune && (
          <p className="pointer-events-none absolute right-6 top-6 z-[400] hidden font-mono text-etiquette uppercase text-ablode-gris xl:block">
            {t('cliquezCommune')}
          </p>
        )}
      </div>

      {/* ─── Sous la carte, petits écrans ────────────────────────────── */}
      <div className="lg:hidden">
        {arrivees.length > 0 && (
          <div className="conteneur pt-4">
            <EncadreFlux arrivees={arrivees} />
          </div>
        )}

        {commune && (
          <div className="conteneur py-4">
            <DetailCommune commune={commune} onFermer={() => setCommune(null)} />
          </div>
        )}

        <div className="conteneur border-t border-ablode-trait py-6">
          {resume.totalDepistages === 0 && chargement ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <span className="squelette block h-7 w-20" />
                  <span className="squelette mt-2 block h-3 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <ChiffresCles resume={resume} compact />
          )}

          {erreur && (
            <p role="alert" className="mt-4 text-sm text-ablode-alerte">
              {erreur}
            </p>
          )}

          {!commune && carte.features.length > 0 && (
            <p className="mt-5 font-mono text-etiquette uppercase text-ablode-gris">
              {t('toucherCommune')}
            </p>
          )}
        </div>
      </div>

      {/* ─── Tiroir de filtres, petits écrans ────────────────────────── */}
      {tiroirOuvert && (
        <div className="fixed inset-0 z-[900] lg:hidden">
          <button
            type="button"
            aria-label={t('fermerFiltres')}
            onClick={() => setTiroirOuvert(false)}
            className="absolute inset-0 bg-ablode-encre/45"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-tiroir overflow-y-auto bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-ablode-trait bg-white px-5 py-4">
              <h2 className="text-base font-bold">{t('filtrer')}</h2>
              <button
                type="button"
                onClick={() => setTiroirOuvert(false)}
                aria-label={t('fermerFiltres')}
                className="flex h-9 w-9 items-center justify-center border border-ablode-trait text-lg leading-none text-ablode-gris"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-5">
              <PanneauFiltres filtres={filtres} onChangement={setFiltres} />
            </div>

            <div className="sticky bottom-0 border-t border-ablode-trait bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setTiroirOuvert(false)}
                className="bouton-principal w-full"
              >
                {t('voirCarte')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
