import { Global, Logger, Module, OnModuleInit } from '@nestjs/common';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { SettingsService } from 'src/modules/settings/settings.service';
import { MailController } from './mail.controller';
import { ConfigurationSmtp, MailService } from './mail.service';

@Global()
@Module({
  imports: [SettingsModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule implements OnModuleInit {
  private readonly logger = new Logger(MailModule.name);

  constructor(
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Applique la configuration SMTP enregistrée en base au démarrage.
   *
   * Elle a priorité sur les variables d'environnement : c'est celle que
   * l'administrateur a saisie depuis l'interface, sans accès au serveur.
   */
  async onModuleInit(): Promise<void> {
    try {
      const enregistree = await this.settings.get<ConfigurationSmtp | null>(
        'email_smtp',
        null,
      );
      if (enregistree?.host) {
        this.mail.appliquer(enregistree);
        this.logger.log(
          `Configuration d’envoi chargée depuis les paramètres (${enregistree.host}).`,
        );
      }
    } catch (error) {
      // Une base indisponible au démarrage ne doit pas empêcher l'API de
      // monter : le repli sur les variables d'environnement reste en place.
      this.logger.warn(
        `Configuration d’envoi non relue : ${(error as Error).message}`,
      );
    }
  }
}
