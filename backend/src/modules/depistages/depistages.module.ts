import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Depistage } from 'src/database/entities';
import { DepistagesController } from './depistages.controller';
import { DepistagesService } from './depistages.service';

@Module({
  imports: [TypeOrmModule.forFeature([Depistage])],
  controllers: [DepistagesController],
  providers: [DepistagesService],
  exports: [DepistagesService],
})
export class DepistagesModule {}
