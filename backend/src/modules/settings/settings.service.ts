import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from 'src/database/entities';

/**
 * Paramètres système en clé/valeur. Un cache mémoire évite un aller-retour
 * SQL à chaque lecture de seuil clinique (appelé sur presque chaque agrégat).
 */
@Injectable()
export class SettingsService {
  private cacheMemoire = new Map<string, unknown>();

  constructor(
    @InjectRepository(Setting)
    private readonly repository: Repository<Setting>,
  ) {}

  async findAll(): Promise<Setting[]> {
    return this.repository.find({ order: { groupe: 'ASC', key: 'ASC' } });
  }

  async findByGroupe(groupe: string): Promise<Setting[]> {
    return this.repository.find({ where: { groupe }, order: { key: 'ASC' } });
  }

  async get<T>(key: string, defaut: T): Promise<T> {
    if (this.cacheMemoire.has(key)) {
      return this.cacheMemoire.get(key) as T;
    }
    const setting = await this.repository.findOne({ where: { key } });
    const valeur = (setting?.value ?? defaut) as T;
    this.cacheMemoire.set(key, valeur);
    return valeur;
  }

  async getNumber(key: string, defaut: number): Promise<number> {
    const valeur = await this.get<unknown>(key, defaut);
    const nombre = Number(valeur);
    return Number.isFinite(nombre) ? nombre : defaut;
  }

  async set(key: string, value: unknown): Promise<Setting> {
    const setting = await this.repository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Paramètre « ${key} » inconnu.`);
    }
    setting.value = value;
    const enregistre = await this.repository.save(setting);
    this.cacheMemoire.set(key, value);
    return enregistre;
  }

  /**
   * Enregistre un paramètre, en le créant s'il n'existe pas encore.
   *
   * À la différence de `set`, cette méthode sert aux réglages qui n'ont pas
   * de valeur initiale au seed — la configuration SMTP, par exemple, qui
   * n'existe qu'une fois renseignée par l'administrateur.
   */
  async definir(
    key: string,
    value: unknown,
    groupe: string,
    description?: string,
  ): Promise<Setting> {
    const existant = await this.repository.findOne({ where: { key } });
    const setting =
      existant ??
      this.repository.create({ key, groupe, description: description ?? null });

    setting.value = value;
    setting.groupe = groupe;
    if (description) setting.description = description;

    const enregistre = await this.repository.save(setting);
    this.cacheMemoire.set(key, value);
    return enregistre;
  }

  async setMany(valeurs: Record<string, unknown>): Promise<Setting[]> {
    const resultats: Setting[] = [];
    for (const [key, value] of Object.entries(valeurs)) {
      resultats.push(await this.set(key, value));
    }
    return resultats;
  }

  /** Seuils cliniques utilisés pour classer un résultat de dépistage. */
  async seuilsCliniques(): Promise<{
    glycemieNormale: number;
    glycemieDiabete: number;
    imcSurpoids: number;
    imcObesite: number;
  }> {
    const [glycemieNormale, glycemieDiabete, imcSurpoids, imcObesite] =
      await Promise.all([
        this.getNumber('seuil_glycemie_normale', 100),
        this.getNumber('seuil_glycemie_diabete', 126),
        this.getNumber('seuil_imc_surpoids', 25),
        this.getNumber('seuil_imc_obesite', 30),
      ]);
    return { glycemieNormale, glycemieDiabete, imcSurpoids, imcObesite };
  }

  /** Invalide le cache mémoire (utile après un changement de seuil). */
  viderCache(): void {
    this.cacheMemoire.clear();
  }
}
