import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { genererCodeDepistage } from 'src/common/code-depistage';
import {
  calculerImc,
  motifHorsNorme,
  normaliserBooleen,
  normaliserDate,
  normaliserGlycemie,
  normaliserNombre,
  normaliserSexe,
  normaliserTexte,
  normaliserType,
} from 'src/common/normalisation';
import { DepistageSource, DepistageType } from 'src/database/entities';
import { CommunesService } from 'src/modules/communes/communes.service';
import { DepistagesService } from 'src/modules/depistages/depistages.service';
import { MAPPING_PAR_DEFAUT } from 'src/modules/kobo/dto/kobo.dto';

export interface ApercuFichier {
  nomFichier: string;
  colonnes: string[];
  lignes: Array<Record<string, string>>;
  totalLignes: number;
  /** Correspondance proposée automatiquement, modifiable par l'administrateur. */
  mappingSuggere: Record<string, string>;
}

export interface RapportImport {
  totalLignes: number;
  importees: number;
  ignorees: number;
  erreurs: number;
  detailErreurs: Array<{ ligne: number; raison: string }>;
  message: string;
}

const MAX_LIGNES = 50_000;

@Injectable()
export class ImportsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly communes: CommunesService,
    private readonly depistages: DepistagesService,
    private readonly cache: CacheService,
  ) {}

  /** Étape 1 et 2 de l'assistant : aperçu du fichier et mapping proposé. */
  async apercu(fichier: Express.Multer.File): Promise<ApercuFichier> {
    const lignes = await this.lireFichier(fichier);
    if (lignes.length === 0) {
      throw new BadRequestException('Le fichier ne contient aucune ligne de données.');
    }

    const colonnes = Object.keys(lignes[0]);
    return {
      nomFichier: fichier.originalname,
      colonnes,
      lignes: lignes.slice(0, 10),
      totalLignes: lignes.length,
      mappingSuggere: this.suggererMapping(colonnes),
    };
  }

  /**
   * Étape 3 : validation puis insertion. Toute l'opération est dans une
   * transaction — un fichier à moitié importé serait pire que pas d'import.
   */
  async importer(
    fichier: Express.Multer.File,
    mapping: Record<string, string>,
    campagneId: number | null,
    userId: number,
  ): Promise<RapportImport> {
    const lignes = await this.lireFichier(fichier);
    if (lignes.length > MAX_LIGNES) {
      throw new BadRequestException(
        `Fichier trop volumineux : ${lignes.length} lignes (maximum ${MAX_LIGNES}).`,
      );
    }

    const indexCommunes = await this.chargerCommunes();
    const detailErreurs: Array<{ ligne: number; raison: string }> = [];
    let importees = 0;
    let ignorees = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const [index, ligne] of lignes.entries()) {
        const numeroLigne = index + 2; // +1 pour l'en-tête, +1 pour l'index 0

        const converti = await this.convertir(ligne, mapping, indexCommunes);
        if ('erreur' in converti) {
          detailErreurs.push({ ligne: numeroLigne, raison: converti.erreur });
          continue;
        }

        // Le code du dépisté sert de clé de dédoublonnage entre deux imports.
        if (converti.code_unique) {
          const existe = await manager.query(
            `SELECT 1 FROM depistages
             WHERE code_unique = $1 AND date_depistage = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [converti.code_unique, converti.date_depistage],
          );
          if (existe.length > 0) {
            ignorees += 1;
            continue;
          }
        }

        await manager.query(
          `INSERT INTO depistages
            (commune_id, campagne_id, user_id, code_unique, nom, prenom, date_naissance,
             sexe, telephone, date_depistage, type, glycemie, imc, poids, taille,
             resultat, oriente_centre, notes, source, hors_norme, motif_hors_norme)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$19,$20,$14,$15,$16,$17,
             $18::varchar IS NOT NULL, $18::varchar)`,
          [
            converti.commune_id,
            campagneId,
            userId,
            converti.code_unique,
            converti.nom,
            converti.prenom,
            converti.date_naissance,
            converti.sexe,
            converti.telephone,
            converti.date_depistage,
            converti.type,
            converti.glycemie,
            converti.imc,
            converti.resultat,
            converti.oriente_centre,
            converti.notes,
            DepistageSource.FILE,
            converti.motif_hors_norme,
            converti.poids,
            converti.taille,
          ],
        );
        importees += 1;
      }
    });

    await this.cache.invalidate('stats:');

    return {
      totalLignes: lignes.length,
      importees,
      ignorees,
      erreurs: detailErreurs.length,
      detailErreurs: detailErreurs.slice(0, 100),
      message:
        `${lignes.length} ligne(s) traitée(s) · ${importees} importée(s) · ` +
        `${ignorees} doublon(s) ignoré(s) · ${detailErreurs.length} en erreur.`,
    };
  }

  private async lireFichier(
    fichier: Express.Multer.File,
  ): Promise<Array<Record<string, string>>> {
    if (!fichier?.buffer) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    const nom = fichier.originalname.toLowerCase();
    if (nom.endsWith('.csv') || nom.endsWith('.txt')) {
      return this.lireCsv(fichier.buffer);
    }
    if (nom.endsWith('.xlsx') || nom.endsWith('.xls')) {
      return this.lireExcel(fichier.buffer);
    }
    throw new BadRequestException(
      'Format non pris en charge. Utilisez un fichier .csv, .xlsx ou .xls.',
    );
  }

  private lireCsv(buffer: Buffer): Array<Record<string, string>> {
    // Le BOM des exports Excel corromprait le nom de la première colonne.
    const contenu = buffer.toString('utf8').replace(/^﻿/, '');
    const separateur = this.detecterSeparateur(contenu);

    try {
      return parse(contenu, {
        columns: (entetes: string[]) => entetes.map((e) => e.trim()),
        delimiter: separateur,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      });
    } catch (error) {
      throw new BadRequestException(
        `Lecture du CSV impossible : ${(error as Error).message}`,
      );
    }
  }

  /** Le point-virgule domine dans les exports Excel francophones. */
  private detecterSeparateur(contenu: string): string {
    const premiereLigne = contenu.split(/\r?\n/)[0] ?? '';
    const candidats = [';', ',', '\t', '|'];
    let meilleur = ',';
    let maximum = 0;
    for (const candidat of candidats) {
      const occurrences = premiereLigne.split(candidat).length - 1;
      if (occurrences > maximum) {
        maximum = occurrences;
        meilleur = candidat;
      }
    }
    return meilleur;
  }

  private async lireExcel(buffer: Buffer): Promise<Array<Record<string, string>>> {
    const classeur = new ExcelJS.Workbook();
    try {
      await classeur.xlsx.load(buffer as never);
    } catch (error) {
      throw new BadRequestException(
        `Lecture du classeur Excel impossible : ${(error as Error).message}`,
      );
    }

    const feuille = classeur.worksheets[0];
    if (!feuille) {
      throw new BadRequestException('Le classeur ne contient aucune feuille.');
    }

    const entetes: string[] = [];
    feuille.getRow(1).eachCell({ includeEmpty: true }, (cellule, colonne) => {
      entetes[colonne - 1] = String(cellule.value ?? `colonne_${colonne}`).trim();
    });

    const lignes: Array<Record<string, string>> = [];
    feuille.eachRow({ includeEmpty: false }, (row, numero) => {
      if (numero === 1) return;
      const ligne: Record<string, string> = {};
      let vide = true;
      row.eachCell({ includeEmpty: true }, (cellule, colonne) => {
        const entete = entetes[colonne - 1];
        if (!entete) return;
        const valeur = this.valeurCellule(cellule);
        ligne[entete] = valeur;
        if (valeur !== '') vide = false;
      });
      if (!vide) lignes.push(ligne);
    });

    return lignes;
  }

  private valeurCellule(cellule: ExcelJS.Cell): string {
    const valeur = cellule.value;
    if (valeur === null || valeur === undefined) return '';
    if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
    if (typeof valeur === 'object') {
      const objet = valeur as unknown as Record<string, unknown>;
      if ('text' in objet) return String(objet.text);
      if ('result' in objet) return String(objet.result);
      if ('richText' in objet) {
        return (objet.richText as Array<{ text: string }>)
          .map((partie) => partie.text)
          .join('');
      }
    }
    return String(valeur);
  }

  /** Propose une cible pour chaque colonne à partir de son intitulé. */
  private suggererMapping(colonnes: string[]): Record<string, string> {
    const suggestions: Record<string, string> = {};
    for (const colonne of colonnes) {
      const cle = colonne
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]/g, '_');

      if (MAPPING_PAR_DEFAUT[cle]) {
        suggestions[colonne] = MAPPING_PAR_DEFAUT[cle];
        continue;
      }
      const partielle = Object.keys(MAPPING_PAR_DEFAUT).find(
        (candidat) => cle.includes(candidat) || candidat.includes(cle),
      );
      if (partielle) suggestions[colonne] = MAPPING_PAR_DEFAUT[partielle];
    }
    return suggestions;
  }

  private async convertir(
    ligne: Record<string, string>,
    mapping: Record<string, string>,
    communes: Map<string, number>,
  ): Promise<{ erreur: string } | LigneConvertie> {
    const valeurs: Record<string, unknown> = {};
    for (const [colonne, cible] of Object.entries(mapping)) {
      if (cible && ligne[colonne] !== undefined) valeurs[cible] = ligne[colonne];
    }

    const nom = normaliserTexte(valeurs.nom, 100);
    if (!nom) return { erreur: 'Nom absent.' };

    const dateNaissance = normaliserDate(valeurs.date_naissance);
    if (!dateNaissance) return { erreur: 'Date de naissance absente ou illisible.' };

    const sexe = normaliserSexe(valeurs.sexe);
    if (!sexe) return { erreur: 'Sexe absent ou non reconnu (attendu : M ou F).' };

    const dateDepistage = normaliserDate(valeurs.date_depistage);
    if (!dateDepistage) return { erreur: 'Date de dépistage absente ou illisible.' };

    const nomCommune = normaliserTexte(valeurs.commune_id, 100);
    const communeId = nomCommune ? (communes.get(cleCommune(nomCommune)) ?? null) : null;
    if (nomCommune && communeId === null) {
      return { erreur: `Commune « ${nomCommune} » inconnue du référentiel.` };
    }
    if (!communeId) return { erreur: 'Commune absente.' };

    // Mesures acceptées telles quelles : voir le commentaire dans kobo.service.
    const glycemie = normaliserGlycemie(valeurs.glycemie);
    const poids = normaliserNombre(valeurs.poids);
    const taille = normaliserNombre(valeurs.taille);

    /*
     * IMC calculé depuis le poids et la taille. Un IMC présent dans le
     * fichier n'est retenu qu'à défaut de ces deux mesures : les exports
     * antérieurs le portaient directement.
     */
    const imc = calculerImc(poids, taille) ?? normaliserNombre(valeurs.imc);

    const type =
      normaliserType(valeurs.type) ??
      (glycemie !== null ? DepistageType.DIABETE : DepistageType.OBESITE);
    const resultat = await this.depistages.deduireResultat({ type, glycemie, imc });

    return {
      commune_id: communeId,
      code_unique:
        normaliserTexte(valeurs.code_unique, 50) ??
        (await genererCodeDepistage(this.dataSource, dateDepistage)),
      nom,
      prenom: normaliserTexte(valeurs.prenom, 100) ?? '—',
      date_naissance: dateNaissance,
      sexe,
      telephone: normaliserTexte(valeurs.telephone, 20),
      date_depistage: dateDepistage,
      type,
      glycemie: glycemie?.toFixed(2) ?? null,
      imc: imc?.toFixed(2) ?? null,
      poids: poids?.toFixed(2) ?? null,
      taille: taille?.toFixed(2) ?? null,
      resultat,
      oriente_centre: normaliserBooleen(valeurs.oriente_centre),
      notes: normaliserTexte(valeurs.notes, 2000),
      // Signalée, jamais refusée : voir le commentaire dans kobo.service.
      motif_hors_norme: motifHorsNorme(glycemie, imc, poids, taille),
    };
  }

  private async chargerCommunes(): Promise<Map<string, number>> {
    const communes = await this.communes.findAll();
    const index = new Map<string, number>();
    for (const commune of communes) {
      index.set(cleCommune(commune.nom), commune.id);
      if (commune.code) index.set(cleCommune(commune.code), commune.id);
    }
    return index;
  }
}

interface LigneConvertie {
  commune_id: number;
  code_unique: string | null;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  telephone: string | null;
  date_depistage: string;
  type: string;
  glycemie: string | null;
  imc: string | null;
  poids: string | null;
  taille: string | null;
  resultat: string;
  oriente_centre: boolean;
  notes: string | null;
  /** Consigne de vérification si la mesure sort des bornes physiologiques. */
  motif_hors_norme: string | null;
}

function cleCommune(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
