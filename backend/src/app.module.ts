import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { CacheModule } from './common/cache/cache.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ENTITIES } from './database/entities';
import { AgentsModule } from './modules/agents/agents.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampagnesModule } from './modules/campagnes/campagnes.module';
import { CommunesModule } from './modules/communes/communes.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { MarcheModule } from './modules/marche/marche.module';
import { DepistagesModule } from './modules/depistages/depistages.module';
import { ExportsModule } from './modules/exports/exports.module';
import { PdfModule } from './modules/exports/pdf.module';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { KoboModule } from './modules/kobo/kobo.module';
import { MailModule } from './modules/mail/mail.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StatsModule } from './modules/stats/stats.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        /*
         * `url` prime quand elle est fournie : c'est ce que livrent les bases
         * infogérées. Les champs séparés restent la voie du développement
         * local, où l'on pointe un conteneur.
         */
        ...(config.get<string>('db.url')
          ? { url: config.get<string>('db.url') }
          : {
              host: config.get<string>('db.host'),
              port: config.get<number>('db.port'),
              username: config.get<string>('db.user'),
              password: config.get<string>('db.password'),
              database: config.get<string>('db.name'),
            }),
        /*
         * `rejectUnauthorized: false` accepte le certificat de l'hébergeur
         * sans en vérifier la chaîne. C'est ce qu'imposent Neon, Render et
         * Heroku, qui présentent des certificats signés par leur propre
         * autorité. La liaison reste chiffrée ; ce n'est pas l'absence de
         * TLS, c'est l'absence de vérification de l'émetteur.
         */
        ...(config.get<boolean>('db.ssl')
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
        entities: ENTITIES,
        // Le schéma est piloté par les migrations, jamais par synchronize.
        synchronize: false,
        logging: config.get<string>('env') === 'development' ? ['error'] : false,
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
          limit: config.get<number>('throttle.limit') ?? 100,
        },
      ],
    }),

    ScheduleModule.forRoot(),

    // Modules transverses (globaux)
    CacheModule,
    MailModule,
    PdfModule,
    AuditModule,
    SettingsModule,

    // Modules métier
    AuthModule,
    UsersModule,
    CommunesModule,
    CampagnesModule,
    DepistagesModule,
    StatsModule,
    AgentsModule,
    ArticlesModule,
    NewsletterModule,
    ContactsModule,
    MarcheModule,
    KoboModule,
    ImportsModule,
    ExportsModule,
    HealthModule,
  ],
  providers: [
    // Ordre volontaire : limitation de débit, puis authentification, puis rôles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
