'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement, Panneau } from '@/components/admin/Elements';
import { GabaritsMail } from './GabaritsMail';
import { apiAdmin, ApiError } from '@/lib/api';

interface ConfigEmail {
  configure: boolean;
  host: string;
  port: number;
  user?: string;
  from: string;
  secure?: boolean;
  motDePasseDefini: boolean;
}

/** Fournisseurs courants, pour éviter la recherche des ports et serveurs. */
const PREREGLAGES = [
  {
    nom: 'Mailpit (test local)',
    host: 'localhost',
    port: 1025,
    aide:
      'Capture les messages sans les livrer. À consulter sur http://localhost:8025 — ' +
      'idéal pour vérifier le contenu des envois sans risquer d’écrire à de vraies adresses.',
  },
  {
    nom: 'Brevo (ex-Sendinblue)',
    host: 'smtp-relay.brevo.com',
    port: 587,
    aide: '300 messages par jour en offre gratuite.',
  },
  {
    nom: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    port: 587,
    aide: 'Nécessite un mot de passe d’application, pas le mot de passe du compte.',
  },
  {
    nom: 'Mailjet',
    host: 'in-v3.mailjet.com',
    port: 587,
    aide: '200 messages par jour en offre gratuite.',
  },
  {
    nom: 'OVH',
    host: 'ssl0.ovh.net',
    port: 587,
    aide: 'Inclus avec un hébergement ou un nom de domaine OVH.',
  },
];

