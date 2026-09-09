'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CarteBenin } from '@/components/carte/CarteDynamique';
import { GrapheFlux, Sparkline } from '@/components/admin/direct/GrapheFlux';
import { LegendePrevalence } from '@/components/carte/LegendePrevalence';
import { ModaleFelicitations } from '@/components/admin/direct/ModaleFelicitations';
import { suiviSimule } from '@/components/admin/direct/simulation';
import { useAuth } from '@/components/admin/ContexteAuth';
import { Alerte, EnTetePage } from '@/components/admin/Elements';
import { apiAdmin } from '@/lib/api';
import { nombre, pourcentage } from '@/lib/format';
import type {
  ArriveeDepistage,
  CarteGeoJson,
  FenetreDirect,
  LigneDirect,
  SuiviDirect,
} from '@/lib/types';

const CARTE_VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

/**
 * Rythme d'interrogation du graphe, en millisecondes, selon la profondeur
 * affichée. Inutile de redemander une fenêtre de sept jours toutes les deux
 * secondes : la cadence suit la largeur d'un intervalle, pas plus vite.
 */
const CADENCE: Record<FenetreDirect, number> = {
  '30s': 2_000,
  '5min': 5_000,
  '1h': 10_000,
  '24h': 30_000,
  '7j': 60_000,
};

/*
 * Le flux entrant garde sa propre cadence, plus lente. Il liste des lignes
 * nominatives : les rafraîchir toutes les deux secondes ferait sauter la
 * liste sous les yeux sans rien apprendre de plus.
 */
const CADENCE_FLUX = 10_000;

/**
 * En dessous de ce nombre de dépistages, le taux de détection n'est pas
 * affiché. Un cas sur un dépistage fait « 100 % », ce qui trompe le lecteur
 * bien plus que l'absence de chiffre.
 */
const SEUIL_TAUX_LISIBLE = 20;

const FENETRES: Array<{ valeur: FenetreDirect; libelle: string }> = [
  { valeur: '30s', libelle: '30 s' },
  { valeur: '5min', libelle: '5 min' },
  { valeur: '1h', libelle: '1 h' },
  { valeur: '24h', libelle: '24 h' },
  { valeur: '7j', libelle: '7 j' },
];

/**
 * Suivi en direct du flux entrant.
 *
 * Le parti pris : n'afficher que ce qui est réellement arrivé. Quand rien
 * n'arrive, le graphe est plat et la carte au repos — c'est l'information.
 * Une animation continue ferait croire à une activité permanente que la
 * collecte de terrain n'a pas.
 */
