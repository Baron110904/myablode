import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recherche insensible aux accents.
 *
 * Les fichiers importés écrivent indifféremment « Seme-Kpodji », « Sèmè-Kpodji »
 * ou « SEME KPODJI ». `unaccent_lower` normalise les deux côtés de la
 * comparaison ; elle est déclarée IMMUTABLE pour être indexable.
 */
export class UnaccentSearch1756400100000 implements MigrationInterface {
  name = 'UnaccentSearch1756400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION unaccent_lower(texte text)
      RETURNS text AS
      $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, texte)) $$
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_communes_nom_unaccent" ON "communes" (unaccent_lower("nom"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_nom_unaccent" ON "depistages" (unaccent_lower("nom"))`,
    );
    // Recherche plein texte sur les articles (barre de recherche du blog).
    await queryRunner.query(`
      CREATE INDEX "idx_articles_recherche" ON "articles"
      USING GIN (to_tsvector('french', coalesce("titre", '') || ' ' || coalesce("contenu", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_articles_recherche"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_depistages_nom_unaccent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_communes_nom_unaccent"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS unaccent_lower(text)`);
  }
}
