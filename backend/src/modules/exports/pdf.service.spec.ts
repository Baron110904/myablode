import { Writable } from 'stream';
import { PdfService, type StatsCampagne } from './pdf.service';
import { CampagneStatut, type Campagne } from 'src/database/entities';

/**
 * Le rapport est mis en page à coups d'ordonnées absolues et son pied est
 * ancré en bas de feuille. Ces tests garantissent qu'un contenu volumineux
 * ne déborde pas sur une seconde page sans qu'on s'en aperçoive, et qu'une
 * campagne sans aucune donnée produit tout de même un document exploitable.
 */
describe('PdfService — rapport de campagne', () => {
  const service = new PdfService();

  it('tient sur une seule page pour une campagne renseignée', async () => {
    const pdf = await produire(statsCompletes());
    expect(nombreDePages(pdf)).toBe(1);
  });

  it('garde sur une page une description de quelques lignes', async () => {
    // Environ 500 caractères : le volume courant d'une description de terrain.
    const stats = statsCompletes();
    stats.campagne.description = 'Dépistage communautaire. '.repeat(20);
    expect(nombreDePages(await produire(stats))).toBe(1);
  });

  it('déborde sur une seule page supplémentaire, même très longue', async () => {
    /*
     * La description n'est pas bornée : elle peut légitimement déborder, et il
     * est exclu de tronquer le texte de l'auteur. La marge basse est relevée
     * pendant son écriture pour réserver la place du pied — c'est ce qui évite
     * qu'une page ne contienne que la mention de bas de page.
     */
    for (const repetitions of [26, 40, 60, 120]) {
      const stats = statsCompletes();
      stats.campagne.description = 'Dépistage communautaire. '.repeat(repetitions);

      expect(nombreDePages(await produire(stats))).toBe(2);
    }
  });

  it('produit un document exploitable sans aucun dépistage', async () => {
    const stats = statsCompletes();
    Object.assign(stats, {
      depistages: 0,
      cas: 0,
      taux: 0,
      orientes: 0,
      parResultat: [],
      parSexe: [],
      ageMoyen: null,
      types: [],
      sources: [],
    });

    const pdf = await produire(stats);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(nombreDePages(pdf)).toBe(1);
  });

  it('n’échoue pas quand la commune et l’équipe sont absentes', async () => {
    const stats = statsCompletes();
    stats.campagne.commune = null;
    stats.campagne.responsable = null;
    stats.campagne.equipe = null;
    stats.campagne.description = null;
    stats.campagne.date_fin = null;

    const pdf = await produire(stats);
    expect(nombreDePages(pdf)).toBe(1);
  });

  /** Collecte le PDF écrit en flux dans un Buffer. */
  function produire(stats: StatsCampagne): Promise<Buffer> {
    return new Promise((resoudre, rejeter) => {
      const morceaux: Buffer[] = [];
      const puits = new Writable({
        write(morceau, _encodage, suite) {
          morceaux.push(Buffer.from(morceau));
          suite();
        },
      });
      puits.on('finish', () => resoudre(Buffer.concat(morceaux)));
      puits.on('error', rejeter);
      service.rapportCampagne(stats, puits);
    });
  }
});

/**
 * Compte les objets page du document. `/Type /Pages` désigne l'arbre des
 * pages et non une page : la négation exclut ce cas.
 */
function nombreDePages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

function statsCompletes(): StatsCampagne {
  const campagne = {
    id: 26,
    commune_id: 12,
    commune: { nom: 'Bantè', departement: 'Collines' },
    nom: 'Dépistage Bantè — décembre 2025',
    date_debut: '2025-12-17',
    date_fin: '2025-12-20',
    responsable: 'A. Tossou',
    equipe: 'Équipe mobile ABLODE (3 agents, 1 infirmier)',
    statut: CampagneStatut.CLOTUREE,
    description: 'Campagne de dépistage gratuit du diabète et de l’obésité.',
    photo_url: null,
    archivee: false,
  } as unknown as Campagne;

  return {
    campagne,
    depistages: 749,
    cas: 35,
    taux: 4.7,
    orientes: 35,
    parResultat: [
      { resultat: 'normal', total: 625 },
      { resultat: 'pre-diabete', total: 89 },
      { resultat: 'diabete', total: 26 },
      { resultat: 'obesite', total: 9 },
    ],
    parSexe: [
      { sexe: 'M', total: 332 },
      { sexe: 'F', total: 417 },
    ],
    ageMoyen: 48.1,
    types: ['diabete', 'obesite', 'endocrinopathie'],
    sources: ['kobo', 'file', 'manual'],
  };
}