export default function PageDirect() {
  const { peut } = useAuth();
  const peutFeliciter = peut('super_admin', 'admin');

  const [fenetre, setFenetre] = useState<FenetreDirect>('1h');
  const [suivi, setSuivi] = useState<SuiviDirect | null>(null);
  const [arrivees, setArrivees] = useState<ArriveeDepistage[]>([]);
  const [carte, setCarte] = useState<CarteGeoJson>(CARTE_VIDE);
  const [ondes, setOndes] = useState<Array<{ cle: string; lat: number; lng: number }>>([]);
  /**
   * Chaleur par commune, de 0 à 1. Chaque arrivée l'augmente, une décroissance
   * régulière la fait redescendre : la carte se réchauffe là où la collecte a
   * lieu, et refroidit quand elle s'arrête.
   */
  const [activite, setActivite] = useState<Map<number, number>>(new Map());
  const [erreur, setErreur] = useState('');
  const [heure, setHeure] = useState('');
  const [aFeliciter, setAFeliciter] = useState<LigneDirect | null>(null);

  /*
   * Démonstration. La base de démonstration a tout reçu en un seul import :
   * le graphe y est plat avec un pic unique, et l'écran ne montre pas à quoi
   * il ressemble un jour de campagne. Le bandeau l'annonce dès que c'est actif.
   */
  const [simulation, setSimulation] = useState(false);
  const [tic, setTic] = useState(0);
  /** Dernier état réel reçu, conservé pour reprendre la main à l'arrêt. */
  const reel = useRef<SuiviDirect | null>(null);

  /** Identifiants déjà vus : seule une vraie nouveauté déclenche une onde. */
  const dejaVus = useRef<Set<number>>(new Set());
  const premierChargement = useRef(true);

  const interrogerGraphe = useCallback(async () => {
    try {
      const direct = await apiAdmin<SuiviDirect>('/stats/direct', {
        params: { fenetre },
      });
      reel.current = direct;
      setSuivi(direct);
      setErreur('');
    } catch {
      setErreur('Le flux est momentanément injoignable. Nouvelle tentative en cours.');
    }
  }, [fenetre]);

  const interrogerFlux = useCallback(async () => {
    try {
      const flux = await apiAdmin<ArriveeDepistage[]>('/stats/derniers-detailles');
      setArrivees(flux);

      /*
       * Au premier chargement, tout est « nouveau » : on remplit la mémoire
       * sans dessiner, sinon quarante ondes éclosent d'un coup à l'ouverture
       * de la page pour des dépistages parfois vieux de plusieurs jours.
       */
      const nouveaux = flux.filter((a) => !dejaVus.current.has(a.id));
      flux.forEach((a) => dejaVus.current.add(a.id));

      if (premierChargement.current) {
        premierChargement.current = false;
        return;
      }

      /*
       * Un dépistage porte la chaleur de sa commune à fond ; les suivants
       * n'ajoutent rien de plus. C'est un indicateur de présence, pas un
       * compteur — deux fiches ne rendent pas une commune deux fois active.
       */
      if (nouveaux.length > 0) {
        setActivite((courante) => {
          const suivante = new Map(courante);
          for (const arrivee of nouveaux) suivante.set(arrivee.commune_id, 1);
          return suivante;
        });
      }

      const positionnes = nouveaux.filter((a) => a.lat !== null && a.lng !== null);
      if (positionnes.length > 0) {
        const lot = positionnes.map((a) => ({
          cle: `${a.id}-${Date.now()}`,
          lat: a.lat as number,
          lng: a.lng as number,
        }));
        setOndes((courantes) => [...courantes, ...lot]);
        // Les ondes durent 1,8 s : on les retire ensuite pour ne pas accumuler.
        window.setTimeout(
          () =>
            setOndes((courantes) =>
              courantes.filter((onde) => !lot.some((n) => n.cle === onde.cle)),
            ),
          2_000,
        );
      }
    } catch {
      /* Le graphe signale déjà l'indisponibilité : inutile de le répéter. */
    }
  }, []);

  useEffect(() => {
    if (simulation) return;
    void interrogerGraphe();
    const minuteur = window.setInterval(
      () => void interrogerGraphe(),
      CADENCE[fenetre],
    );
    return () => window.clearInterval(minuteur);
  }, [interrogerGraphe, fenetre, simulation]);

  /* Avancée de la démonstration : la courbe glisse d'un intervalle par tic. */
  useEffect(() => {
    if (!simulation) return;
    const minuteur = window.setInterval(() => setTic((t) => t + 1), 1_200);
    return () => window.clearInterval(minuteur);
  }, [simulation]);

  useEffect(() => {
    if (!simulation) return;
    const simule = suiviSimule(
      fenetre,
      tic,
      reel.current?.classement ?? [],
      reel.current?.totalCommunes ?? 77,
      Date.now(),
    );
    setSuivi(simule);

    /* La carte doit vivre elle aussi pendant la démonstration. */
    setActivite((courante) => {
      const suivante = new Map(courante);
      for (const ligne of simule.classement.slice(0, 6)) {
        if (ligne.arrivees > 0) suivante.set(ligne.commune_id, 1);
      }
      return suivante;
    });
  }, [simulation, fenetre, tic]);

  useEffect(() => {
    void interrogerFlux();
    const minuteur = window.setInterval(() => void interrogerFlux(), CADENCE_FLUX);
    return () => window.clearInterval(minuteur);
  }, [interrogerFlux]);

  /*
   * Refroidissement : une commune sans nouvelle arrivée s'efface en une
   * minute environ. Sans cette décroissance, la carte finirait entièrement
   * ambre et ne dirait plus rien.
   */
  useEffect(() => {
    const minuteur = window.setInterval(() => {
      setActivite((courante) => {
        if (courante.size === 0) return courante;
        const suivante = new Map<number, number>();
        for (const [id, chaleur] of courante) {
          const refroidi = chaleur - 0.12;
          if (refroidi > 0.02) suivante.set(id, refroidi);
        }
        return suivante;
      });
    }, 6_000);
    return () => window.clearInterval(minuteur);
  }, []);

  useEffect(() => {
    void apiAdmin<CarteGeoJson>('/stats/carte', { params: { periode: 'tout' } })
      .then(setCarte)
      .catch(() => undefined);
  }, []);

  /*
   * Horloge rendue côté client seulement. Rendue au serveur, elle afficherait
   * l'heure de la machine de build et déclencherait une erreur d'hydratation.
   */
  useEffect(() => {
    const tic = () =>
      setHeure(
        new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    tic();
    const minuteur = window.setInterval(tic, 1_000);
    return () => window.clearInterval(minuteur);
  }, []);

  const tuiles = useMemo(() => {
    if (!suivi) return [];
    const cumule: number[] = [];
    suivi.serie.reduce((somme, point) => {
      const total = somme + point.depistages;
      cumule.push(total);
      return total;
    }, 0);

    /*
     * Les quatre tuiles décrivent la fenêtre affichée, pas la journée : leurs
     * sparklines sont tracées sur cette même série. Mêler « cumul du jour » et
     * une fenêtre de sept jours donnait deux chiffres contradictoires côte à
     * côte. Les totaux du jour sont rappelés en une ligne, sous les tuiles.
     */
    return [
      {
        libelle: 'Cumul sur la fenêtre',
        valeur: nombre(suivi.surFenetre),
        spark: cumule,
      },
      {
        libelle: 'Cas détectés',
        valeur: nombre(suivi.casFenetre),
        spark: suivi.serie.map((p) => p.cas),
      },
      {
        libelle: 'Taux de détection',
        valeur:
          suivi.surFenetre >= SEUIL_TAUX_LISIBLE
            ? pourcentage(suivi.tauxFenetre)
            : '—',
        spark: suivi.serie.map((p) =>
          p.depistages > 0 ? (100 * p.cas) / p.depistages : 0,
        ),
      },
      {
        libelle: 'Communes touchées',
        valeur: `${nombre(suivi.communesFenetre)} / ${nombre(suivi.totalCommunes)}`,
        spark: suivi.serie.map((p) => p.communes),
      },
    ];
  }, [suivi]);

  return (
    <>
      <EnTetePage
        titre="Suivi en direct"
        complement={
          suivi ? `${nombre(suivi.totalCommunes)} communes suivies` : undefined
        }
        actions={
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSimulation((actif) => !actif)}
              aria-pressed={simulation}
              className={`puce-filtre ${simulation ? 'puce-filtre-active' : ''}`}
            >
              {simulation ? 'Arrêter la démonstration' : 'Démonstration'}
            </button>
            {simulation ? (
              <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-ablode-ambre">
                <span className="direct-point !bg-ablode-ambre" aria-hidden />
                Simulation
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-admin-vert">
                <span className="direct-point !bg-admin-vert" aria-hidden />
                En direct
              </span>
            )}
            <span className="font-mono text-[0.8125rem] tabular-nums text-admin-gris">
              {heure || '—'}
            </span>
          </span>
        }
      />

      {/* Bandeau défilant : les communes les plus actives, en continu. */}
      <BandeauCommunes classement={suivi?.classement ?? []} />

      {simulation && (
        <p className="flex flex-wrap items-center gap-2 border-b border-ablode-ambre/25 bg-ablode-ambre-voile px-6 py-3 text-[0.8125rem] font-semibold text-ablode-ambre">
          Démonstration en cours — les chiffres et la courbe sont générés pour
          montrer l’écran en activité. Aucune de ces valeurs n’est une mesure.
        </p>
      )}

      <div className="space-y-4 p-6">
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.65fr)]">
          {/* Colonne 1 — graphe et chiffres clés */}
          <div className="space-y-4">
            <section className="admin-panneau">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
                <h2 className="etiquette">Dépistages entrants · cas en barres</h2>
                <div className="flex gap-1.5" role="group" aria-label="Profondeur de la fenêtre">
                  {FENETRES.map((entree) => (
                    <button
                      key={entree.valeur}
                      type="button"
                      onClick={() => setFenetre(entree.valeur)}
                      aria-pressed={fenetre === entree.valeur}
                      className={`puce-filtre ${
                        fenetre === entree.valeur ? 'puce-filtre-active' : ''
                      }`}
                    >
                      {entree.libelle}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 pt-4">
                <p className="flex items-baseline gap-3">
                  <span className="text-[2rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                    {nombre(suivi?.surFenetre ?? 0)}
                  </span>
                  <span className="text-[0.8125rem] text-admin-gris">
                    {(suivi?.surFenetre ?? 0) === 1 ? 'arrivé' : 'arrivés'} sur la
                    fenêtre · {nombre(suivi?.casFenetre ?? 0)} cas
                  </span>
                </p>
              </div>

              <div className="px-4 pb-5 pt-2">
                <GrapheFlux serie={suivi?.serie ?? []} />
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              {tuiles.map((tuile) => (
                <div key={tuile.libelle} className="admin-panneau p-5">
                  <p className="etiquette">{tuile.libelle}</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="whitespace-nowrap text-[1.625rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                      {tuile.valeur}
                    </span>
                    <Sparkline
                      valeurs={tuile.spark}
                      libelle={`Évolution de ${tuile.libelle.toLowerCase()} sur la fenêtre`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {suivi && (
              <p className="px-1 text-[0.8125rem] text-admin-gris">
                Aujourd’hui ·{' '}
                <span className="font-semibold text-admin-encre">
                  {nombre(suivi.cumulJour)}
                </span>{' '}
                {suivi.cumulJour === 1 ? 'dépistage' : 'dépistages'},{' '}
                <span className="font-semibold text-admin-encre">
                  {nombre(suivi.casJour)}
                </span>{' '}
                {suivi.casJour === 1 ? 'cas' : 'cas'},{' '}
                {nombre(suivi.communesJour)}{' '}
                {suivi.communesJour === 1 ? 'commune' : 'communes'}.
              </p>
            )}

            <p className="px-1 text-[0.75rem] leading-relaxed text-admin-gris">
              Source · KoboCollect et imports de fichiers. L’horodatage retenu est
              l’arrivée de la donnée sur la plateforme, pas la date de l’examen :
              un dépistage fait le matin peut n’arriver qu’au soir, quand l’agent
              retrouve du réseau.
            </p>
          </div>

          {/* Colonne 2 — carte réactive et flux détaillé */}
          <div className="space-y-4">
            <section className="admin-panneau overflow-hidden">
              <h2 className="etiquette px-6 pt-5">Arrivées sur la carte</h2>
              {/*
                Fond de tuiles conservé ici, contrairement à la bannière
                d'accueil : sur un écran de pilotage, voir le Togo, le Nigeria
                et le Burkina Faso autour situe les communes frontalières —
                Malanville, Kandi, Kétou — qu'on regarde justement de près.
              */}
              <div className="relative h-[520px] px-1 py-2">
                <CarteBenin
                  donnees={carte}
                  interactive={false}
                  afficherAttribution={false}
                  ondes={ondes}
                  activite={activite}
                  hauteur="100%"
                />

                <div className="pointer-events-none absolute right-4 top-4 z-[500] rounded-carte border border-admin-trait bg-white/95 px-4 py-3 shadow-carte backdrop-blur-sm">
                  <LegendePrevalence />
                </div>
              </div>
              <p className="border-t border-admin-trait px-6 py-3 text-[0.8125rem] text-admin-gris">
                {suivi?.dernierSignal ? (
                  <>
                    Dernier signal ·{' '}
                    <span className="font-semibold text-admin-encre">
                      {suivi.dernierSignal.commune}
                    </span>
                  </>
                ) : (
                  'Aucun dépistage enregistré pour l’instant.'
                )}
              </p>
            </section>

            <section className="admin-panneau">
              <h2 className="etiquette px-6 pt-5">Flux entrant</h2>
              {arrivees.length === 0 ? (
                <p className="px-6 py-6 text-[0.8125rem] text-admin-gris">
                  Rien n’est encore arrivé.
                </p>
              ) : (
                <ul className="max-h-[260px] divide-y divide-admin-trait overflow-y-auto">
                  {arrivees.slice(0, 20).map((arrivee) => (
                    <li
                      key={arrivee.id}
                      className="flex items-center justify-between gap-3 px-6 py-2.5"
                    >
                      <span className="shrink-0 font-mono text-[0.75rem] text-admin-gris">
                        {horodatageFlux(arrivee.horodatage)}
                      </span>
                      <span className="flex-1 truncate text-sm font-semibold">
                        {arrivee.commune}
                      </span>
                      {arrivee.glycemie != null && (
                        <span className="shrink-0 font-mono text-[0.75rem] tabular-nums text-admin-gris">
                          {Math.round(arrivee.glycemie)} mg/dL
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Colonne 3 — classement et félicitations */}
          <div className="space-y-4">
            <section className="admin-panneau">
              <div className="flex items-center justify-between gap-3 px-6 pt-5">
                <h2 className="etiquette">Communes actives</h2>
                {suivi && (
                  <span className="font-mono text-[0.8125rem] tabular-nums text-admin-gris">
                    {suivi.communesFenetre} / {suivi.totalCommunes}
                  </span>
                )}
              </div>

              {!suivi || suivi.classement.length === 0 ? (
                <p className="px-6 py-6 text-[0.8125rem] text-admin-gris">
                  Aucune commune n’a encore de dépistage.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-admin-trait">
                  {suivi.classement.map((ligne) => (
                    <li key={ligne.commune_id} className="px-6 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                              ligne.arrivees > 0 ? 'bg-admin-vert' : 'bg-admin-trait'
                            }`}
                          />
                          <span className="truncate text-sm font-semibold">
                            {ligne.nom}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3 font-mono text-[0.8125rem] tabular-nums">
                          <span className="text-admin-gris">{nombre(ligne.depistages)}</span>
                          <span
                            className={
                              ligne.depistages < SEUIL_TAUX_LISIBLE
                                ? 'text-admin-gris'
                                : ''
                            }
                          >
                            {ligne.depistages < SEUIL_TAUX_LISIBLE
                              ? '—'
                              : pourcentage(ligne.taux)}
                          </span>
                        </span>
                      </div>
                      {peutFeliciter && (
                        <button
                          type="button"
                          onClick={() => setAFeliciter(ligne)}
                          className="mt-1.5 text-[0.75rem] font-medium text-admin-gris hover:text-admin-vert"
                        >
                          Message à cette équipe
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="border-t border-admin-trait px-6 py-3 text-[0.75rem] leading-relaxed text-admin-gris">
                Le taux n’est affiché qu’à partir de {SEUIL_TAUX_LISIBLE} dépistages :
                en dessous, un pourcentage sur deux ou trois personnes ne veut rien
                dire.
              </p>
            </section>

          </div>
        </div>
      </div>

      {aFeliciter && (
        <ModaleFelicitations
          commune={aFeliciter}
          onFermer={() => setAFeliciter(null)}
          onEnvoye={() => setAFeliciter(null)}
        />
      )}
    </>
  );
}

/**
 * Bandeau défilant des communes actives.
 *
 * La liste est doublée et l'animation translate de -50 % : la seconde moitié
 * prend la place de la première à l'instant où la boucle redémarre, sans
 * saut visible.
 */
function BandeauCommunes({ classement }: { classement: LigneDirect[] }) {
  if (classement.length === 0) return null;

  const items = [...classement, ...classement];

  return (
    <div className="overflow-hidden border-b border-admin-trait bg-admin-nuit">
      <div className="flex w-max animate-defilement motion-reduce:animate-none">
        {items.map((ligne, index) => (
          <span
            key={`${ligne.commune_id}-${index}`}
            className="flex shrink-0 items-center gap-2.5 border-r border-white/10 px-6 py-2.5"
          >
            <span className="direct-etiquette !text-white/70">{ligne.nom}</span>
            <span className="direct-valeur text-[0.8125rem]">
              {ligne.depistages < SEUIL_TAUX_LISIBLE
                ? `${nombre(ligne.depistages)} dép.`
                : pourcentage(ligne.taux)}
            </span>
            {ligne.arrivees > 0 && (
              <span className="font-mono text-[0.75rem] tabular-nums text-ablode-vert-clair">
                ▲ {nombre(ligne.arrivees)}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Horodatage d'une ligne du flux.
 *
 * L'heure seule suffit pour la journée en cours ; au-delà, la date est ajoutée.
 * Sans elle, une arrivée d'hier à 15 h s'affichait au-dessus d'une arrivée
 * d'aujourd'hui à 12 h et la liste semblait mal triée.
 */
function horodatageFlux(horodatage: string): string {
  const valeur = new Date(horodatage);
  if (Number.isNaN(valeur.getTime())) return '—';

  const heure = valeur.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const aujourdhui = new Date();
  const memeJour =
    valeur.getDate() === aujourdhui.getDate() &&
    valeur.getMonth() === aujourdhui.getMonth() &&
    valeur.getFullYear() === aujourdhui.getFullYear();
  if (memeJour) return heure;

  const jour = valeur.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  return `${jour} ${heure}`;
}
