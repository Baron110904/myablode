import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Niveau départemental de la carte.
 *
 * Les 12 départements ne viennent pas d'un fichier de contours : ils sont
 * obtenus en fusionnant les communes qui les composent (`ST_Union`). Cette
 * fusion coûte ~400 ms, trop pour être refaite à chaque affichage — d'où une
 * table dédiée, remplie par le seed et rafraîchie avec les communes.
 *
 * `population` accueille les projections 2024 de l'INStaD diffusées par
 * OCHA (COD-PS Bénin) : elles permettent d'exprimer un taux de couverture
 * du dépistage, et non seulement un taux de positivité parmi les dépistés.
 */
export class Departements1756400300000 implements MigrationInterface {
  name = 'Departements1756400300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "departements" (
        "id" SERIAL PRIMARY KEY,
        "code" character varying(4) NOT NULL,
        "nom" character varying(60) NOT NULL,
        "geometry" geometry(Geometry, 4326),
        "centroid_lat" double precision,
        "centroid_lng" double precision,
        "population" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_departements_code" UNIQUE ("code"),
        CONSTRAINT "UQ_departements_nom" UNIQUE ("nom")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_departements_geom" ON "departements" USING GIST ("geometry")`,
    );

    // Le rattachement d'une commune à son département reste textuel : c'est la
    // clé que porte déjà le référentiel, et elle est unique.
    await queryRunner.query(
      `CREATE INDEX "idx_communes_departement" ON "communes" ("departement")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_communes_departement"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_departements_geom"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departements"`);
  }
}
