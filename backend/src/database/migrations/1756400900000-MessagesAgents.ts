import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Éloges et rappels adressés aux agents.
 *
 * La table ne portait que des félicitations. Le terrain a besoin des deux :
 * reconnaître une équipe qui tient sa zone, et signaler un relâchement avant
 * qu'il ne s'installe. Un rappel écrit et daté vaut mieux qu'une remarque
 * orale que personne ne retrouve.
 *
 * La table est renommée pour ce qu'elle contient désormais.
 */
export class MessagesAgents1756400900000 implements MigrationInterface {
  name = 'MessagesAgents1756400900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_felicitations"
        ADD COLUMN "type" character varying(10) NOT NULL DEFAULT 'eloge'
    `);
    await queryRunner.query(`
      ALTER TABLE "agent_felicitations" ADD CONSTRAINT "CHK_message_agent_type"
      CHECK ("type" IN ('eloge','rappel'))
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_agents_type" ON "agent_felicitations" ("type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_agents_type"`);
    await queryRunner.query(
      `ALTER TABLE "agent_felicitations" DROP CONSTRAINT IF EXISTS "CHK_message_agent_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_felicitations" DROP COLUMN IF EXISTS "type"`,
    );
  }
}
