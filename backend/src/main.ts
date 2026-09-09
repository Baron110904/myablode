// Doit rester en première position : voir src/fuseau.ts.
import './fuseau';
// Juste après, et sans dépendance : voir src/demarrage.ts.
import { secondesDepuisLancement } from './demarrage';

import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      // L'API ne sert pas de pages : la CSP est appliquée côté Next.js.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    // Indispensable pour que le cookie de refresh HttpOnly circule.
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // Sans cela le navigateur masque l'en-tête et les fichiers téléchargés
    // perdent le nom choisi côté serveur.
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Une propriété inconnue est probablement une faute de frappe : mieux
      // vaut la signaler que l'ignorer silencieusement.
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  if (config.get<string>('env') !== 'production') {
    const documentation = new DocumentBuilder()
      .setTitle('MyABLODE — API')
      .setDescription(
        'API de centralisation et de pilotage des campagnes de dépistage du ' +
          'diabète et de l’obésité au Bénin.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, documentation),
    );
  }

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);

  logger.log(
    `API MyABLODE démarrée sur http://localhost:${port}/api ` +
      `(${secondesDepuisLancement()} s depuis le lancement)`,
  );
  if (config.get<string>('env') !== 'production') {
    logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Démarrage impossible :', error);
  process.exit(1);
});
