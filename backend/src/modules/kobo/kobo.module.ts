import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campagne, KoboConfig, KoboSyncLog } from 'src/database/entities';
import { CommunesModule } from 'src/modules/communes/communes.module';
import { DepistagesModule } from 'src/modules/depistages/depistages.module';
import { KoboClientService } from './kobo-client.service';
import { KoboController } from './kobo.controller';
import { KoboSchedulerService } from './kobo-scheduler.service';
import { KoboService } from './kobo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KoboConfig, KoboSyncLog, Campagne]),
    CommunesModule,
    DepistagesModule,
  ],
  controllers: [KoboController],
  providers: [KoboService, KoboClientService, KoboSchedulerService],
  exports: [KoboService, KoboClientService],
})
export class KoboModule {}
