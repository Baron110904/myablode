import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from 'src/modules/settings/settings.service';
import { gabaritParCle, remplirGabarit } from './gabarits';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface Message {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envoi d'emails via SMTP (section 3.2.7 « Email »).
 *
 * Sans SMTP_HOST configuré, le service bascule en mode journal : les messages
 * sont écrits dans les logs au lieu d'être envoyés. Cela permet de développer
 * et de tester sans serveur mail, et rend l'absence de configuration visible
 * plutôt que silencieuse.
 */
export interface ConfigurationSmtp {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
  secure?: boolean;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private expediteur: string;
  /** Configuration active, éventuellement remplacée à chaud par l'admin. */
  private configuration: ConfigurationSmtp | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {
    this.expediteur = this.config.get<string>('smtp.from')!;
    const host = this.config.get<string>('smtp.host');

    if (!host) {
      this.logger.warn(
        'SMTP non configuré : les emails seront journalisés au lieu d’être envoyés. ' +
          'Renseignez le serveur dans Paramètres → Email.',
      );
      return;
    }

    this.appliquer({
      host,
      port: this.config.get<number>('smtp.port') ?? 587,
      user: this.config.get<string>('smtp.user'),
      password: this.config.get<string>('smtp.password'),
      from: this.expediteur,
    });
  }

  /**
   * Remplace la configuration SMTP sans redémarrage.
   *
   * L'association change d'hébergeur mail sans intervention technique : la
   * nouvelle configuration prend effet dès l'enregistrement.
   */
  appliquer(configuration: ConfigurationSmtp): void {
    this.configuration = configuration;
    this.expediteur = configuration.from || this.expediteur;

    this.transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      // 465 impose TLS implicite ; 587 et 25 passent par STARTTLS.
      secure: configuration.secure ?? configuration.port === 465,
      auth: configuration.user
        ? { user: configuration.user, pass: configuration.password }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
    });
  }

  estConfigure(): boolean {
    return this.transporter !== null;
  }

  /** Configuration courante, mot de passe exclu. */
  configurationPublique(): Omit<ConfigurationSmtp, 'password'> & {
    motDePasseDefini: boolean;
  } | null {
    if (!this.configuration) return null;
    const { password, ...reste } = this.configuration;
    return { ...reste, motDePasseDefini: Boolean(password) };
  }

  /**
   * Vérifie que le serveur répond et accepte l'authentification, sans
   * envoyer de message. Renvoie un diagnostic lisible par l'administrateur.
   */
  async tester(
    configuration?: ConfigurationSmtp,
  ): Promise<{ ok: boolean; message: string }> {
    const cible = configuration
      ? nodemailer.createTransport({
          host: configuration.host,
          port: configuration.port,
          secure: configuration.secure ?? configuration.port === 465,
          auth: configuration.user
            ? { user: configuration.user, pass: configuration.password }
            : undefined,
          connectionTimeout: 15_000,
          greetingTimeout: 10_000,
        })
      : this.transporter;

    if (!cible) {
      return {
        ok: false,
        message:
          'Aucun serveur d’envoi configuré. Renseignez au minimum le serveur et le port.',
      };
    }

    try {
      await cible.verify();
      return {
        ok: true,
        message: 'Connexion au serveur d’envoi réussie.',
      };
    } catch (error) {
      return { ok: false, message: traduireErreurSmtp(error as Error) };
    }
  }

  async envoyer(message: Message): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(
        `[EMAIL NON ENVOYÉ — SMTP absent] à ${message.to} · « ${message.subject} »`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.expediteur,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text ?? htmlVersTexte(message.html),
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Envoi à ${message.to} échoué : ${(error as Error).message}`,
      );
      return false;
    }
  }

  /** Envoi d'essai vers une adresse choisie, pour valider la chaîne complète. */
  async envoyerTest(destinataire: string): Promise<{ ok: boolean; message: string }> {
    if (!this.transporter) {
      return {
        ok: false,
        message: 'Aucun serveur d’envoi configuré.',
      };
    }

    const envoye = await this.envoyer({
      to: destinataire,
      subject: 'MyABLODE — Message de test',
      html: gabarit(
        'Configuration validée',
        `<p>Si vous lisez ce message, l’envoi d’emails depuis la plateforme MyABLODE
          fonctionne correctement.</p>
         <p>Les notifications suivantes emprunteront ce même canal : réinitialisations
          de mot de passe, accusés de réception des formulaires, lettre d’information
          et alertes de synchronisation.</p>`,
      ),
    });

    return envoye
      ? { ok: true, message: `Message de test envoyé à ${destinataire}.` }
      : {
          ok: false,
          message:
            'Le serveur a refusé le message. Vérifiez l’adresse d’expédition et les identifiants.',
        };
  }

  /**
   * Gabarit réglé par l'administrateur, ou celui d'origine à défaut.
   *
   * Un objet ou un corps vide est ignoré : mieux vaut le texte de départ
   * qu'un courriel sans objet parti chez un abonné.
   */
  private async resoudre(cle: string): Promise<GabaritResolu> {
    const origine = gabaritParCle(cle);
    if (!origine) {
      throw new Error(`Gabarit de courriel inconnu : ${cle}`);
    }

    const regle = await this.settings
      .get<Partial<GabaritResolu> | null>(cle, null)
      .catch(() => null);

    return {
      sujet: regle?.sujet?.trim() || origine.sujet,
      corps: regle?.corps?.trim() || origine.corps,
    };
  }

  async envoyerReinitialisationMotDePasse(
    email: string,
    token: string,
  ): Promise<boolean> {
    const base = this.config.get<string[]>('corsOrigins')?.[0] ?? 'http://localhost:3000';
    const lien = `${base}/admin/reinitialiser-mot-de-passe?token=${token}`;
    const modele = await this.resoudre('mail_reinitialisation');

    /*
     * Le bouton est ajouté par le serveur, pas laissé au gabarit : une
     * adresse de réinitialisation recopiée à la main dans un champ de
     * réglages serait fausse au premier changement de domaine.
     */
    const bouton =
      `<p><a href="${lien}" style="display:inline-block;padding:12px 20px;` +
      `background:#0f766e;color:#fff;text-decoration:none;border-radius:4px">` +
      `Choisir un nouveau mot de passe</a></p>`;

    return this.envoyer({
      to: email,
      subject: remplirGabarit(modele.sujet, {}),
      html: gabarit(
        remplirGabarit(modele.sujet, {}).replace(/^MyABLODE\s*[—–-]\s*/, ''),
        remplirGabarit(modele.corps, { lien, duree: 'une heure' }, ['lien']) + bouton,
      ),
    });
  }

  async envoyerAccuseContact(email: string, nom: string): Promise<boolean> {
    const modele = await this.resoudre('mail_accuse_contact');
    return this.envoyer({
      to: email,
      subject: remplirGabarit(modele.sujet, { nom }),
      html: gabarit(`Merci ${nom}`, remplirGabarit(modele.corps, { nom })),
    });
  }

  async envoyerConfirmationBenevole(email: string, prenom: string): Promise<boolean> {
    const modele = await this.resoudre('mail_confirmation_benevole');
    return this.envoyer({
      to: email,
      subject: remplirGabarit(modele.sujet, { prenom }),
      html: gabarit(`Bienvenue ${prenom}`, remplirGabarit(modele.corps, { prenom })),
    });
  }

  /**
   * Réponse libre de l'association à un candidat bénévole.
   *
   * Le texte est celui rédigé par l'administrateur, échappé puis découpé en
   * paragraphes : il est saisi en texte simple, pas en HTML.
   */
  async envoyerReponseBenevole(
    email: string,
    prenom: string,
    reponse: string,
  ): Promise<boolean> {
    return this.envoyer({
      to: email,
      subject: 'Votre candidature de bénévole — ABLODE',
      html: `<p>Bonjour ${echapper(prenom)},</p>${enParagraphes(reponse)}<p>L’équipe de l’ABLODE</p>`,
    });
  }

  /**
   * Confirmation d'acceptation.
   *
   * **Aucun identifiant n'y figure.** Le compte est créé au même moment, mais
   * ses accès sont remis en main propre lorsque la personne se présente : un
   * mot de passe envoyé par courriel resterait lisible dans une boîte de
   * réception, pour un bénévole qui ne viendra peut-être jamais.
   */
  async envoyerAcceptationBenevole(
    email: string,
    prenom: string,
    mot?: string,
  ): Promise<boolean> {
    return this.envoyer({
      to: email,
      subject: 'Bienvenue parmi les bénévoles de l’ABLODE',
      html:
        `<p>Bonjour ${echapper(prenom)},</p>` +
        '<p>Votre candidature de bénévole est acceptée. Merci de vous joindre ' +
        'à nos équipes de dépistage.</p>' +
        (mot ? enParagraphes(mot) : '') +
        '<p>Vos accès à la plateforme vous seront remis lors de votre première ' +
        'participation sur le terrain.</p>' +
        '<p>L’équipe de l’ABLODE</p>',
    });
  }

  async envoyerNewsletter(
    email: string,
    sujet: string,
    contenu: string,
    tokenDesinscription: string,
  ): Promise<boolean> {
    const base = this.config.get<string[]>('corsOrigins')?.[0] ?? 'http://localhost:3000';
    const lien = `${base}/newsletter/desinscription?token=${tokenDesinscription}`;
    return this.envoyer({
      to: email,
      subject: sujet,
      html: gabarit(
        sujet,
        `${contenu}
         <p style="margin-top:32px;color:#94a3b8;font-size:12px">
           Vous recevez cet email car vous êtes inscrit à la lettre de l’ABLODE.
           <a href="${lien}" style="color:#94a3b8">Se désinscrire</a>.
         </p>`,
      ),
    });
  }
}

