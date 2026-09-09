import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { Writable } from 'stream';
import type { Campagne } from 'src/database/entities';

export interface StatsCampagne {
  campagne: Campagne;
  depistages: number;
  cas: number;
  taux: number;
  orientes: number;
  parResultat: Array<{ resultat: string; total: number }>;
  parSexe: Array<{ sexe: string; total: number }>;
  ageMoyen?: number | null;
  types?: string[];
  sources?: string[];
}

const ENCRE = '#0f172a';
const ARDOISE = '#334155';
const GRIS = '#94a3b8';
const TRAIT = '#e2e8f0';
const VERT = '#0f766e';
const ROUGE = '#c0392b';

const MARGE = 50;

/*
 * Espacements verticaux, en points.
 *
 * Ils sont exprimés en valeurs absolues plutôt qu'avec `moveDown()` : celui-ci
 * se règle sur la taille de police courante, qui varie d'un bloc à l'autre, si
 * bien que les écarts entre sections finissaient tous différents.
 */

/** Blanc au-dessus et au-dessous d'un filet de séparation. */
const AIR_SECTION = 26;

/** Interligne d'une ligne de légende ou de fiche. */
const PAS_LIGNE = 19;

/** Couleurs de la barre de répartition, dans l'ordre de gravité. */
const COULEURS_RESULTAT: Record<string, string> = {
  normal: '#16a34a',
  'pre-diabete': '#d97706',
  diabete: '#dc2626',
  obesite: '#7c3aed',
  autre: '#0891b2',
};

const LIBELLES_RESULTAT: Record<string, string> = {
  normal: 'Normal',
  'pre-diabete': 'Pré-diabète',
  diabete: 'Diabète',
  obesite: 'Obésité',
  autre: 'Autre',
};

const LIBELLES_TYPE: Record<string, string> = {
  diabete: 'Diabète',
  obesite: 'Obésité',
  endocrinopathie: 'Endocrinopathie',
};

const LIBELLES_SOURCE: Record<string, string> = {
  kobo: 'KoboCollect',
  file: 'Import de fichier',
  manual: 'Saisie manuelle',
};

const LIBELLES_STATUT: Record<string, { texte: string; couleur: string }> = {
  planifiee: { texte: 'Planifiée', couleur: GRIS },
  en_cours: { texte: 'En cours', couleur: '#d97706' },
  cloturee: { texte: 'Clôturée', couleur: '#16a34a' },
};

/** Génère les rapports PDF (section 3.2.4 « Générer un rapport PDF »). */
@Injectable()
export class PdfService {
  private readonly journal = new Logger(PdfService.name);

