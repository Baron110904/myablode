import { types } from 'pg';

/**
 * Lecture des horodatages PostgreSQL en UTC. **À importer avant tout le reste.**
 *
 * Les colonnes d'horodatage sont de type `TIMESTAMP` sans fuseau. PostgreSQL
 * y écrit l'heure UTC et la renvoie sous forme de chaîne nue :
 * « 2026-08-31 11:23:17.643717 ». Par défaut, le driver `pg` la convertit en
 * `Date` **en l'interprétant dans le fuseau du processus Node**.
 *
 * Sur une machine réglée à UTC+1, cette chaîne devenait 10:23 UTC : une heure
 * de moins que l'instant réel. L'interface, qui affiche en heure du Bénin,
 * ajoutait ensuite une heure et retombait sur 11:23 — soit l'heure UTC
 * présentée comme heure locale. Tous les horodatages accusaient une heure de
 * retard : journal d'audit, dernière synchronisation, dates d'envoi.
 *
 * La conversion est donc imposée explicitement plutôt que laissée au fuseau
 * du système. Régler `process.env.TZ` au démarrage ne suffit pas : Node met
 * le fuseau en cache dès la première manipulation de date, et le résultat
 * dépend alors de l'ordre des imports.
 */

/** OID PostgreSQL du type `timestamp without time zone`. */
const OID_TIMESTAMP = 1114;

/** OID PostgreSQL du type `date`. */
const OID_DATE = 1082;

types.setTypeParser(OID_TIMESTAMP, (valeur: string) => {
  if (!valeur) return null;
  // « 2026-08-31 11:23:17.643717 » → « 2026-08-31T11:23:17.643Z »
  const iso = valeur.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1');
  return new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
});

/**
 * Les colonnes `date` (date de naissance, date de dépistage) restent des
 * chaînes « AAAA-MM-JJ ». Les convertir en `Date` les exposerait au même
 * décalage : une date de dépistage pourrait reculer d'un jour selon le fuseau
 * d'affichage.
 */
types.setTypeParser(OID_DATE, (valeur: string) => valeur);

// Ceinture supplémentaire pour les dates créées côté serveur.
process.env.TZ = 'UTC';
