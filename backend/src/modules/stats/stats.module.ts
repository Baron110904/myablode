import { Module } from '@nestjs/common';
import { CampagnesModule } from 'src/modules/campagnes/campagnes.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [CampagnesModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
