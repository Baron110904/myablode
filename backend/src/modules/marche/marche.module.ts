import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormulaireMarche, InscriptionMarche } from 'src/database/entities';
import { NewsletterModule } from 'src/modules/newsletter/newsletter.module';
import { MarcheController } from './marche.controller';
import { MarcheService } from './marche.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormulaireMarche, InscriptionMarche]),
    NewsletterModule,
  ],
  controllers: [MarcheController],
  providers: [MarcheService],
  exports: [MarcheService],
})
export class MarcheModule {}
