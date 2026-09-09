import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campagne } from 'src/database/entities';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campagne])],
  controllers: [CampagnesController],
  providers: [CampagnesService],
  exports: [CampagnesService],
})
export class CampagnesModule {}
