import { Module } from '@nestjs/common';
import { DepistagesModule } from 'src/modules/depistages/depistages.module';
import { NewsletterModule } from 'src/modules/newsletter/newsletter.module';
import { StatsModule } from 'src/modules/stats/stats.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [DepistagesModule, StatsModule, NewsletterModule],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
