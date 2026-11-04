import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evenement } from 'src/database/entities';
import { EvenementsController } from './evenements.controller';
import { EvenementsService } from './evenements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Evenement])],
  controllers: [EvenementsController],
  providers: [EvenementsService],
})
export class EvenementsModule {}
