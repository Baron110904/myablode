import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Benevole, ContactMessage } from 'src/database/entities';
import { AgentsModule } from 'src/modules/agents/agents.module';
import { UsersModule } from 'src/modules/users/users.module';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactMessage, Benevole]),
    /*
     * L'acceptation d'une candidature crée une fiche agent et un compte :
     * les deux services sont donc nécessaires ici.
     */
    AgentsModule,
    UsersModule,
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