export function OngletEmail() {
  const [config, setConfig] = useState<ConfigEmail | null>(null);
  const [chargement, setChargement] = useState(true);

  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [expediteur, setExpediteur] = useState('');
  const [destinataireTest, setDestinataireTest] = useState('');

  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState<'test' | 'enregistrement' | 'envoi' | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const reponse = await apiAdmin<ConfigEmail>('/mail/config');
      setConfig(reponse);
      setHost(reponse.host ?? '');
      setPort(reponse.port ?? 587);
      setUser(reponse.user ?? '');
      setExpediteur(reponse.from ?? '');
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  function appliquerPrereglage(prereglage: (typeof PREREGLAGES)[number]) {
    setHost(prereglage.host);
    setPort(prereglage.port);
  }

  async function tester() {
    setOccupe('test');
    setErreur('');
    setMessage('');
    try {
      const resultat = await apiAdmin<{ ok: boolean; message: string }>('/mail/test', {
        method: 'POST',
        body: { host, port, user: user || undefined, password: motDePasse || undefined, from: expediteur },
      });
      if (resultat.ok) setMessage(resultat.message);
      else setErreur(resultat.message);
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Test impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  async function enregistrer() {
    setOccupe('enregistrement');
    setErreur('');
    setMessage('');
    try {
      await apiAdmin('/mail/config', {
        method: 'PUT',
        body: {
          host,
          port,
          user: user || undefined,
          // Champ vide : le mot de passe déjà enregistré est conservé.
          password: motDePasse || undefined,
          from: expediteur,
        },
      });
      setMotDePasse('');
      setMessage('Configuration d’envoi enregistrée.');
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  async function envoyerTest() {
    setOccupe('envoi');
    setErreur('');
    setMessage('');
    try {
      const resultat = await apiAdmin<{ ok: boolean; message: string }>('/mail/test-envoi', {
        method: 'POST',
        body: { destinataire: destinataireTest },
      });
      if (resultat.ok) setMessage(resultat.message);
      else setErreur(resultat.message);
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Envoi impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  if (chargement) return <Chargement />;

  return (
    <div className="space-y-5">
      {erreur && (
        <Alerte type="erreur" onFermer={() => setErreur('')}>
          {erreur}
        </Alerte>
      )}
      {message && (
        <Alerte type="succes" onFermer={() => setMessage('')}>
          {message}
        </Alerte>
      )}

      {!config?.configure && (
        <Alerte type="attention">
          Aucun serveur d’envoi n’est configuré. Les réinitialisations de mot de passe,
          les accusés de réception et la lettre d’information ne partent pas : ils sont
          seulement inscrits dans les journaux du serveur.
        </Alerte>
      )}

      <Panneau titre="Serveur d’envoi">
        <div className="space-y-5">
          <div>
            <p className="etiquette mb-2">Fournisseurs courants</p>
            <div className="flex flex-wrap gap-1.5">
              {PREREGLAGES.map((prereglage) => (
                <button
                  key={prereglage.nom}
                  type="button"
                  onClick={() => appliquerPrereglage(prereglage)}
                  title={prereglage.aide}
                  className={`puce-filtre ${host === prereglage.host ? 'puce-filtre-active' : ''}`}
                >
                  {prereglage.nom}
                </button>
              ))}
            </div>
            {PREREGLAGES.find((p) => p.host === host) && (
              <p className="mt-2 text-[0.75rem] text-admin-gris">
                {PREREGLAGES.find((p) => p.host === host)?.aide}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
            <div>
              <label htmlFor="host" className="etiquette mb-2 block">
                Adresse du serveur *
              </label>
              <input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp-relay.brevo.com"
                className="admin-champ font-mono text-[0.8125rem]"
              />
            </div>
            <div>
              <label htmlFor="port" className="etiquette mb-2 block">
                Port *
              </label>
              <input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="admin-champ font-mono text-[0.8125rem]"
              />
              <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                587 le plus souvent
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="user" className="etiquette mb-2 block">
                Nom d’utilisateur
              </label>
              <input
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="off"
                className="admin-champ font-mono text-[0.8125rem]"
              />
            </div>
            <div>
              <label htmlFor="motdepasse" className="etiquette mb-2 block">
                Mot de passe
              </label>
              <input
                id="motdepasse"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="off"
                placeholder={
                  config?.motDePasseDefini
                    ? '•••••••••• (laisser vide pour le conserver)'
                    : ''
                }
                className="admin-champ font-mono text-[0.8125rem]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="expediteur" className="etiquette mb-2 block">
              Adresse d’expédition *
            </label>
            <input
              id="expediteur"
              value={expediteur}
              onChange={(e) => setExpediteur(e.target.value)}
              placeholder="ABLODE <contact@ablode.bj>"
              className="admin-champ"
            />
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-admin-gris">
              Apparaît comme expéditeur dans la boîte de réception des destinataires.
              Utilisez une adresse du domaine de l’association : les messages envoyés
              depuis une adresse étrangère au domaine finissent souvent en indésirables.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void tester()}
              disabled={occupe !== null || !host}
              className="admin-bouton-clair"
            >
              {occupe === 'test' ? 'Vérification…' : 'Tester la connexion'}
            </button>
            <button
              type="button"
              onClick={() => void enregistrer()}
              disabled={occupe !== null || !host || !expediteur}
              className="admin-bouton"
            >
              {occupe === 'enregistrement' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Panneau>

      <Panneau titre="Envoi de vérification">
        <div className="max-w-xl space-y-4">
          <p className="text-sm leading-relaxed text-admin-gris">
            Envoie un message réel à l’adresse indiquée. C’est le seul moyen de vérifier
            toute la chaîne : connexion, authentification, acceptation par le serveur et
            arrivée dans la boîte de réception.
          </p>

          <div className="flex flex-wrap gap-2">
            <label htmlFor="destinataire" className="sr-only">
              Adresse de destination
            </label>
            <input
              id="destinataire"
              type="email"
              value={destinataireTest}
              onChange={(e) => setDestinataireTest(e.target.value)}
              placeholder="votre.adresse@exemple.bj"
              className="admin-champ max-w-sm"
            />
            <button
              type="button"
              onClick={() => void envoyerTest()}
              disabled={occupe !== null || !destinataireTest || !config?.configure}
              className="admin-bouton shrink-0"
            >
              {occupe === 'envoi' ? 'Envoi…' : 'Envoyer un test'}
            </button>
          </div>

          <p className="text-[0.75rem] leading-relaxed text-admin-gris">
            Pensez à regarder le dossier des indésirables : un premier message depuis un
            nouveau serveur y atterrit fréquemment.
          </p>
        </div>
      </Panneau>

      <GabaritsMail />
    </div>
  );
}
