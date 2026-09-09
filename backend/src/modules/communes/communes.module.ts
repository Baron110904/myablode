import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commune } from 'src/database/entities';
import { CommunesController } from './communes.controller';
import { CommunesService } from './communes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Commune])],
  controllers: [CommunesController],
  providers: [CommunesService],
  exports: [CommunesService],
})
export class CommunesModule {}