  /**
   * Écrit le rapport dans le flux fourni. Le document est envoyé en streaming :
   * la mémoire du serveur ne stocke jamais le PDF complet.
   */
  rapportCampagne(stats: StatsCampagne, sortie: Writable): void {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGE,
      info: {
        Title: `Rapport de campagne — ${stats.campagne.nom}`,
        Author: 'ABLODE',
        Subject: 'Rapport de campagne de dépistage',
      },
    });
    doc.pipe(sortie);

    this.enTete(doc, stats.campagne);
    this.titre(doc, stats.campagne);
    this.chiffresCles(doc, stats);
    this.repartitions(doc, stats);
    this.orientation(doc, stats);
    this.fiche(doc, stats);
    this.description(doc, stats.campagne);
    this.pied(doc);

    doc.end();
  }

  /** Bandeau d'identification : logo, association, référence du document. */
  private enTete(doc: PDFKit.PDFDocument, campagne: Campagne): void {
    const haut = doc.y;
    const logo = join(__dirname, '..', '..', 'assets', 'logo-ablode.png');

    let texteX = MARGE;
    if (existsSync(logo)) {
      try {
        doc.image(logo, MARGE, haut - 2, { height: 34 });
        texteX = MARGE + 66;
      } catch (erreur) {
        // Un logo illisible ne doit pas empêcher la production du rapport.
        this.journal.warn(`Logo non intégré au rapport : ${(erreur as Error).message}`);
      }
    }

    doc.fillColor(VERT).fontSize(15).font('Helvetica-Bold');
    doc.text('ABLODE', texteX, haut + 2, { characterSpacing: 1 });
    doc.fillColor(GRIS).fontSize(7).font('Helvetica');
    doc.text(
      'Association Béninoise de Lutte contre l’Obésité, le Diabète et les Endocrinopathies',
      texteX,
      haut + 20,
      { width: 300 },
    );

    const droite = doc.page.width - MARGE - 200;
    doc.fillColor(GRIS).fontSize(8);
    doc.text('Rapport de campagne', droite, haut + 2, { width: 200, align: 'right' });
    doc.text(reference(campagne), droite, haut + 13, { width: 200, align: 'right' });

    doc.y = haut + 48;
    this.filet(doc);
  }

  /** Nom de la campagne, statut, lieu et période couverte. */
  private titre(doc: PDFKit.PDFDocument, campagne: Campagne): void {
    doc.fillColor(ENCRE).fontSize(22).font('Helvetica-Bold');
    doc.text(campagne.nom, MARGE, doc.y + AIR_SECTION + 4, {
      width: contenuLargeur(doc),
      lineGap: 4,
    });

    const y = doc.y + 16;
    const statut = LIBELLES_STATUT[campagne.statut] ?? {
      texte: campagne.statut,
      couleur: GRIS,
    };

    // Puce colorée reprenant le code couleur des statuts de l'interface.
    doc.circle(MARGE + 3, y + 4.5, 3).fillColor(statut.couleur).fill();

    doc.font('Helvetica-Bold').fontSize(9).fillColor(statut.couleur);
    doc.text(statut.texte, MARGE + 11, y);
    const apresStatut = MARGE + 11 + doc.widthOfString(statut.texte) + 6;

    doc.font('Helvetica').fontSize(9).fillColor(GRIS);
    doc.text(`·  ${lieu(campagne)}  ·  ${periode(campagne)}`, apresStatut, y, {
      width: doc.page.width - MARGE - apresStatut,
    });

    doc.y = y + AIR_SECTION;
    this.filet(doc);
  }

  /** Les quatre indicateurs de tête, en colonnes égales. */
  private chiffresCles(doc: PDFKit.PDFDocument, stats: StatsCampagne): void {
    const cartes = [
      { label: 'DÉPISTAGES', valeur: nombre(stats.depistages), couleur: ENCRE },
      { label: 'CAS DÉTECTÉS', valeur: nombre(stats.cas), couleur: ENCRE },
      {
        label: 'TAUX DE POSITIVITÉ',
        valeur: `${virgule(stats.taux)} %`,
        // Le taux est l'indicateur qu'on cherche dans le document : il ressort.
        couleur: stats.taux > 0 ? ROUGE : ENCRE,
      },
      { label: 'ORIENTÉS', valeur: nombre(stats.orientes), couleur: ENCRE },
    ];

    const largeur = contenuLargeur(doc) / 4;
    const y = doc.y + AIR_SECTION;

    cartes.forEach((carte, index) => {
      const x = MARGE + index * largeur;
      doc.fillColor(GRIS).fontSize(7).font('Helvetica');
      doc.text(carte.label, x, y, { width: largeur - 8, characterSpacing: 1 });
      doc.fillColor(carte.couleur).fontSize(20).font('Helvetica-Bold');
      doc.text(carte.valeur, x, y + 18, { width: largeur - 8 });
    });

    doc.y = y + 56;
    doc.x = MARGE;
    this.filet(doc);
  }

  /** Deux colonnes : résultats à gauche, sexe et âge à droite. */
  private repartitions(doc: PDFKit.PDFDocument, stats: StatsCampagne): void {
    const colonne = (contenuLargeur(doc) - 40) / 2;
    const droiteX = MARGE + colonne + 40;
    const haut = doc.y + AIR_SECTION;

    const resultats = stats.parResultat.map((item) => ({
      libelle: LIBELLES_RESULTAT[item.resultat] ?? item.resultat,
      total: item.total,
      couleur: COULEURS_RESULTAT[item.resultat] ?? GRIS,
    }));

    const sexes = stats.parSexe
      .map((item) => ({
        libelle: item.sexe === 'F' ? 'Femmes' : 'Hommes',
        total: item.total,
        couleur: item.sexe === 'F' ? '#38bdf8' : '#1d4ed8',
      }))
      // Les femmes en premier, comme dans la légende de l'interface.
      .sort((a, b) => a.libelle.localeCompare(b.libelle));

    const basGauche = this.blocRepartition(
      doc,
      'RÉPARTITION DES RÉSULTATS',
      resultats,
      stats.depistages,
      MARGE,
      haut,
      colonne,
      true,
    );

    let basDroite = this.blocRepartition(
      doc,
      'RÉPARTITION PAR SEXE',
      sexes,
      stats.depistages,
      droiteX,
      haut,
      colonne,
      true,
    );

    if (stats.ageMoyen !== null && stats.ageMoyen !== undefined) {
      doc.fillColor(GRIS).fontSize(8.5).font('Helvetica');
      doc.text(`Âge moyen : ${virgule(stats.ageMoyen)} ans`, droiteX, basDroite + 10, {
        width: colonne,
      });
      basDroite = doc.y;
    }

    doc.y = Math.max(basGauche, basDroite);
    doc.x = MARGE;
  }

  /**
   * Barre empilée puis légende chiffrée. Renvoie l'ordonnée de fin du bloc,
   * les deux colonnes n'ayant pas la même hauteur.
   */
  private blocRepartition(
    doc: PDFKit.PDFDocument,
    titre: string,
    parts: Array<{ libelle: string; total: number; couleur: string }>,
    total: number,
    x: number,
    y: number,
    largeur: number,
    avecPourcentage: boolean,
  ): number {
    doc.fillColor(GRIS).fontSize(7).font('Helvetica');
    doc.text(titre, x, y, { width: largeur, characterSpacing: 1 });

    const yBarre = y + 18;
    if (total > 0 && parts.length > 0) {
      let curseur = x;
      parts.forEach((part, index) => {
        // Le dernier segment absorbe l'arrondi pour que la barre soit pleine.
        const fin =
          index === parts.length - 1
            ? x + largeur
            : curseur + (part.total / total) * largeur;
        doc.rect(curseur, yBarre, Math.max(fin - curseur, 0), 11).fillColor(part.couleur).fill();
        curseur = fin;
      });
    } else {
      doc.rect(x, yBarre, largeur, 11).fillColor(TRAIT).fill();
    }

    let ligneY = yBarre + 28;
    for (const part of parts) {
      doc.rect(x, ligneY + 2.5, 7, 7).fillColor(part.couleur).fill();

      doc.fillColor(ARDOISE).fontSize(9).font('Helvetica');
      doc.text(part.libelle, x + 14, ligneY, { width: largeur - 130 });

      doc.fillColor(ENCRE).font('Helvetica-Bold');
      doc.text(nombre(part.total), x + largeur - 118, ligneY, {
        width: 60,
        align: 'right',
      });

      if (avecPourcentage) {
        const pourcentage =
          total > 0
            ? `${virgule(Math.round((part.total / total) * 1000) / 10)} %`
            : '—';
        doc.fillColor(GRIS).font('Helvetica');
        doc.text(pourcentage, x + largeur - 50, ligneY, { width: 50, align: 'right' });
      }

      ligneY += PAS_LIGNE;
    }

    if (parts.length === 0) {
      doc.fillColor(GRIS).fontSize(9).font('Helvetica');
      doc.text('Aucun dépistage enregistré', x, ligneY, { width: largeur });
      ligneY += PAS_LIGNE;
    }

    return ligneY;
  }

  /** Phrase de synthèse sur le suivi des cas détectés. */
  private orientation(doc: PDFKit.PDFDocument, stats: StatsCampagne): void {
    if (stats.cas === 0) return;

    const part = Math.round((stats.orientes / stats.cas) * 100);
    doc.fillColor(ARDOISE).fontSize(9.5).font('Helvetica');
    doc.text(
      `${nombre(stats.orientes)} des ${nombre(stats.cas)} cas détectés (${part} %) ` +
        'ont été orientés vers une structure de soin.',
      MARGE,
      doc.y + AIR_SECTION,
      { width: contenuLargeur(doc), lineGap: 3 },
    );
  }

  /** Fiche signalétique en deux colonnes de couples libellé / valeur. */
  private fiche(doc: PDFKit.PDFDocument, stats: StatsCampagne): void {
    const { campagne } = stats;
    const gauche: Array<[string, string]> = [];
    const droite: Array<[string, string]> = [];

    if (campagne.responsable) gauche.push(['Responsable', campagne.responsable]);
    if (campagne.equipe) gauche.push(['Équipe', campagne.equipe]);

    const types = (stats.types ?? []).filter(Boolean);
    if (types.length > 0) {
      droite.push([
        'Type de dépistage',
        types.map((type) => LIBELLES_TYPE[type] ?? type).join(' · '),
      ]);
    }
    const sources = (stats.sources ?? []).filter(Boolean);
    if (sources.length > 0) {
      droite.push([
        'Source des données',
        sources.map((source) => LIBELLES_SOURCE[source] ?? source).join(' · '),
      ]);
    }

    if (gauche.length === 0 && droite.length === 0) return;

    doc.y += AIR_SECTION;
    this.filet(doc);

    const colonne = (contenuLargeur(doc) - 40) / 2;
    const haut = doc.y + AIR_SECTION;
    const basGauche = this.couples(doc, gauche, MARGE, haut, colonne);
    const basDroite = this.couples(doc, droite, MARGE + colonne + 40, haut, colonne);

    doc.y = Math.max(basGauche, basDroite);
    doc.x = MARGE;
  }

  private couples(
    doc: PDFKit.PDFDocument,
    lignes: Array<[string, string]>,
    x: number,
    y: number,
    largeur: number,
  ): number {
    const largeurLibelle = 100;
    let courant = y;

    for (const [libelle, valeur] of lignes) {
      doc.fillColor(GRIS).fontSize(8).font('Helvetica');
      doc.text(libelle, x, courant, { width: largeurLibelle - 10 });
      const basLibelle = doc.y;

      doc.fillColor(ARDOISE).fontSize(9).font('Helvetica');
      doc.text(valeur, x + largeurLibelle, courant, {
        width: largeur - largeurLibelle,
        lineGap: 3,
      });

      courant = Math.max(basLibelle, doc.y) + 14;
    }

    return courant;
  }

  private description(doc: PDFKit.PDFDocument, campagne: Campagne): void {
    if (!campagne.description) return;

    doc.y += AIR_SECTION - 8;
    this.filet(doc);

    doc.fillColor(GRIS).fontSize(7).font('Helvetica');
    doc.text('DESCRIPTION', MARGE, doc.y + AIR_SECTION, { characterSpacing: 1 });

    /*
     * La marge basse est temporairement relevée de la hauteur du pied. Sans
     * cette réserve, le texte descendait jusqu'au bas de la feuille et le pied
     * devait ouvrir une deuxième page pour lui seul ; il coupe désormais une
     * ligne plus tôt et le pied le suit sur la même page.
     *
     * PDFKit construit un objet `margins` par page : la restauration ne touche
     * que la page courante.
     */
    const margeBasse = doc.page.margins.bottom;
    doc.page.margins.bottom = margeBasse + 48;

    doc.fillColor(ARDOISE).fontSize(9).font('Helvetica');
    doc.text(campagne.description, MARGE, doc.y + 10, {
      width: contenuLargeur(doc),
      align: 'justify',
      lineGap: 4,
    });

    doc.page.margins.bottom = margeBasse;
  }

  private pied(doc: PDFKit.PDFDocument): void {
    /*
     * La mention est ancrée en bas de feuille, pas à la suite du dernier bloc :
     * le contenu se tenait sinon entièrement dans le haut de la page, avec un
     * grand vide en dessous.
     *
     * Une description longue peut cependant remplir la page. Sans le report
     * ci-dessous, le filet se serait dessiné dans la marge basse — les tracés
     * vectoriels, contrairement au texte, ne déclenchent pas de saut de page.
     */
    /** Filet, blanc, puis deux lignes de mention à 7 pt. */
    const hauteurPied = 34;
    const basUtile = doc.page.height - MARGE;
    const ancre = basUtile - hauteurPied;

    if (doc.y + AIR_SECTION <= ancre) {
      doc.y = ancre;
    } else if (doc.y + 14 + hauteurPied > basUtile) {
      doc.addPage();
      doc.y = ancre;
    } else {
      // Le contenu descend bas : le pied le suit au lieu de réclamer une page
      // entière pour lui seul.
      doc.y += 14;
    }

    this.filet(doc);
    doc.fillColor(GRIS).fontSize(7).font('Helvetica');
    doc.text(
      `Document généré le ${formaterDate(new Date())} par MyABLODE. ` +
        'Le taux de positivité est calculé sur la population dépistée, ' +
        'non sur la population générale de la commune.',
      MARGE,
      doc.y + 12,
      { width: contenuLargeur(doc), align: 'center', lineGap: 3 },
    );
  }

  private filet(doc: PDFKit.PDFDocument): void {
    doc
      .strokeColor(TRAIT)
      .lineWidth(1)
      .moveTo(MARGE, doc.y)
      .lineTo(doc.page.width - MARGE, doc.y)
      .stroke();
  }
}

