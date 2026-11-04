'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Logo } from '@/components/public/Logo';
import { useAuth } from './ContexteAuth';
import { apiAdmin } from '@/lib/api';
import { LIBELLES_ROLE } from '@/lib/format';
import type { Role } from '@/lib/types';

/** Ce qui attend une action, tel que l'API le compte. */
interface EnAttente {
  depistages: number;
  messages: number;
  benevoles: number;
  inscriptionsMarche: number;
}

const AUCUN: EnAttente = {
  depistages: 0,
  messages: 0,
  benevoles: 0,
  inscriptionsMarche: 0,
};

interface Entree {
  href: string;
  libelle: string;
  roles: Role[];
  /** Clé du compteur à afficher en pastille, s'il y en a un. */
  compteur?: 'depistages' | 'messages';
  /** Mention permanente, et non un nombre : « LIVE » sur le suivi. */
  mention?: string;
}

interface Groupe {
  titre: string;
  /**
   * Replié au premier affichage. La maquette montre Contenu et
   * Administration fermés : ce sont les rubriques qu'on ouvre pour une
   * tâche précise, là où la collecte et la communication se consultent
   * plusieurs fois par jour.
   */
  repliee?: boolean;
  entrees: Entree[];
}

/*
 * Le rôle « viewer » est celui des agents de terrain : trois pages, en
 * lecture seule. Ses dépistages sont en outre filtrés côté serveur à son
 * propre périmètre — masquer une entrée de menu ne protégerait rien.
 */
const TABLEAU_DE_BORD: Entree = {
  href: '/admin',
  libelle: 'Tableau de bord',
  roles: ['super_admin', 'admin'],
};

