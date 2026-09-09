import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginate, type PaginatedResult } from 'src/common/dto/pagination.dto';
import {
  Agent,
  AgentAffectation,
  AgentFelicitation,
  TypeMessageAgent,
} from 'src/database/entities';
import {
  CreateAffectationDto,
  CreateAgentDto,
  CreateFelicitationDto,
  QueryAgentsDto,
  UpdateAgentDto,
} from './dto/agent.dto';

/** Agents de terrain, leurs affectations et les encouragements reçus. */
@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agents: Repository<Agent>,
    @InjectRepository(AgentAffectation)
    private readonly affectations: Repository<AgentAffectation>,
    @InjectRepository(AgentFelicitation)
    private readonly felicitations: Repository<AgentFelicitation>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryAgentsDto): Promise<PaginatedResult<Agent>> {
    const builder = this.agents
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.affectations', 'affectation')
      .leftJoinAndSelect('affectation.campagne', 'campagne')
      .leftJoinAndSelect('affectation.commune', 'commune')
      .skip(query.skip)
      .take(query.limit);

    if (query.recherche?.trim()) {
      const terme = `%${query.recherche.trim()}%`;
      builder.andWhere(
        `(unaccent_lower(agent.nom) LIKE unaccent_lower(:terme)
          OR unaccent_lower(agent.prenom) LIKE unaccent_lower(:terme)
          OR agent.code_kobo ILIKE :terme)`,
        { terme },
      );
    }
    if (query.role_terrain) {
      builder.andWhere('agent.role_terrain = :role', { role: query.role_terrain });
    }
    if (query.actif !== undefined) {
      builder.andWhere('agent.actif = :actif', { actif: query.actif });
    }

    /*
     * Filtrer sur l'affectation sans amputer la liste des affectations
     * chargées : `EXISTS` sur une sous-requête, plutôt qu'une condition sur
     * la jointure — sinon un agent affecté à trois communes n'en montrerait
     * plus qu'une.
     */
    if (query.campagneId) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM agent_affectations a
                 WHERE a.agent_id = agent.id AND a.campagne_id = :campagneId)`,
        { campagneId: query.campagneId },
      );
    }
    if (query.communeId) {
      builder.andWhere(
        `EXISTS (SELECT 1 FROM agent_affectations a
                 WHERE a.agent_id = agent.id AND a.commune_id = :communeId)`,
        { communeId: query.communeId },
      );
    }

    builder.orderBy('agent.nom', 'ASC').addOrderBy('agent.prenom', 'ASC');

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: number): Promise<Agent> {
    const agent = await this.agents.findOne({
      where: { id },
      relations: {
        affectations: { campagne: true, commune: true },
      },
    });
    if (!agent) throw new NotFoundException(`Agent ${id} introuvable.`);
    return agent;
  }

  async create(dto: CreateAgentDto): Promise<Agent> {
    await this.verifierMatriculeLibre(dto.code_kobo);
    return this.agents.save(this.agents.create(dto));
  }

  async update(id: number, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);
    if (dto.code_kobo && dto.code_kobo !== agent.code_kobo) {
      await this.verifierMatriculeLibre(dto.code_kobo);
    }
    Object.assign(agent, dto);
    return this.agents.save(agent);
  }

  /**
   * Désactivation plutôt que suppression.
   *
   * Un agent parti garde ses dépistages : l'effacer viderait la colonne
   * `agent_id` de milliers de lignes et ferait disparaître qui a collecté
   * quoi. On le sort donc des listes actives sans toucher à l'historique.
   */
  async desactiver(id: number): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.actif = false;
    return this.agents.save(agent);
  }

  /**
   * Collecte d'un agent, en deux volets distincts.
   *
   * — **Personnelle** : les dépistages portant son matricule.
   * — **Équipe** : ceux des campagnes et communes auxquelles il est affecté,
   *   quel que soit l'agent qui a saisi.
   *
   * Les deux sont séparés parce qu'ils ne disent pas la même chose. Sur le
   * terrain, une équipe travaille ensemble : le travail collectif compte pour
   * chacun de ses membres, mais le confondre avec la collecte individuelle
   * gonflerait artificiellement les chiffres de chacun.
   */
  async statistiques(id: number): Promise<{
    depistages: number;
    cas: number;
    communes: number;
    dernierDepistage: string | null;
    equipe: { depistages: number; cas: number; communes: number };
  }> {
    const agent = await this.findOne(id);

    const [personnel] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS depistages,
              COUNT(*) FILTER (WHERE resultat IN ('diabete','obesite','autre'))::int AS cas,
              COUNT(DISTINCT commune_id)::int AS communes,
              MAX(date_depistage)::text AS dernier
       FROM depistages
       WHERE agent_id = $1 AND deleted_at IS NULL`,
      [agent.id],
    );

    /*
     * `EXISTS` sur les affectations plutôt qu'une jointure : un agent affecté
     * à trois communes multiplierait sinon chaque dépistage par trois.
     */
    const [equipe] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS depistages,
              COUNT(*) FILTER (WHERE d.resultat IN ('diabete','obesite','autre'))::int AS cas,
              COUNT(DISTINCT d.commune_id)::int AS communes
       FROM depistages d
       WHERE d.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM agent_affectations a
           WHERE a.agent_id = $1
             AND (a.campagne_id IS NULL OR a.campagne_id = d.campagne_id)
             AND (a.commune_id IS NULL OR a.commune_id = d.commune_id)
         )`,
      [agent.id],
    );

    return {
      depistages: personnel.depistages,
      cas: personnel.cas,
      communes: personnel.communes,
      dernierDepistage: personnel.dernier,
      equipe: {
        depistages: equipe.depistages,
        cas: equipe.cas,
        communes: equipe.communes,
      },
    };
  }

  /* ─── Affectations ─────────────────────────────────────────────────── */

  async affecter(agentId: number, dto: CreateAffectationDto): Promise<AgentAffectation> {
    await this.findOne(agentId);

    if (!dto.campagne_id && !dto.commune_id) {
      throw new BadRequestException(
        'Précisez au moins une campagne ou une commune : une affectation sans ' +
          'périmètre ne dit rien.',
      );
    }
    if (dto.date_fin && dto.date_debut && dto.date_fin < dto.date_debut) {
      throw new BadRequestException(
        'La date de fin ne peut pas précéder la date de début.',
      );
    }

    /*
     * `IS NOT DISTINCT FROM` compare en traitant NULL comme une valeur : avec
     * un simple `=`, deux affectations « campagne nulle » ne seraient jamais
     * vues comme identiques et le doublon passerait.
     */
    const existante = await this.affectations
      .createQueryBuilder('a')
      .where('a.agent_id = :agentId', { agentId })
      .andWhere('a.campagne_id IS NOT DISTINCT FROM :campagne', {
        campagne: dto.campagne_id ?? null,
      })
      .andWhere('a.commune_id IS NOT DISTINCT FROM :commune', {
        commune: dto.commune_id ?? null,
      })
      .getOne();

    if (existante) {
      throw new ConflictException('Cette affectation existe déjà.');
    }

    return this.affectations.save(
      this.affectations.create({
        agent_id: agentId,
        campagne_id: dto.campagne_id ?? null,
        commune_id: dto.commune_id ?? null,
        date_debut: dto.date_debut ?? null,
        date_fin: dto.date_fin ?? null,
      }),
    );
  }

  async retirerAffectation(agentId: number, affectationId: number): Promise<void> {
    const affectation = await this.affectations.findOne({
      where: { id: affectationId, agent_id: agentId },
    });
    if (!affectation) {
      throw new NotFoundException('Affectation introuvable pour cet agent.');
    }
    await this.affectations.remove(affectation);
  }

  /* ─── Félicitations ────────────────────────────────────────────────── */

  async feliciter(
    dto: CreateFelicitationDto,
    auteurId: number,
  ): Promise<AgentFelicitation> {
    if (!dto.agent_id && !dto.commune_id) {
      throw new BadRequestException(
        'Indiquez un agent ou une commune : on félicite quelqu’un, pas personne.',
      );
    }
    if (dto.agent_id) await this.findOne(dto.agent_id);

    return this.felicitations.save(
      this.felicitations.create({
        agent_id: dto.agent_id ?? null,
        commune_id: dto.commune_id ?? null,
        auteur_id: auteurId,
        message: dto.message.trim(),
        type: dto.type ?? TypeMessageAgent.ELOGE,
      }),
    );
  }

  /**
   * Derniers messages adressés aux agents, éloges et rappels confondus.
   *
   * Le filtre par type est facultatif : un agent consulte les deux, un
   * responsable peut vouloir ne relire que les rappels.
   */
  async derniersMessages(
    limite = 12,
    type?: TypeMessageAgent,
  ): Promise<AgentFelicitation[]> {
    /*
     * Colonnes choisies explicitement : la relation `commune` embarque sinon
     * la géométrie PostGIS entière — un MultiPolygone de plusieurs centaines
     * de sommets par message, alors que l'interface n'affiche que le nom.
     */
    return this.felicitations
      .createQueryBuilder('message')
      .leftJoin('message.agent', 'agent')
      .leftJoin('message.commune', 'commune')
      .leftJoin('message.auteur', 'auteur')
      .select([
        'message.id',
        'message.agent_id',
        'message.commune_id',
        'message.message',
        'message.type',
        'message.created_at',
        'agent.id',
        'agent.nom',
        'agent.prenom',
        'commune.id',
        'commune.nom',
        'auteur.id',
        'auteur.nom',
        'auteur.prenom',
      ])
      .where(type ? 'message.type = :type' : '1 = 1', { type })
      .orderBy('message.created_at', 'DESC')
      .take(Math.min(limite, 50))
      .getMany();
  }

  private async verifierMatriculeLibre(code?: string | null): Promise<void> {
    if (!code) return;
    const existant = await this.agents.findOne({ where: { code_kobo: code } });
    if (existant) {
      throw new ConflictException(
        `Le matricule « ${code} » est déjà attribué à ${existant.prenom} ${existant.nom}.`,
      );
    }
  }
}
