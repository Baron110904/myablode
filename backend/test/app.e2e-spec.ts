import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from 'src/app.module';

/**
 * Tests de bout en bout sur la base de développement.
 *
 * Ils vérifient le contrat public de l'API et le cloisonnement des données
 * nominatives. Aucune écriture n'est effectuée hors des routes d'authentification.
 */
describe('API MyABLODE (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Santé', () => {
    it('GET /api/health répond sans authentification', async () => {
      const reponse = await request(app.getHttpServer()).get('/api/health').expect(200);
      expect(reponse.body.statut).toBe('ok');
      expect(reponse.body.base).toBe('connectee');
    });
  });

  describe('Routes publiques du site vitrine', () => {
    it('GET /api/stats/resume renvoie les chiffres clés', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/stats/resume?periode=tout')
        .expect(200);

      expect(typeof reponse.body.totalDepistages).toBe('number');
      expect(typeof reponse.body.tauxPrevalence).toBe('number');
      expect(reponse.body.totalCommunes).toBe(77);
    });

    it('GET /api/communes renvoie les 77 communes du Bénin', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/communes')
        .expect(200);

      expect(reponse.body).toHaveLength(77);
      expect(reponse.body[0]).toHaveProperty('nom');
      expect(reponse.body[0]).toHaveProperty('departement');
    });

    it('GET /api/stats/carte renvoie un GeoJSON exploitable par Leaflet', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/stats/carte?periode=tout')
        .expect(200);

      expect(reponse.body.type).toBe('FeatureCollection');
      expect(reponse.body.features).toHaveLength(77);

      const feature = reponse.body.features[0];
      expect(feature.geometry).toHaveProperty('coordinates');
      expect(feature.properties).toHaveProperty('taux');
      expect(feature.properties).toHaveProperty('depistages');
    });

    it('GET /api/articles/publies ne renvoie que des articles publiés', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/articles/publies')
        .expect(200);

      expect(Array.isArray(reponse.body.items)).toBe(true);
      for (const article of reponse.body.items) {
        expect(article.statut).toBe('published');
      }
    });

    it('rejette un filtre de période invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/stats/resume?periode=inexistante')
        .expect(400);
    });

    it('rejette un paramètre de requête inconnu', async () => {
      await request(app.getHttpServer())
        .get('/api/stats/resume?parametreInvente=1')
        .expect(400);
    });
  });

  describe('Protection des données nominatives', () => {
    it('GET /api/depistages exige une authentification', async () => {
      await request(app.getHttpServer()).get('/api/depistages').expect(401);
    });

    it('GET /api/users exige une authentification', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('GET /api/kobo/config exige une authentification', async () => {
      await request(app.getHttpServer()).get('/api/kobo/config').expect(401);
    });

    it('rejette un jeton falsifié', async () => {
      await request(app.getHttpServer())
        .get('/api/depistages')
        .set('Authorization', 'Bearer jeton.invalide.forge')
        .expect(401);
    });
  });

  describe('Authentification', () => {
    it('refuse un mot de passe erroné sans révéler si le compte existe', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@ablode.bj', password: 'MauvaisMotDePasse1' })
        .expect(401);

      expect(reponse.body.message).toBe('Email ou mot de passe incorrect.');
    });

    it('renvoie le même message pour un compte inexistant', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'inconnu@example.com', password: 'MauvaisMotDePasse1' })
        .expect(401);

      expect(reponse.body.message).toBe('Email ou mot de passe incorrect.');
    });

    it('rejette une adresse email malformée', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'pas-un-email', password: 'x' })
        .expect(400);
    });

    it('connecte le super administrateur et pose le cookie de refresh', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: process.env.SEED_ADMIN_EMAIL ?? 'admin@ablode.bj',
          password: process.env.SEED_ADMIN_PASSWORD ?? 'Ablode2026!',
        })
        .expect(200);

      expect(reponse.body.accessToken).toBeDefined();
      expect(reponse.body.user.role).toBe('super_admin');

      const cookies = reponse.headers['set-cookie'] as unknown as string[];
      const refresh = cookies.find((cookie) => cookie.startsWith('ablode_refresh='));
      expect(refresh).toBeDefined();
      // Le refresh token ne doit jamais être lisible en JavaScript.
      expect(refresh).toContain('HttpOnly');

      accessToken = reponse.body.accessToken;
    });

    it('donne accès aux dépistages une fois authentifié', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/depistages?limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reponse.body.items.length).toBeLessThanOrEqual(5);
      expect(typeof reponse.body.total).toBe('number');
    });

    it('GET /api/auth/me renvoie le profil courant', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reponse.body.email).toBe(
        process.env.SEED_ADMIN_EMAIL ?? 'admin@ablode.bj',
      );
      // Le hash du mot de passe ne doit jamais sortir de l'API.
      expect(reponse.body).not.toHaveProperty('password_hash');
    });
  });

  describe('Intégration Kobo', () => {
    it('ne renvoie jamais le jeton API en clair', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/kobo/config')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reponse.body).not.toHaveProperty('api_token');
      expect(reponse.body).toHaveProperty('token_configure');
    });

    it('signale clairement une configuration incomplète', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/kobo/test')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(reponse.body.ok).toBe(false);
      expect(reponse.body.message).toContain('jeton');
    });

    it('refuse une synchronisation sans configuration', async () => {
      const reponse = await request(app.getHttpServer())
        .post('/api/kobo/sync')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(reponse.body.message).toContain('Configuration Kobo incomplète');
    });
  });

  describe('Exports', () => {
    it('produit un CSV avec en-têtes en français', async () => {
      const reponse = await request(app.getHttpServer())
        .get('/api/exports/depistages?format=csv&communeId=999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(reponse.headers['content-type']).toContain('text/csv');
      expect(reponse.text).toContain('Commune');
      expect(reponse.text).toContain('Résultat');
    });
  });
});
