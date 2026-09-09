import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Résultat « à vérifier » et génération des codes de dépistage.
 *
 * Deux corrections liées, toutes deux sur la fiabilité de ce qu'on affiche.
 *
 * 1. Une mesure hors des bornes physiologiques ne peut pas décider d'un
 *    résultat clinique. Une glycémie de 12 mg/dL était classée « Normal »
 *    parce que 12 est inférieur au seuil de 100 — alors que 12 mg/dL n'est
 *    pas une glycémie humaine. Ces lignes prennent désormais le résultat
 *    « à vérifier » : elles ne comptent ni comme cas détecté, ni comme
 *    dépistage normal.
 *
 * 2. Une séquence alimente les codes `BJ-AAMM-NNNNN`. Sans elle, un dépistage
 *    arrivé de Kobo sans code repartait avec l'identifiant technique de la
 *    soumission — un UUID de 36 caractères, illisible sur une fiche.
 */
export class ResultatAVerifier1756400600000 implements MigrationInterface {
  name = 'ResultatAVerifier1756400600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "depistages" DROP CONSTRAINT IF EXISTS "CHK_depistages_resultat"`,
    );
    await queryRunner.query(`
      ALTER TABLE "depistages" ADD CONSTRAINT "CHK_depistages_resultat"
      CHECK ("resultat" IN ('normal','pre-diabete','diabete','obesite','autre','a_verifier'))
    `);

    /*
     * Reprise des lignes déjà signalées hors norme : leur résultat avait été
     * calculé sur une mesure invraisemblable, il ne veut rien dire.
     */
    await queryRunner.query(`
      UPDATE "depistages"
      SET "resultat" = 'a_verifier'
      WHERE "hors_norme" = true AND "deleted_at" IS NULL
    `);

    /*
     * La séquence démarre au-delà du plus grand numéro déjà attribué, pour ne
     * pas produire un code en collision avec l'existant. `substring` isole les
     * cinq derniers caractères plutôt que d'utiliser une expression
     * rationnelle : tous les codes ne suivent pas le format.
     */
    const [borne] = await queryRunner.query(`
      SELECT COALESCE(MAX(substring("code_unique" FROM 9)::integer), 0) AS maximum
      FROM "depistages"
      WHERE "code_unique" ~ '^BJ-[0-9]{4}-[0-9]{5}$'
    `);

    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "depistage_code_seq" START WITH ${
        Number(borne?.maximum ?? 0) + 1
      }`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "depistage_code_seq"`);

    /*
     * Le résultat d'origine n'est pas récupérable — il était faux. Ces lignes
     * repartent en « autre », le fourre-tout historique, plutôt que de rendre
     * la contrainte invalide.
     */
    await queryRunner.query(
      `UPDATE "depistages" SET "resultat" = 'autre' WHERE "resultat" = 'a_verifier'`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" DROP CONSTRAINT IF EXISTS "CHK_depistages_resultat"`,
    );
    await queryRunner.query(`
      ALTER TABLE "depistages" ADD CONSTRAINT "CHK_depistages_resultat"
      CHECK ("resultat" IN ('normal','pre-diabete','diabete','obesite','autre'))
    `);
  }
}
