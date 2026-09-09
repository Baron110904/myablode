import { types } from 'pg';
import './fuseau';

/**
 * Les horodatages sont stockés en `TIMESTAMP` sans fuseau et relus par le
 * driver `pg`. Sans conversion explicite, chaque date remontée par l'API est
 * décalée du fuseau local — une heure de retard sur une machine béninoise.
 */
describe('lecture des horodatages PostgreSQL', () => {
  /** Le parseur installé pour `timestamp without time zone` (OID 1114). */
  const lireTimestamp = types.getTypeParser(1114) as (v: string) => Date | null;

  it('interprète une chaîne nue comme de l’UTC', () => {
    // Format exact renvoyé par PostgreSQL.
    const lu = lireTimestamp('2026-08-31 11:23:17.643717');
    expect(lu?.toISOString()).toBe('2026-08-31T11:23:17.643Z');
  });

  it('gère un horodatage sans fraction de seconde', () => {
    const lu = lireTimestamp('2026-08-31 11:23:17');
    expect(lu?.toISOString()).toBe('2026-08-31T11:23:17.000Z');
  });

  it('permet à l’affichage béninois de retrouver l’heure locale', () => {
    const instant = lireTimestamp('2026-08-31 11:23:17');
    const auBenin = instant?.toLocaleTimeString('fr-FR', {
      timeZone: 'Africa/Porto-Novo',
      hour: '2-digit',
      minute: '2-digit',
    });
    // 11 h 23 UTC = 12 h 23 au Bénin.
    expect(auBenin).toBe('12:23');
  });

  it('ne décale pas l’heure quel que soit le fuseau du système', () => {
    // Le résultat ne doit pas dépendre de process.env.TZ : c'est tout
    // l'intérêt d'imposer la conversion.
    const attendu = '2026-01-15T08:00:00.000Z';
    expect(lireTimestamp('2026-01-15 08:00:00')?.toISOString()).toBe(attendu);
  });

  it('laisse les colonnes `date` sous forme de chaîne', () => {
    // Convertir une date de dépistage en `Date` l'exposerait à reculer d'un
    // jour selon le fuseau d'affichage.
    const lireDate = types.getTypeParser(1082) as (v: string) => unknown;
    expect(lireDate('2026-08-24')).toBe('2026-08-24');
  });

  it('tolère une valeur nulle', () => {
    expect(lireTimestamp('')).toBeNull();
  });
});
