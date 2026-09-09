import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, PaginationDto, paginate } from 'src/common/dto/pagination.dto';
import {
  Benevole,
  ContactMessage,
  RoleTerrain,
  StatutCandidature,
  UserRole,
} from 'src/database/entities';
import { AgentsService } from 'src/modules/agents/agents.service';
import { UsersService } from 'src/modules/users/users.service';
import { MailService } from 'src/modules/mail/mail.service';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly messages: Repository<ContactMessage>,
    @InjectRepository(Benevole)
    private readonly benevoles: Repository<Benevole>,
    private readonly mail: MailService,
    private readonly agents: AgentsService,
    private readonly users: UsersService,
  ) {}

  async creerMessage(dto: {
    nom: string;
    email: string;
    sujet?: string;
    message: string;
  }): Promise<{ message: string }> {
    await this.messages.save(
      this.messages.create({
        nom: dto.nom.trim(),
        email: dto.email.toLowerCase().trim(),
        sujet: dto.sujet?.trim() ?? null,
        message: dto.message.trim(),
      }),
    );

    // L'accusé de réception ne doit pas faire échouer l'enregistrement du
    // message si le SMTP est indisponible.
    void this.mail.envoyerAccuseContact(dto.email, dto.nom).catch(() => undefined);

    return {
      message: 'Votre message a bien été transmis à l’ABLODE. Nous vous répondrons rapidement.',
    };
  }

  async creerBenevole(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    ville?: string;
    disponibilite?: string;
    message?: string;
  }): Promise<{ message: string }> {
    await this.benevoles.save(
      this.benevoles.create({
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
        email: dto.email.toLowerCase().trim(),
        telephone: dto.telephone?.trim() ?? null,
        ville: dto.ville?.trim() ?? null,
        disponibilite: dto.disponibilite?.trim() ?? null,
        message: dto.message?.trim() ?? null,
      }),
    );

    void this.mail
      .envoyerConfirmationBenevole(dto.email, dto.prenom)
      .catch(() => undefined);

    return {
      message:
        'Merci ! Votre candidature est enregistrée, un membre de l’équipe vous contactera.',
    };
  }

  async findMessages(
    pagination: PaginationDto,
    traite?: boolean,
  ): Promise<PaginatedResult<ContactMessage>> {
    const [items, total] = await this.messages.findAndCount({
      where: traite === undefined ? {} : { traite },
      order: { created_at: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(items, total, pagination);
  }

  async findBenevoles(
    pagination: PaginationDto,
    traite?: boolean,
  ): Promise<PaginatedResult<Benevole>> {
    const [items, total] = await this.benevoles.findAndCount({
      where: traite === undefined ? {} : { traite },
      order: { created_at: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });
    return paginate(items, total, pagination);
  }

  async marquerMessage(id: number, traite: boolean): Promise<ContactMessage> {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Message ${id} introuvable.`);
    message.traite = traite;
    return this.messages.save(message);
  }

  /**
   * Réponse écrite au candidat.
   *
   * Le message est envoyé **et** conservé : sans trace, personne ne sait ce
   * qui a été promis à la personne qui se présentera dans trois semaines.
   * L'envoi qui échoue n'annule pas l'enregistrement — un serveur SMTP
   * indisponible ne doit pas faire perdre la réponse rédigée.
   */
  async repondreBenevole(id: number, reponse: string): Promise<Benevole> {
    const benevole = await this.trouverBenevole(id);

    benevole.reponse = reponse.trim();
    benevole.repondu_le = new Date();
    const enregistre = await this.benevoles.save(benevole);

    await this.mail.envoyerReponseBenevole(
      benevole.email,
      benevole.prenom,
      reponse.trim(),
    );

    return enregistre;
  }

  /**
   * Acceptation d'une candidature.
   *
   * Trois effets : la fiche agent qui rend la personne affectable à une
   * campagne, un compte de consultation en lecture seule, et un courriel de
   * bienvenue.
   *
   * **Le courriel ne contient pas les identifiants.** Ils sont renvoyés une
   * seule fois à l'administrateur, qui les remet en main propre quand la
   * personne se présente. Un mot de passe dans une boîte de réception est un
   * mot de passe divulgué — et rien ne garantit que le candidat viendra.
   */
  async accepterBenevole(
    id: number,
    reponse?: string,
  ): Promise<{ benevole: Benevole; identifiants?: { email: string; motDePasse: string } }> {
    const benevole = await this.trouverBenevole(id);

    if (benevole.statut === StatutCandidature.ACCEPTE) {
      throw new ConflictException('Cette candidature est déjà acceptée.');
    }

    /*
     * Fiche agent. Le rôle terrain « bénévole » la distingue des infirmiers
     * et des superviseurs dans les filtres de la page Agents.
     */
    const agent = await this.agents.create({
      nom: benevole.nom,
      prenom: benevole.prenom,
      email: benevole.email,
      telephone: benevole.telephone ?? undefined,
      role_terrain: RoleTerrain.BENEVOLE,
      notes: [
        'Candidature spontanée acceptée.',
        benevole.ville ? `Ville : ${benevole.ville}` : null,
        benevole.disponibilite ? `Disponibilité : ${benevole.disponibilite}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });

    /*
     * Compte de consultation. Le rôle « viewer » donne accès aux dépistages,
     * au suivi en direct et aux messages, en lecture seule.
     *
     * Un compte peut déjà exister pour cette adresse — un ancien bénévole qui
     * repostule. On réutilise alors le compte plutôt que d'échouer.
     */
    let identifiants: { email: string; motDePasse: string } | undefined;
    let userId: number | null = null;

    const compteExistant = await this.users.findByEmail(benevole.email);
    if (compteExistant) {
      userId = compteExistant.id;
    } else {
      const cree = await this.users.create({
        email: benevole.email,
        nom: benevole.nom,
        prenom: benevole.prenom,
        role: UserRole.VIEWER,
      });
      userId = cree.user.id;
      if (cree.motDePasseTemporaire) {
        identifiants = {
          email: cree.user.email,
          motDePasse: cree.motDePasseTemporaire,
        };
      }
    }

    benevole.statut = StatutCandidature.ACCEPTE;
    benevole.agent_id = agent.id;
    benevole.user_id = userId;
    if (reponse?.trim()) {
      benevole.reponse = reponse.trim();
      benevole.repondu_le = new Date();
    }
    await this.benevoles.save(benevole);
    /*
     * Relecture obligatoire : `traite` est calculée par Postgres depuis
     * `statut`. L'entité renvoyée par `save` porte encore l'ancienne valeur,
     * et l'interface affichait « non traité » sur une candidature acceptée.
     */
    const enregistre = await this.trouverBenevole(id);

    await this.mail.envoyerAcceptationBenevole(
      benevole.email,
      benevole.prenom,
      reponse?.trim(),
    );

    return { benevole: enregistre, identifiants };
  }

  /** Refus, avec le motif adressé au candidat s'il est renseigné. */
  async refuserBenevole(id: number, reponse?: string): Promise<Benevole> {
    const benevole = await this.trouverBenevole(id);

    benevole.statut = StatutCandidature.REFUSE;
    if (reponse?.trim()) {
      benevole.reponse = reponse.trim();
      benevole.repondu_le = new Date();
    }
    await this.benevoles.save(benevole);
    const enregistre = await this.trouverBenevole(id);

    if (reponse?.trim()) {
      await this.mail.envoyerReponseBenevole(
        benevole.email,
        benevole.prenom,
        reponse.trim(),
      );
    }

    return enregistre;
  }

  private async trouverBenevole(id: number): Promise<Benevole> {
    const benevole = await this.benevoles.findOne({ where: { id } });
    if (!benevole) throw new NotFoundException(`Candidature ${id} introuvable.`);
    return benevole;
  }

  async supprimerMessage(id: number): Promise<{ message: string }> {
    const message = await this.messages.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Message ${id} introuvable.`);
    await this.messages.remove(message);
    return { message: 'Message supprimé.' };
  }

  /** Compteurs affichés en pastille dans la navigation admin. */
  async compteursNonTraites(): Promise<{ messages: number; benevoles: number }> {
    const [messages, benevoles] = await Promise.all([
      this.messages.count({ where: { traite: false } }),
      this.benevoles.count({ where: { traite: false } }),
    ]);
    return { messages, benevoles };
  }
}
