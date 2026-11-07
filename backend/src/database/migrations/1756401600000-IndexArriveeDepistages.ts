import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index sur l'heure d'arrivée des dépistages.
 *
 * Le suivi en direct agrège sur `created_at` - l'heure à laquelle la donnée
 * atteint la plateforme - et s'interroge toutes les deux secondes. Or la
 * table ne portait d'index que sur `date_depistage`, la date de l'examen :
 * toutes les requêtes du direct passaient donc par un parcours séquentiel.
 *
 * Mesuré sur 120 000 lignes, PostgreSQL 15 :
 *
 *   fenêtre 1 h          989 ms  ->  209 ms   (×4,7)
 *   fenêtre 7 j          929 ms  ->  217 ms   (×4,3)
 *   totaux jour+fenêtre   44 ms  ->  1,2 ms   (×36)
 *   flux des arrivées     73 ms  ->  0,12 ms  (×612)
 *
 * Le premier chiffre est le plus parlant : une seconde par requête, relancée
 * toutes les deux secondes et par visiteur de l'écran, ne tient pas.
 *
 * Index partiel : toutes ces requêtes filtrent sur `deleted_at IS NULL`. Les
 * lignes supprimées n'ont donc pas à y figurer, ce qui le garde compact.
 * Décroissant parce que le flux des arrivées lit les plus récentes en
 * premier - c'est ce qui lui fait gagner trois ordres de grandeur.
 *
 * Coût : une écriture de plus par dépistage inséré. Négligeable face à une
 * collecte qui se compte en milliers de lignes par campagne, là où l'écran
 * de suivi interroge, lui, plusieurs fois par seconde.
 */
export class IndexArriveeDepistages1756401600000 implements MigrationInterface {
  name = 'IndexArriveeDepistages1756401600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_arrivee"
         ON "depistages" ("created_at" DESC)
         WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_depistages_arrivee"`);
  }
}
