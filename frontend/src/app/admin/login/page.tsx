import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormulaireConnexion } from './FormulaireConnexion';
import { VignetteCarte } from './VignetteCarte';

export const metadata: Metadata = { title: 'Connexion' };

/**
 * Écran de connexion en deux volets (maquette 04) : formulaire à gauche sur
 * fond clair, carte du Bénin sur fond vert nuit à droite, citation de mission
 * posée en bas du volet sombre.
 */
export default function PageConnexion() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-12">
        {/* Le formulaire lit l'adresse de retour dans l'URL : sans cette
            frontière, la page ne peut pas être pré-rendue au build. */}
        <Suspense fallback={<SqueletteFormulaire />}>
          <FormulaireConnexion />
        </Suspense>
      </div>

      <div className="relative hidden overflow-hidden bg-admin-nuit lg:block">
        <VignetteCarte />

        {/*
          Voile dégradé sous la citation. La carte passe derrière le texte :
          sans ce fondu vers le vert nuit, un territoire clair rendrait la
          citation illisible par endroits.
        */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-admin-nuit via-admin-nuit/70 to-transparent"
        />

        <blockquote className="absolute inset-x-0 bottom-0 max-w-2xl p-12">
          <p className="text-[1.75rem] font-bold leading-snug tracking-[-0.02em] text-white">
            « Réduire le nombre de malades du diabète au Bénin. »
          </p>
          <footer className="mt-4 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-white/55">
            Mission de l’ABLODE · Abomey-Calavi
          </footer>
        </blockquote>
      </div>
    </div>
  );
}

/** Occupe la place du formulaire le temps de son hydratation. */
function SqueletteFormulaire() {
  return (
    <div className="w-full max-w-md" aria-hidden>
      <span className="admin-squelette block h-11 w-28" />
      <span className="admin-squelette mt-10 block h-3 w-24" />
      <span className="admin-squelette mt-4 block h-9 w-72" />
      <span className="admin-squelette mt-5 block h-4 w-full max-w-sm" />
      <div className="mt-9 space-y-5">
        <span className="admin-squelette block h-12 w-full" />
        <span className="admin-squelette block h-12 w-full" />
        <span className="admin-squelette block h-12 w-full" />
      </div>
    </div>
  );
}
