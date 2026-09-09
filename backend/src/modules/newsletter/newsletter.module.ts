import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, NewsletterAbonne, NewsletterEnvoi } from 'src/database/entities';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NewsletterAbonne, NewsletterEnvoi, Article]),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
