'use client';

import { useState } from 'react';
import { EnTetePage } from '@/components/admin/Elements';
import { useAuth } from '@/components/admin/ContexteAuth';
import { OngletKobo } from './OngletKobo';
import { OngletSeuils } from './OngletSeuils';
import { OngletGeographie } from './OngletGeographie';
import { OngletEmail } from './OngletEmail';
import { OngletSecurite } from './OngletSecurite';

type Onglet = 'kobo' | 'seuils' | 'email' | 'geographie' | 'securite';

const ONGLETS: Array<{ cle: Onglet; libelle: string; superAdminSeul: boolean }> = [
  { cle: 'kobo', libelle: 'KoboToolbox', superAdminSeul: true },
  { cle: 'email', libelle: 'Email', superAdminSeul: true },
  { cle: 'seuils', libelle: 'Seuils cliniques', superAdminSeul: true },
  { cle: 'geographie', libelle: 'Géographie', superAdminSeul: true },
  { cle: 'securite', libelle: 'Mon compte', superAdminSeul: false },
];

export default function PageParametres() {
  const { peut } = useAuth();
  const superAdmin = peut('super_admin');

  const disponibles = ONGLETS.filter(
    (onglet) => !onglet.superAdminSeul || superAdmin,
  );
  const [onglet, setOnglet] = useState<Onglet>(disponibles[0]?.cle ?? 'securite');

  return (
    <>
      <EnTetePage titre="Paramètres" />

      <div className="p-6">
        <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Sections des paramètres">
          {disponibles.map((entree) => (
            <button
              key={entree.cle}
              type="button"
              onClick={() => setOnglet(entree.cle)}
              aria-pressed={onglet === entree.cle}
              className={`puce-filtre ${onglet === entree.cle ? 'puce-filtre-active' : ''}`}
            >
              {entree.libelle}
            </button>
          ))}
        </nav>

        {onglet === 'kobo' && <OngletKobo />}
        {onglet === 'email' && <OngletEmail />}
        {onglet === 'seuils' && <OngletSeuils />}
        {onglet === 'geographie' && <OngletGeographie />}
        {onglet === 'securite' && <OngletSecurite />}
      </div>
    </>
  );
}
