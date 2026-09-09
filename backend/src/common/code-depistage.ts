import type { DataSource } from 'typeorm';

/**
 * Code de dépistage lisible : `BJ-AAMM-NNNNN`.
 *
 * `BJ` pour le Bénin, `AAMM` l'année et le mois du dépistage, puis un numéro
 * d'ordre sur cinq chiffres — par exemple `BJ-2607-03597`.
 *
 * Le numéro vient d'une séquence Postgres et non d'un `COUNT(*) + 1` : deux
 * synchronisations Kobo simultanées liraient le même compte et produiraient
 * deux fois le même code.
 *
 * Sert uniquement de repli. Quand le formulaire porte un code, c'est celui du
 * terrain qui est conservé : c'est lui qui figure sur la fiche papier du
 * bénéficiaire.
 */
export async function genererCodeDepistage(
  dataSource: DataSource,
  dateDepistage: string,
): Promise<string> {
  const [{ rang }] = await dataSource.query(
    `SELECT nextval('depistage_code_seq')::bigint AS rang`,
  );

  // `dateDepistage` est une date ISO (AAAA-MM-JJ) déjà normalisée.
  const periode = dateDepistage.slice(2, 4) + dateDepistage.slice(5, 7);

  return `BJ-${periode}-${String(rang).padStart(5, '0')}`;
}
