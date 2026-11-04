import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evenement } from 'src/database/entities';
import { CreateEvenementDto, UpdateEvenementDto } from './dto/evenement.dto';

@Injectable()
export class EvenementsService {
  constructor(
    @InjectRepository(Evenement)
    private readonly repository: Repository<Evenement>,
  ) {}

  /**
   * Programme affiché par le site : les dates publiées qui ne sont pas encore
   * passées, du plus proche au plus lointain.
   *
   * Un événement terminé disparaît de lui-même du bandeau le lendemain. Sans
   * cette borne, l'accueil annoncerait encore en décembre une conférence de
   * novembre, et il faudrait une tâche de ménage pour l'en retirer.
   */
  async findPublics(limite = 8): Promise<Evenement[]> {
    return this.repository
      .createQueryBuilder('evenement')
      .where('evenement.publie = true')
      .andWhere('COALESCE(evenement.date_fin, evenement.date_debut) >= CURRENT_DATE')
      .orderBy('evenement.date_debut', 'ASC')
      .take(limite)
      .getMany();
  }

  /** Vue back-office : les dates passées restent visibles et modifiables. */
  async findAll(): Promise<Evenement[]> {
    return this.repository.find({ order: { date_debut: 'DESC' } });
  }

  async findOne(id: number): Promise<Evenement> {
    const evenement = await this.repository.findOne({ where: { id } });
    if (!evenement) throw new NotFoundException(`Événement ${id} introuvable.`);
    return evenement;
  }

  async create(dto: CreateEvenementDto): Promise<Evenement> {
    this.verifierOrdreDesDates(dto.date_debut, dto.date_fin);
    return this.repository.save(this.repository.create(dto));
  }

  async update(id: number, dto: UpdateEvenementDto): Promise<Evenement> {
    const evenement = await this.findOne(id);
    Object.assign(evenement, dto);
    this.verifierOrdreDesDates(evenement.date_debut, evenement.date_fin);
    return this.repository.save(evenement);
  }

  async remove(id: number): Promise<void> {
    const evenement = await this.findOne(id);
    await this.repository.remove(evenement);
  }

  /**
   * La base porte la même règle, mais elle répondrait par une erreur SQL
   * opaque. Le message doit venir d'ici pour arriver lisible au formulaire.
   */
  private verifierOrdreDesDates(debut: string, fin?: string | null): void {
    if (fin && fin < debut) {
      throw new BadRequestException(
        'La date de fin ne peut pas précéder la date de début.',
      );
    }
  }
}
