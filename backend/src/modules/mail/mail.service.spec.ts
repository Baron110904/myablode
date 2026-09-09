import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from 'src/modules/settings/settings.service';
import { MailService } from './mail.service';

/**
 * Les diagnostics SMTP sont lus par un administrateur d'association, pas par
 * un développeur : chaque échec doit indiquer quoi vérifier.
 */
describe('MailService — diagnostic des erreurs SMTP', () => {
  let service: MailService;

  const valeurs: Record<string, unknown> = {
    'smtp.from': 'MyABLODE <no-reply@ablode.bj>',
    'smtp.host': undefined,
    'smtp.port': 587,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: { get: (cle: string) => valeurs[cle] },
        },
        /*
         * Aucun gabarit personnalisé : ces cas portent sur le diagnostic SMTP,
         * pas sur le contenu des messages. Le service doit alors retomber sur
         * les textes d'origine.
         */
        {
          provide: SettingsService,
          useValue: { get: async () => null },
        },
      ],
    }).compile();

    service = module.get(MailService);
  });

  it('signale l’absence de configuration plutôt que d’échouer en silence', async () => {
    expect(service.estConfigure()).toBe(false);

    const resultat = await service.tester();
    expect(resultat.ok).toBe(false);
    expect(resultat.message).toContain('Aucun serveur');
  });

  it('n’envoie rien tant qu’aucun serveur n’est configuré', async () => {
    // L'appel réussit sans lever d'exception, mais renvoie false : le reste
    // de l'application ne doit pas s'effondrer faute de serveur mail.
    await expect(service.envoyer({
      to: 'test@example.bj',
      subject: 'Sujet',
      html: '<p>Corps</p>',
    })).resolves.toBe(false);
  });

  it('traduit un serveur introuvable en message actionnable', async () => {
    const resultat = await service.tester({
      host: 'serveur.qui.nexiste.pas.invalid',
      port: 587,
      from: 'test@ablode.bj',
    });

    expect(resultat.ok).toBe(false);
    expect(resultat.message).toContain('Serveur introuvable');
    // Le code technique brut ne doit pas remonter à l'interface.
    expect(resultat.message).not.toContain('ENOTFOUND');
    expect(resultat.message).not.toContain('getaddrinfo');
  }, 30_000);

  it('applique une nouvelle configuration sans redémarrage', () => {
    expect(service.estConfigure()).toBe(false);

    service.appliquer({
      host: 'smtp.exemple.bj',
      port: 587,
      user: 'utilisateur',
      password: 'secret',
      from: 'ABLODE <contact@ablode.bj>',
    });

    expect(service.estConfigure()).toBe(true);
  });

  it('ne divulgue jamais le mot de passe SMTP', () => {
    service.appliquer({
      host: 'smtp.exemple.bj',
      port: 587,
      user: 'utilisateur',
      password: 'motDePasseSecret',
      from: 'ABLODE <contact@ablode.bj>',
    });

    const publique = service.configurationPublique();
    expect(publique).not.toBeNull();
    expect(JSON.stringify(publique)).not.toContain('motDePasseSecret');
    expect(publique?.motDePasseDefini).toBe(true);
  });

  it('déduit le chiffrement direct du port 465', () => {
    service.appliquer({
      host: 'smtp.exemple.bj',
      port: 465,
      from: 'ABLODE <contact@ablode.bj>',
    });
    expect(service.estConfigure()).toBe(true);
  });
});