function contenuLargeur(doc: PDFKit.PDFDocument): number {
  return doc.page.width - MARGE * 2;
}

/**
 * Référence du document, construite pour être citable dans un échange :
 * année de début de campagne et identifiant sur trois chiffres.
 */
function reference(campagne: Campagne): string {
  const annee = new Date(campagne.date_debut).getFullYear();
  return `Réf. CMP-${annee}-${String(campagne.id).padStart(3, '0')}`;
}

function lieu(campagne: Campagne): string {
  if (!campagne.commune) return 'Commune non renseignée';
  return `${campagne.commune.nom}, ${campagne.commune.departement}`;
}

/** « du 6 au 12 juillet 2026 (7 jours) », ou « depuis le … » si pas de fin. */
function periode(campagne: Campagne): string {
  const debut = formaterDate(campagne.date_debut);
  if (!campagne.date_fin) return `depuis le ${debut}`;

  const jours =
    Math.round(
      (new Date(campagne.date_fin).getTime() - new Date(campagne.date_debut).getTime()) /
        86_400_000,
    ) + 1;
  return `du ${debut} au ${formaterDate(campagne.date_fin)} (${jours} jour${jours > 1 ? 's' : ''})`;
}

function formaterDate(valeur: string | Date): string {
  return new Date(valeur).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Porto-Novo',
  });
}

/** Séparateur de milliers insécable, comme dans l'interface. */
function nombre(valeur: number): string {
  return valeur.toLocaleString('fr-FR').replace(/ /g, ' ');
}

function virgule(valeur: number): string {
  return String(valeur).replace('.', ',');
}
