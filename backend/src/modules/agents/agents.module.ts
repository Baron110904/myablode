import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent, AgentAffectation, AgentFelicitation } from 'src/database/entities';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentAffectation, AgentFelicitation])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
