import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Trois évolutions éditoriales demandées après la refonte.
 *
 * 1. `articles.a_la_une` — la mise en avant était jusqu'ici implicite : la
 *    page d'actualités promouvait d'office l'article le plus récent. La
 *    rédaction veut choisir, un article de fond pouvant mériter l'encart
 *    plus longtemps qu'une brève.
 *
 * 2. `articles.date_retrait` — échéance facultative au-delà de laquelle
 *    l'article quitte le site sans quitter le back-office. L'annonce d'un
 *    événement passé n'a plus à être dépubliée à la main, et l'archive
 *    reste consultable côté rédaction.
 *
 * 3. La fiche pratique du formulaire de marche (`date_evenement`, `lieu`,
 *    `parcours`, `sur_place`, `a_prevoir`) : le jour J, le point de départ,
 *    la distance et ce qu'il faut emporter. Ces informations figuraient
 *    dans le texte d'introduction, où personne ne les retrouvait au moment
 *    de partir.
 *
 * `fonction` et `quartier` perdent leur contrainte NOT NULL : ces deux
 * champs deviennent facultatifs au bulletin, et une colonne obligatoire
 * rejetterait l'inscription de qui les laisse vides.
 */
export class UneRetraitFicheMarche1756401300000 implements MigrationInterface {
  name = 'UneRetraitFicheMarche1756401300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN "a_la_une" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD COLUMN "date_retrait" TIMESTAMP`,
    );

    /*
     * Le site n'interroge jamais les articles sans filtrer sur le statut et
     * la date de publication ; l'index existant porte déjà ce couple. Celui
     * -ci sert l'ordre de la liste publique, qui remonte désormais les
     * articles à la une avant les autres.
     */
    await queryRunner.query(
      `CREATE INDEX "idx_articles_une_date" ON "articles" ("a_la_une", "date_publication")`,
    );

    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "date_evenement" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "lieu" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "parcours" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "sur_place" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "a_prevoir" text`,
    );

    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ALTER COLUMN "fonction" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ALTER COLUMN "quartier" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /*
     * Les lignes dont `fonction` ou `quartier` est vide sont nées sous cette
     * migration : la contrainte ne peut être rétablie en les laissant. Un
     * tiret plutôt qu'une suppression — l'inscription reste valable, c'est
     * la colonne qui redevient exigeante.
     */
    await queryRunner.query(
      `UPDATE "inscriptions_marche" SET "fonction" = '-' WHERE "fonction" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "inscriptions_marche" SET "quartier" = '-' WHERE "quartier" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ALTER COLUMN "quartier" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ALTER COLUMN "fonction" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" DROP COLUMN "a_prevoir"`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" DROP COLUMN "sur_place"`,
    );
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" DROP COLUMN "parcours"`,
    );
    await queryRunner.query(`ALTER TABLE "formulaires_marche" DROP COLUMN "lieu"`);
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" DROP COLUMN "date_evenement"`,
    );

    await queryRunner.query(`DROP INDEX "idx_articles_une_date"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "date_retrait"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "a_la_une"`);
  }
}
