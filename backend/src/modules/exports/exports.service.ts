import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import * as ExcelJS from 'exceljs';
import type { Depistage } from 'src/database/entities';

export interface ColonneExport {
  cle: string;
  libelle: string;
  largeur?: number;
}

/** Colonnes disponibles à l'export, dans l'ordre d'affichage par défaut. */
export const COLONNES_DEPISTAGES: ColonneExport[] = [
  { cle: 'code_unique', libelle: 'Code', largeur: 16 },
  { cle: 'nom', libelle: 'Nom', largeur: 18 },
  { cle: 'prenom', libelle: 'Prénom', largeur: 18 },
  { cle: 'date_naissance', libelle: 'Date de naissance', largeur: 16 },
  { cle: 'age', libelle: 'Âge', largeur: 6 },
  { cle: 'sexe', libelle: 'Sexe', largeur: 6 },
  { cle: 'telephone', libelle: 'Téléphone', largeur: 16 },
  { cle: 'commune', libelle: 'Commune', largeur: 18 },
  { cle: 'departement', libelle: 'Département', largeur: 14 },
  { cle: 'campagne', libelle: 'Campagne', largeur: 28 },
  { cle: 'date_depistage', libelle: 'Date du dépistage', largeur: 16 },
  { cle: 'type', libelle: 'Type', largeur: 14 },
  { cle: 'glycemie', libelle: 'Glycémie (mg/dL)', largeur: 14 },
  { cle: 'poids', libelle: 'Poids (kg)', largeur: 10 },
  { cle: 'taille', libelle: 'Taille (cm)', largeur: 11 },
  { cle: 'imc', libelle: 'IMC', largeur: 8 },
  { cle: 'resultat', libelle: 'Résultat', largeur: 14 },
  { cle: 'oriente_centre', libelle: 'Orienté vers un centre', largeur: 20 },
  { cle: 'verifie', libelle: 'Vérifié', largeur: 10 },
  { cle: 'source', libelle: 'Source', largeur: 10 },
  { cle: 'notes', libelle: 'Notes', largeur: 30 },
];

/** Colonnes nominatives : retirées des exports anonymisés. */
const COLONNES_NOMINATIVES = new Set([
  'nom',
  'prenom',
  'telephone',
  'code_unique',
  'date_naissance',
  'notes',
]);

const LIBELLES: Record<string, string> = {
  normal: 'Normal',
  'pre-diabete': 'Pré-diabète',
  diabete: 'Diabète',
  obesite: 'Obésité',
  autre: 'Autre',
  diabete_type: 'Diabète',
  obesite_type: 'Obésité',
  endocrinopathie: 'Endocrinopathie',
  kobo: 'Kobo',
  file: 'Fichier',
  manual: 'Manuel',
};

@Injectable()
export class ExportsService {
  /**
   * Aplatit un dépistage en ligne exportable. `anonymise` retire les colonnes
   * nominatives : c'est le mode utilisé pour toute diffusion hors ABLODE
   * (prérequis « donnée de santé » de la section 6.2).
   */
  aplatir(
    depistages: Depistage[],
    colonnes: string[],
    anonymise: boolean,
  ): Array<Record<string, unknown>> {
    const retenues = this.resoudreColonnes(colonnes, anonymise);
    return depistages.map((depistage) => {
      const ligne: Record<string, unknown> = {};
      for (const colonne of retenues) {
        ligne[colonne.libelle] = this.valeur(depistage, colonne.cle);
      }
      return ligne;
    });
  }

  resoudreColonnes(colonnes: string[], anonymise: boolean): ColonneExport[] {
    const demandees =
      colonnes.length > 0
        ? COLONNES_DEPISTAGES.filter((c) => colonnes.includes(c.cle))
        : COLONNES_DEPISTAGES;
    return anonymise
      ? demandees.filter((c) => !COLONNES_NOMINATIVES.has(c.cle))
      : demandees;
  }

  /**
   * Le BOM force Excel à lire le fichier en UTF-8 (accents corrects).
   * Un export sans résultat conserve sa ligne d'en-têtes : un fichier vide
   * ressemblerait à un export en échec.
   */
  versCsv(
    lignes: Array<Record<string, unknown>>,
    colonnes?: ColonneExport[],
  ): string {
    if (lignes.length === 0) {
      const entetes = (colonnes ?? []).map((colonne) => colonne.libelle);
      return entetes.length > 0 ? `﻿${stringify([entetes], { delimiter: ';' })}` : '';
    }
    return (
      '﻿' +
      stringify(lignes, { header: true, delimiter: ';', quoted_string: true })
    );
  }

  versJson(lignes: Array<Record<string, unknown>>): string {
    return JSON.stringify(lignes, null, 2);
  }

  async versExcel(
    lignes: Array<Record<string, unknown>>,
    colonnes: ColonneExport[],
    titreFeuille = 'Dépistages',
  ): Promise<Buffer> {
    const classeur = new ExcelJS.Workbook();
    classeur.creator = 'MyABLODE';
    classeur.created = new Date();

    const feuille = classeur.addWorksheet(titreFeuille, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    feuille.columns = colonnes.map((colonne) => ({
      header: colonne.libelle,
      key: colonne.libelle,
      width: colonne.largeur ?? 16,
    }));

    feuille.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    feuille.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    };
    feuille.getRow(1).alignment = { vertical: 'middle' };
    feuille.getRow(1).height = 22;

    lignes.forEach((ligne) => feuille.addRow(ligne));
    feuille.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: colonnes.length },
    };

    const buffer = await classeur.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Export générique (communes agrégées, abonnés, bénévoles…). */
  async tableauVersExcel(
    lignes: Array<Record<string, unknown>>,
    titreFeuille: string,
  ): Promise<Buffer> {
    const colonnes: ColonneExport[] =
      lignes.length > 0
        ? Object.keys(lignes[0]).map((cle) => ({ cle, libelle: cle, largeur: 18 }))
        : [];
    return this.versExcel(lignes, colonnes, titreFeuille);
  }

  private valeur(depistage: Depistage, cle: string): unknown {
    switch (cle) {
      case 'commune':
        return depistage.commune?.nom ?? '';
      case 'departement':
        return depistage.commune?.departement ?? '';
      case 'campagne':
        return depistage.campagne?.nom ?? '';
      case 'age':
        return calculerAge(depistage.date_naissance, depistage.date_depistage);
      case 'oriente_centre':
        return depistage.oriente_centre ? 'Oui' : 'Non';
      case 'verifie':
        return depistage.verifie ? 'Oui' : 'Non';
      case 'resultat':
        return LIBELLES[depistage.resultat] ?? depistage.resultat;
      case 'source':
        return LIBELLES[depistage.source] ?? depistage.source;
      case 'type':
        return LIBELLES[`${depistage.type}_type`] ?? depistage.type;
      case 'glycemie':
        return depistage.glycemie ? Number(depistage.glycemie) : '';
      case 'poids':
        return depistage.poids ? Number(depistage.poids) : '';
      case 'taille':
        return depistage.taille ? Number(depistage.taille) : '';
      case 'imc':
        return depistage.imc ? Number(depistage.imc) : '';
      default:
        return (depistage as unknown as Record<string, unknown>)[cle] ?? '';
    }
  }
}

function calculerAge(naissance: string, reference: string): number | '' {
  if (!naissance || !reference) return '';
  const debut = new Date(naissance);
  const fin = new Date(reference);
  let age = fin.getFullYear() - debut.getFullYear();
  const mois = fin.getMonth() - debut.getMonth();
  if (mois < 0 || (mois === 0 && fin.getDate() < debut.getDate())) age -= 1;
  return age;
}