/**
 * Objet et corps d'un message, tels que l'administrateur les a réglés.
 *
 * Un champ laissé vide revient au texte d'origine : l'écran de réglages ne
 * doit pas pouvoir produire un courriel sans objet.
 */
export interface GabaritResolu {
  sujet: string;
  corps: string;
}

function gabarit(titre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f8fafc;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:32px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e">MyABLODE</p>
      <h1 style="margin:0 0 20px;font-size:22px;color:#0f172a">${titre}</h1>
      <div style="color:#334155;font-size:15px;line-height:1.65">${corps}</div>
    </div>
    <p style="margin-top:20px;text-align:center;color:#94a3b8;font-size:12px">
      ABLODE — Association Béninoise de Lutte contre l’Obésité, le Diabète et les Endocrinopathies · Abomey-Calavi, Bénin
    </p>
  </div>
</body></html>`;
}

/**
 * Traduit les erreurs SMTP en messages actionnables.
 *
 * « ECONNREFUSED » ou « EAUTH » ne disent rien à un administrateur
 * d'association : chaque code est associé à la vérification à effectuer.
 */
function traduireErreurSmtp(erreur: Error): string {
  const code = (erreur as unknown as { code?: string }).code ?? '';
  const message = erreur.message ?? '';
  // Nodemailer enveloppe les erreurs réseau : le code d'origine (ENOTFOUND,
  // ECONNREFUSED…) se retrouve dans le message plutôt que dans `code`.
  const indices = `${code} ${message}`;

  if (/EAUTH|invalid login|authentication failed|535|534/i.test(indices)) {
    return 'Identifiants refusés par le serveur. Vérifiez le nom d’utilisateur et le mot de passe.';
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(indices)) {
    return 'Serveur introuvable. Vérifiez l’orthographe de son adresse.';
  }
  if (/ECONNREFUSED/i.test(indices)) {
    return 'Le serveur a refusé la connexion. Vérifiez l’adresse du serveur et le port.';
  }
  if (/ETIMEDOUT|timeout|greeting never received/i.test(indices)) {
    return (
      'Le serveur n’a pas répondu dans le délai imparti. Le port est peut-être ' +
      'bloqué par le pare-feu de l’hébergement.'
    );
  }
  if (/certificate|self.signed|SSL|wrong version number/i.test(indices)) {
    return (
      'Échange chiffré refusé. Vérifiez le port : 465 pour un TLS direct, ' +
      '587 pour un chiffrement négocié.'
    );
  }
  if (/ECONNRESET|EPIPE/i.test(indices)) {
    return 'La connexion a été interrompue par le serveur. Vérifiez le port et le mode de chiffrement.';
  }
  return `Échec de la connexion : ${message}`;
}

function htmlVersTexte(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Échappe le texte destiné à un corps de courriel HTML.
 *
 * Le prénom et la réponse viennent d'une saisie libre : sans échappement, un
 * nom contenant `<` casserait la mise en page, et un texte collé pourrait
 * injecter du balisage dans le message envoyé.
 */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convertit un texte simple en paragraphes HTML.
 *
 * Les lignes vides séparent les paragraphes, les retours simples deviennent
 * des sauts de ligne : c'est ce qu'attend quelqu'un qui a rédigé sa réponse
 * dans une zone de texte.
 */
function enParagraphes(texte: string): string {
  const SAUT = String.fromCharCode(10);
  return texte
    .split(SAUT + SAUT)
    .map((bloc) => bloc.trim())
    .filter(Boolean)
    .map((bloc) => `<p>${echapper(bloc).split(SAUT).join('<br />')}</p>`)
    .join('');
}
