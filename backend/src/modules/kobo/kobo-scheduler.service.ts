import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from 'src/modules/mail/mail.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { KoboService } from './kobo.service';

/**
 * Synchronisation automatique (section 3.2.3.A).
 *
 * Le déclencheur tourne toutes les 5 minutes et compare l'horloge à
 * l'intervalle configuré : l'administrateur peut changer la fréquence depuis
 * l'interface sans redémarrer le serveur, ce qu'un `@Cron` figé interdirait.
 */
@Injectable()
export class KoboSchedulerService {
  private readonly logger = new Logger(KoboSchedulerService.name);

  constructor(
    private readonly kobo: KoboService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'kobo-auto-sync' })
  async synchronisationAutomatique(): Promise<void> {
    const config = await this.kobo.getConfig();

    if (!config.auto_sync_enabled || !config.api_token || !config.form_id) {
      return;
    }

    const intervalleMs = Math.max(config.sync_interval, 5) * 60 * 1000;
    const derniere = config.last_sync_at?.getTime() ?? 0;
    if (Date.now() - derniere < intervalleMs) {
      return;
    }

    try {
      const resultat = await this.kobo.synchroniser('cron');
      this.logger.log(`Synchronisation automatique : ${resultat.message}`);

      if (resultat.importes > 0) {
        await this.audit.log({
          userId: null,
          action: 'sync',
          entity: 'kobo',
          metadata: {
            declencheur: 'cron',
            importes: resultat.importes,
            doublons: resultat.doublons,
            erreurs: resultat.erreurs,
          },
        });
      }
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Synchronisation automatique échouée : ${message}`);

      // US-ADM-17 : l'administrateur doit être averti d'un échec de synchro.
      await this.alerterAdministrateurs(message);
      await this.audit.log({
        userId: null,
        action: 'sync_failed',
        entity: 'kobo',
        metadata: { declencheur: 'cron', erreur: message },
      });
    }
  }

  private async alerterAdministrateurs(erreur: string): Promise<void> {
    const config = await this.kobo.getConfig();
    // Deux échecs consécutifs suffisent à alerter : un incident réseau isolé
    // ne doit pas déclencher d'email à chaque tentative.
    const logs = await this.kobo.historiqueLogs(2);
    const deuxEchecs =
      logs.length >= 2 && logs.every((log) => log.statut === 'erreur');
    if (!deuxEchecs) return;

    await this.mail.envoyer({
      to: process.env.SEED_ADMIN_EMAIL ?? 'admin@ablode.bj',
      subject: 'MyABLODE — Échec de la synchronisation Kobo',
      html: `<p>La synchronisation automatique avec KoboToolbox a échoué deux fois de suite.</p>
             <p><strong>Dernière erreur :</strong> ${echapper(erreur)}</p>
             <p>Formulaire : <code>${echapper(config.form_id ?? '—')}</code></p>
             <p>Vérifiez le jeton API et la connexion réseau dans Paramètres → Kobo.</p>`,
    });
  }
}

function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
