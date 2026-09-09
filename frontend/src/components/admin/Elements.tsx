'use client';

import { useEffect } from 'react';

/** Barre de titre commune à toutes les pages du back-office. */
export function EnTetePage({
  titre,
  complement,
  badge,
  actions,
}: {
  titre: string;
  complement?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-admin-trait bg-white px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-bold tracking-[-0.01em]">{titre}</h1>
        {complement && (
          <span className="font-mono text-[0.8125rem] text-admin-gris">{complement}</span>
        )}
        {badge}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panneau({
  titre,
  action,
  children,
  className = '',
}: {
  titre?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panneau ${className}`}>
      {(titre || action) && (
        <div className="flex items-center justify-between gap-4 px-6 pt-5">
          {titre && <h2 className="etiquette">{titre}</h2>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

/** Message d'état neutre : liste vide, filtre sans résultat. */
export function EtatVide({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex animate-apparition flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span
        aria-hidden
        className="inline-block h-px w-10 bg-admin-trait"
      />
      <p className="text-sm text-admin-gris">{message}</p>
      {action}
    </div>
  );
}

/**
 * Attente de chargement.
 *
 * Par défaut, un squelette de tableau : il occupe la place du contenu à venir,
 * ce qui évite le saut de mise en page au moment où les données arrivent.
 */
export function Chargement({
  message,
  lignes = 6,
}: {
  message?: string;
  lignes?: number;
}) {
  if (message) {
    return (
      <div className="flex items-center justify-center px-6 py-16">
        <span className="animate-pulsation font-mono text-etiquette uppercase text-admin-gris">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div className="px-6 py-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement des données…</span>
      <div className="space-y-3">
        {Array.from({ length: lignes }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <span className="admin-squelette h-4 w-4 shrink-0" />
            <span className="admin-squelette h-4 flex-1" />
            <span className="admin-squelette h-4 w-24 shrink-0" />
            <span className="admin-squelette h-4 w-16 shrink-0" />
            <span className="admin-squelette h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Alerte({
  type = 'info',
  children,
  onFermer,
}: {
  type?: 'info' | 'succes' | 'erreur' | 'attention';
  children: React.ReactNode;
  onFermer?: () => void;
}) {
  const styles = {
    info: 'border-admin-trait bg-admin-fond text-admin-encre',
    succes: 'border-admin-vert bg-admin-actif text-ablode-vert-sombre',
    erreur: 'border-ablode-alerte bg-ablode-alerte-voile text-ablode-alerte',
    attention: 'border-ablode-ambre bg-ablode-ambre-voile text-ablode-ambre',
  };

  return (
    <div
      role={type === 'erreur' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-4 border-l-2 px-4 py-3 text-sm ${styles[type]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onFermer && (
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="shrink-0 font-mono leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

/** Fenêtre modale : fermeture par Échap et clic sur le fond. */
export function Modale({
  titre,
  sousTitre,
  onFermer,
  children,
  large = false,
}: {
  titre: string;
  sousTitre?: string;
  onFermer: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  useEffect(() => {
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', surTouche);
    // Empêche le défilement de la page derrière la modale.
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = precedent;
    };
  }, [onFermer]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onFermer}
        className="fixed inset-0 bg-admin-encre/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`relative my-auto w-full animate-apparition bg-white shadow-modale ${
          large ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-start justify-between gap-6 border-b border-admin-trait px-7 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.01em]">{titre}</h2>
            {sousTitre && (
              <p className="mt-1 font-mono text-[0.8125rem] text-admin-gris">{sousTitre}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-admin-trait text-admin-gris transition-colors hover:border-admin-encre hover:text-admin-encre"
          >
            ×
          </button>
        </div>

        <div className="px-7 py-6">{children}</div>
      </div>
    </div>
  );
}

/** Pagination alignée sur le format renvoyé par l'API. */
export function Pagination({
  page,
  pages,
  total,
  limite,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  limite: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;

  const debut = (page - 1) * limite + 1;
  const fin = Math.min(page * limite, total);

  // Fenêtre glissante de 3 pages autour de la page courante.
  const premiere = Math.max(1, Math.min(page - 1, pages - 2));
  const numeros = Array.from({ length: Math.min(3, pages) }, (_, i) => premiere + i).filter(
    (numero) => numero <= pages,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-admin-trait px-6 py-4">
      <p className="font-mono text-[0.8125rem] text-admin-gris">
        {debut}–{fin} sur {new Intl.NumberFormat('fr-FR').format(total)}
      </p>

      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="admin-bouton-clair px-3 py-2 disabled:opacity-40"
        >
          Précédent
        </button>

        {numeros.map((numero) => (
          <button
            key={numero}
            type="button"
            onClick={() => onPage(numero)}
            aria-current={numero === page ? 'page' : undefined}
            className={
              numero === page
                ? 'admin-bouton px-3.5 py-2'
                : 'admin-bouton-clair px-3.5 py-2'
            }
          >
            {numero}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="admin-bouton-clair px-3 py-2 disabled:opacity-40"
        >
          Suivant
        </button>
      </nav>
    </div>
  );
}

/** Boîte de confirmation pour les actions destructrices. */
export function ConfirmationSuppression({
  titre,
  message,
  libelleConfirmation = 'Supprimer',
  onConfirmer,
  onAnnuler,
  enCours = false,
}: {
  titre: string;
  message: string;
  libelleConfirmation?: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
  enCours?: boolean;
}) {
  return (
    <Modale titre={titre} onFermer={onAnnuler}>
      <p className="text-sm leading-relaxed text-admin-encre">{message}</p>
      <div className="mt-7 flex justify-end gap-2">
        <button type="button" onClick={onAnnuler} className="admin-bouton-clair">
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirmer}
          disabled={enCours}
          className="inline-flex items-center justify-center bg-ablode-alerte px-4 py-2.5 font-mono text-etiquette uppercase text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? '…' : libelleConfirmation}
        </button>
      </div>
    </Modale>
  );
}