const GROUPES: Groupe[] = [
  {
    titre: 'Collecte',
    entrees: [
      {
        href: '/admin/depistages',
        libelle: 'Dépistages',
        roles: ['super_admin', 'admin', 'viewer'],
        compteur: 'depistages',
      },
      { href: '/admin/campagnes', libelle: 'Campagnes', roles: ['super_admin', 'admin'] },
      { href: '/admin/agents', libelle: 'Agents', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    titre: 'Cartographie',
    entrees: [
      { href: '/admin/carte', libelle: 'Carte admin', roles: ['super_admin', 'admin'] },
      {
        href: '/admin/direct',
        libelle: 'Suivi en direct',
        roles: ['super_admin', 'admin', 'viewer'],
        mention: 'Live',
      },
    ],
  },
  {
    titre: 'Contenu',
    repliee: true,
    entrees: [
      { href: '/admin/actualites', libelle: 'Actualités', roles: ['super_admin', 'admin'] },
      { href: '/admin/videos', libelle: 'Vidéos', roles: ['super_admin', 'admin'] },
      { href: '/admin/evenements', libelle: 'Programme', roles: ['super_admin', 'admin'] },
    ],
  },
  {
    titre: 'Communication',
    entrees: [
      { href: '/admin/newsletter', libelle: 'Newsletter', roles: ['super_admin', 'admin'] },
      {
        href: '/admin/messages',
        libelle: 'Messages',
        roles: ['super_admin', 'admin', 'viewer'],
        compteur: 'messages',
      },
    ],
  },
  {
    titre: 'Administration',
    repliee: true,
    entrees: [
      { href: '/admin/utilisateurs', libelle: 'Utilisateurs', roles: ['super_admin'] },
      { href: '/admin/audit', libelle: 'Journal d’audit', roles: ['super_admin', 'admin'] },
      { href: '/admin/parametres', libelle: 'Paramètres', roles: ['super_admin', 'admin'] },
    ],
  },
];

/** Rafraîchissement des compteurs : assez souvent pour suivre, sans harceler. */
const INTERVALLE_COMPTEURS = 60_000;

export function BarreLaterale({ onNavigation }: { onNavigation?: () => void }) {
  const chemin = usePathname();
  const { utilisateur, seDeconnecter } = useAuth();
  const [enAttente, setEnAttente] = useState<EnAttente>(AUCUN);
  const [clocheOuverte, setClocheOuverte] = useState(false);

  const estActif = useCallback(
    (href: string) => (href === '/admin' ? chemin === '/admin' : chemin.startsWith(href)),
    [chemin],
  );

  /*
   * Les compteurs sont relevés ici plutôt que dans chaque page : la barre
   * est le seul composant présent sur toutes, et un sondage par page se
   * serait multiplié par le nombre d'onglets ouverts.
   */
  useEffect(() => {
    if (!utilisateur) return;
    let annule = false;

    const relever = async () => {
      try {
        const compteurs = await apiAdmin<EnAttente>('/stats/en-attente');
        if (!annule) setEnAttente(compteurs);
      } catch {
        /* Compteurs indisponibles : les pastilles disparaissent, la
           navigation reste entière. */
      }
    };

    void relever();
    const minuteur = window.setInterval(() => void relever(), INTERVALLE_COMPTEURS);
    return () => {
      annule = true;
      window.clearInterval(minuteur);
    };
  }, [utilisateur, chemin]);

  /*
   * « Messages » rassemble les trois corbeilles de la page du même nom :
   * messages de contact, candidatures de bénévoles et inscriptions à la
   * marche. Les compter séparément dans la barre obligerait à trois
   * pastilles pour une seule destination.
   */
  const compteurs = useMemo(
    () => ({
      depistages: enAttente.depistages,
      messages:
        enAttente.messages + enAttente.benevoles + enAttente.inscriptionsMarche,
    }),
    [enAttente],
  );

  const groupesVisibles = useMemo(
    () =>
      GROUPES.map((groupe) => ({
        ...groupe,
        entrees: groupe.entrees.filter((entree) =>
          utilisateur ? entree.roles.includes(utilisateur.role) : false,
        ),
      })).filter((groupe) => groupe.entrees.length > 0),
    [utilisateur],
  );

  const total = compteurs.depistages + compteurs.messages;
  const voitLeTableauDeBord =
    utilisateur !== null && TABLEAU_DE_BORD.roles.includes(utilisateur.role);

  const initiales = utilisateur
    ? `${utilisateur.prenom.charAt(0)}${utilisateur.nom.charAt(0)}`.toUpperCase()
    : '';

  return (
    <div className="flex h-full flex-col bg-admin-nuit">
      <div className="flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5">
        <span className="flex min-w-0 items-center gap-3">
          <Logo taille={30} href="/admin" />
          <span className="truncate text-[1.0625rem] font-bold text-white">
            MyABLODE
          </span>
        </span>

        <Cloche
          total={total}
          ouverte={clocheOuverte}
          onBasculer={() => setClocheOuverte((o) => !o)}
          onFermer={() => setClocheOuverte(false)}
          enAttente={enAttente}
          onNavigation={onNavigation}
        />
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="Navigation du back-office">
        {voitLeTableauDeBord && (
          <Lien
            entree={TABLEAU_DE_BORD}
            actif={estActif(TABLEAU_DE_BORD.href)}
            onNavigation={onNavigation}
          />
        )}

        {groupesVisibles.map((groupe) => (
          <Rubrique
            key={groupe.titre}
            groupe={groupe}
            compteurs={compteurs}
            estActif={estActif}
            onNavigation={onNavigation}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-admin-vert text-[0.875rem] font-bold text-white"
          >
            {initiales}
          </span>
          {/*
            Pas de `truncate` ici : un nom de famille coupe au tiers ne
            designe plus personne. Il passe sur deux lignes, la barre est
            assez haute pour l'accueillir.
          */}
          <span className="min-w-0 flex-1">
            <span className="block text-[0.875rem] font-bold leading-tight text-white">
              {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : '-'}
            </span>
            <span className="mt-0.5 block text-[0.75rem] leading-tight text-ablode-vert-clair">
              {utilisateur ? LIBELLES_ROLE[utilisateur.role] : ''}
            </span>
          </span>
          {/*
            Contour clair sur fond sombre : le bouton clair standard
            disparaîtrait dans la barre latérale.
          */}
          <button
            type="button"
            onClick={() => void seDeconnecter()}
            className="shrink-0 rounded-full border border-white/20 px-3 py-2 text-[0.75rem] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rubrique repliable.
 *
 * Elle s'ouvre d'office quand la page courante s'y trouve : se retrouver
 * sur « Paramètres » avec la rubrique Administration fermée ne dirait plus
 * où l'on est.
 */
function Rubrique({
  groupe,
  compteurs,
  estActif,
  onNavigation,
}: {
  groupe: Groupe;
  compteurs: { depistages: number; messages: number };
  estActif: (href: string) => boolean;
  onNavigation?: () => void;
}) {
  const contientLaPage = groupe.entrees.some((entree) => estActif(entree.href));
  const [ouverte, setOuverte] = useState(!groupe.repliee || contientLaPage);

  // Une navigation vers une rubrique fermée l'ouvre, sans refermer les autres.
  useEffect(() => {
    if (contientLaPage) setOuverte(true);
  }, [contientLaPage]);

  const idListe = `rubrique-${groupe.titre.toLowerCase()}`;

  return (
    <div className="mt-5 first:mt-2">
      <button
        type="button"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
        aria-controls={idListe}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-4 py-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-ablode-vert-clair transition-colors hover:bg-white/5"
      >
        {groupe.titre}
        {/*
          Chevron orienté par l'état : vers le bas quand la rubrique est
          ouverte, vers la droite quand elle est fermée.
        */}
        <span
          aria-hidden
          className={`transition-transform duration-200 ${ouverte ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>

      {ouverte && (
        <ul id={idListe} className="mt-1 space-y-0.5">
          {groupe.entrees.map((entree) => (
            <li key={entree.href}>
              <Lien
                entree={entree}
                actif={estActif(entree.href)}
                compteur={entree.compteur ? compteurs[entree.compteur] : 0}
                onNavigation={onNavigation}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Lien({
  entree,
  actif,
  compteur = 0,
  onNavigation,
}: {
  entree: Entree;
  actif: boolean;
  compteur?: number;
  onNavigation?: () => void;
}) {
  return (
    <Link
      href={entree.href}
      onClick={onNavigation}
      aria-current={actif ? 'page' : undefined}
      className={`admin-lien-nav ${actif ? 'admin-lien-nav-actif' : ''}`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
          actif ? 'bg-ablode-vert-clair' : 'bg-white/25'
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{entree.libelle}</span>

      {entree.mention && (
        <span className="shrink-0 rounded-full bg-ablode-vert/25 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-ablode-vert-clair">
          {entree.mention}
        </span>
      )}

      {compteur > 0 && (
        <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-ablode-alerte px-1.5 text-[0.6875rem] font-bold text-white">
          {/* Au-delà de 99, le nombre exact n'apprend plus rien et élargit la pastille. */}
          {compteur > 99 ? '99+' : compteur}
          <span className="sr-only"> en attente</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Cloche de notification.
 *
 * Elle n'annonce que ce que l'API sait compter, et chaque ligne mène à
 * l'écran où l'on traite réellement la chose. Un compteur sans destination
 * ne ferait qu'inquiéter.
 */
function Cloche({
  total,
  ouverte,
  onBasculer,
  onFermer,
  enAttente,
  onNavigation,
}: {
  total: number;
  ouverte: boolean;
  onBasculer: () => void;
  onFermer: () => void;
  enAttente: EnAttente;
  onNavigation?: () => void;
}) {
  // Échap referme le panneau : il recouvre la navigation.
  useEffect(() => {
    if (!ouverte) return;
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') onFermer();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [ouverte, onFermer]);

  const lignes = [
    {
      href: '/admin/depistages',
      libelle: 'dépistage à vérifier',
      pluriel: 'dépistages à vérifier',
      nombre: enAttente.depistages,
    },
    {
      href: '/admin/messages',
      libelle: 'message non traité',
      pluriel: 'messages non traités',
      nombre: enAttente.messages,
    },
    {
      href: '/admin/messages',
      libelle: 'candidature de bénévole en attente',
      pluriel: 'candidatures de bénévoles en attente',
      nombre: enAttente.benevoles,
    },
    {
      href: '/admin/messages',
      libelle: 'inscription à la marche à traiter',
      pluriel: 'inscriptions à la marche à traiter',
      nombre: enAttente.inscriptionsMarche,
    },
  ].filter((ligne) => ligne.nombre > 0);

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={onBasculer}
        aria-expanded={ouverte}
        aria-label={
          total > 0 ? `Notifications : ${total} en attente` : 'Notifications'
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-white/40 hover:bg-white/5"
      >
        <span aria-hidden className="text-[1.0625rem] leading-none">
          🔔
        </span>
        {total > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ablode-alerte px-1 text-[0.625rem] font-bold text-white ring-2 ring-admin-nuit"
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {ouverte && (
        <>
          {/* Clic à côté : on referme. */}
          <button
            type="button"
            aria-label="Fermer les notifications"
            onClick={onFermer}
            className="fixed inset-0 z-40 cursor-default"
          />
          {/*
            Ouverture vers la droite, par-dessus le contenu : ancre a droite,
            le panneau depassait le bord gauche de la barre et se faisait
            couper.
          */}
          <div className="absolute left-0 top-12 z-50 w-[18rem] rounded-carte border border-admin-trait bg-white p-4 shadow-relief">
            <p className="etiquette mb-3">En attente</p>
            {lignes.length === 0 ? (
              <p className="text-[0.8125rem] leading-relaxed text-admin-gris">
                Rien ne demande votre attention.
              </p>
            ) : (
              <ul className="space-y-1">
                {lignes.map((ligne) => (
                  <li key={ligne.libelle}>
                    <Link
                      href={ligne.href}
                      onClick={() => {
                        onFermer();
                        onNavigation?.();
                      }}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-[0.8125rem] leading-snug transition-colors hover:bg-admin-fond"
                    >
                      <span className="mt-px font-bold text-ablode-alerte">
                        {ligne.nombre}
                      </span>
                      <span>{ligne.nombre > 1 ? ligne.pluriel : ligne.libelle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </span>
  );
}
