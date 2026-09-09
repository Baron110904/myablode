import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Formulaire d'inscription à la marche « Sucre à terre », et ses inscriptions.
 *
 * Le formulaire est rattaché à un article : c'est celui de l'édition en cours
 * qui le porte sur le site public. Un article par édition, donc un formulaire
 * par édition — les inscriptions de l'an dernier restent consultables sans se
 * mélanger à celles de cette année.
 *
 * Les champs des inscriptions sont fixes et connus d'avance : ce n'est pas un
 * constructeur de formulaires. Ce qui se configure, c'est le titre, le texte
 * d'accueil, la date de fermeture et la publication.
 */
export class InscriptionsMarche1756401000000 implements MigrationInterface {
  name = 'InscriptionsMarche1756401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "formulaires_marche" (
        "id" SERIAL PRIMARY KEY,
        "article_id" integer NOT NULL,
        "titre" character varying(200) NOT NULL,
        "introduction" text,
        /* Sans date, le formulaire reste ouvert jusqu'à sa dépublication. */
        "date_fermeture" TIMESTAMP,
        "message_ferme" character varying(400),
        "publie" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "FK_formulaire_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE,
        /* Un seul formulaire par article : l'article est le support. */
        CONSTRAINT "UQ_formulaire_article" UNIQUE ("article_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inscriptions_marche" (
        "id" SERIAL PRIMARY KEY,
        "formulaire_id" integer NOT NULL,
        "nom" character varying(100) NOT NULL,
        "prenom" character varying(100) NOT NULL,
        "age" integer NOT NULL,
        "sexe" character varying(1) NOT NULL,
        "fonction" character varying(120) NOT NULL,
        "ville" character varying(100) NOT NULL,
        "quartier" character varying(120) NOT NULL,
        "deja_participe" boolean NOT NULL DEFAULT false,
        "motivation" text,
        "traite" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_inscription_formulaire" FOREIGN KEY ("formulaire_id")
          REFERENCES "formulaires_marche"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_inscription_sexe" CHECK ("sexe" IN ('M','F')),
        /*
         * Bornes larges : la marche est ouverte à tous, y compris aux
         * enfants accompagnés. Elles écartent la faute de frappe, pas une
         * tranche d'âge.
         */
        CONSTRAINT "CHK_inscription_age" CHECK ("age" BETWEEN 3 AND 120)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_inscriptions_formulaire" ON "inscriptions_marche" ("formulaire_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inscriptions_traite" ON "inscriptions_marche" ("traite") WHERE "traite" = false`,
    );

    /*
     * Une même personne ne s'inscrit qu'une fois par édition. La comparaison
     * ignore accents et casse : « Kossi ADJOVI » et « kossi adjovi » sont la
     * même personne, et le doublon serait invisible à l'œil dans la liste.
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_inscription_personne"
      ON "inscriptions_marche" ("formulaire_id", unaccent_lower("nom"), unaccent_lower("prenom"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inscriptions_marche"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "formulaires_marche"`);
  }
}
