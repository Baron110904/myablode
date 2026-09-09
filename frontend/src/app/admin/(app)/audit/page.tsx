'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alerte,
  Chargement,
  EnTetePage,
  EtatVide,
  Pagination,
} from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, LIBELLES_ACTION, LIBELLES_ENTITE, nombre } from '@/lib/format';
import type { AuditLog, Paginated } from '@/lib/types';

const VIDE: Paginated<AuditLog> = { items: [], total: 0, page: 1, limit: 30, pages: 1 };

const ENTITES = [
  'depistage',
  'campagne',
  'article',
  'user',
  'kobo',
  'settings',
  'newsletter',
];

const ACTIONS = ['login', 'create', 'update', 'delete', 'import', 'export', 'sync'];

/** Journal d'audit (US-ADM-13) : lecture seule, aucune modification possible. */
export default function PageAudit() {
  const [donnees, setDonnees] = useState<Paginated<AuditLog>>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [page, setPage] = useState(1);
  const [entite, setEntite] = useState('');
  const [action, setAction] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<AuditLog>>('/audit', {
          params: {
            page,
            limit: 30,
            entity: entite || undefined,
            action: action || undefined,
          },
        }),
      );
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [page, entite, action]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <>
      <EnTetePage
        titre="Journal d’audit"
        complement={`${nombre(donnees.total)} entrées`}
      />

      <div className="space-y-4 p-6">
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}

        <div className="admin-panneau">
          <div className="flex flex-wrap items-center gap-3 border-b border-admin-trait p-4">
            <label htmlFor="entite" className="sr-only">
              Filtrer par entité
            </label>
            <select
              id="entite"
              value={entite}
              onChange={(e) => {
                setPage(1);
                setEntite(e.target.value);
              }}
              className="admin-champ w-auto min-w-[180px]"
            >
              <option value="">Toutes les entités</option>
              {ENTITES.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {LIBELLES_ENTITE[valeur] ?? valeur}
                </option>
              ))}
            </select>

            <label htmlFor="action" className="sr-only">
              Filtrer par action
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
              className="admin-champ w-auto min-w-[180px]"
            >
              <option value="">Toutes les actions</option>
              {ACTIONS.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {LIBELLES_ACTION[valeur] ?? valeur}
                </option>
              ))}
            </select>

            {(entite || action) && (
              <button
                type="button"
                onClick={() => {
                  setEntite('');
                  setAction('');
                  setPage(1);
                }}
                className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {chargement ? (
            <Chargement />
          ) : donnees.items.length === 0 ? (
            <EtatVide message="Aucune entrée pour ces filtres." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Date</th>
                    <th className="admin-th">Utilisateur</th>
                    <th className="admin-th">Action</th>
                    <th className="admin-th">Entité</th>
                    <th className="admin-th">Réf.</th>
                    <th className="admin-th">Adresse IP</th>
                    <th className="admin-th text-right">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((entree) => (
                    <tr key={entree.id} className="transition-colors duration-150 hover:bg-admin-fond">
                      <td className="admin-td whitespace-nowrap font-mono text-[0.8125rem]">
                        {dateHeure(entree.created_at)}
                      </td>
                      <td className="admin-td">
                        {entree.user
                          ? `${entree.user.prenom} ${entree.user.nom}`
                          : entree.action.startsWith('sync')
                            ? 'Système (cron)'
                            : '—'}
                      </td>
                      <td className="admin-td">
                        <span
                          className={`pastille ${
                            entree.action.includes('delete') ||
                            entree.action.includes('fail')
                              ? 'pastille-alerte'
                              : entree.action === 'create' || entree.action === 'import'
                                ? 'pastille-normal'
                                : 'pastille-neutre'
                          }`}
                        >
                          {LIBELLES_ACTION[entree.action] ?? entree.action}
                        </span>
                      </td>
                      <td className="admin-td">
                        {LIBELLES_ENTITE[entree.entity] ?? entree.entity}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem] text-admin-gris">
                        {entree.entity_id ?? '—'}
                      </td>
                      <td className="admin-td font-mono text-[0.8125rem] text-admin-gris">
                        {entree.ip_address ?? '—'}
                      </td>
                      <td className="admin-td text-right">
                        {entree.metadata ? (
                          <button
                            type="button"
                            onClick={() => setDetail(entree)}
                            className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                          >
                            Voir
                          </button>
                        ) : (
                          <span className="text-admin-gris">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={donnees.page}
            pages={donnees.pages}
            total={donnees.total}
            limite={donnees.limit}
            onPage={setPage}
          />
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setDetail(null)}
            className="fixed inset-0 bg-admin-encre/45"
          />
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-auto bg-white p-7 shadow-modale">
            <h2 className="text-lg font-bold">
              {LIBELLES_ACTION[detail.action] ?? detail.action} ·{' '}
              {LIBELLES_ENTITE[detail.entity] ?? detail.entity}
            </h2>
            <p className="mt-1 font-mono text-[0.8125rem] text-admin-gris">
              {dateHeure(detail.created_at)}
            </p>
            <pre className="mt-5 overflow-auto bg-admin-fond p-4 font-mono text-[0.75rem] leading-relaxed">
              {JSON.stringify(detail.metadata, null, 2)}
            </pre>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="admin-bouton"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
