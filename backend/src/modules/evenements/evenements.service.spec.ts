import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Evenement } from 'src/database/entities';
import { EvenementsService, MAX_EVENEMENTS_AFFICHES } from './evenements.service';

/**
 * Le plafond d'affichage du programme.
 *
 * L'accueil range les dates sur une rangée : au-delà de quatre, les cellules
 * deviennent illisibles. La règle est donc appliquée à la saisie, sinon
 * l'administrateur publie une cinquième date qui n'apparaîtra jamais, sans
 * rien pour le lui dire.
 */
describe('EvenementsService - plafond du programme affiché', () => {
  let service: EvenementsService;
  let affichees: number;
  let aVenir: boolean;
  let sauvegarde: jest.Mock;

  beforeEach(async () => {
    affichees = 0;
    aVenir = true;
    sauvegarde = jest.fn((entite) => Promise.resolve(entite));

    const constructeur = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn(() => Promise.resolve(affichees)),
    };

    const module = await Test.createTestingModule({
      providers: [
        EvenementsService,
        {
          provide: getRepositoryToken(Evenement),
          useValue: {
            createQueryBuilder: jest.fn(() => constructeur),
            // C'est la base qui tranche « passé ou à venir », comme dans
            // `findPublics` : le test se contente d'en jouer la réponse.
            query: jest.fn(() => Promise.resolve([{ a_venir: aVenir }])),
            create: jest.fn((dto) => dto),
            save: sauvegarde,
            findOne: jest.fn(() =>
              Promise.resolve({
                id: 7,
                date_debut: '2026-12-01',
                date_fin: null,
                publie: true,
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(EvenementsService);
  });

  const nouvelle = { titre: 'Projection', date_debut: '2026-12-01' };

  it('accepte une date tant que le programme n’est pas plein', async () => {
    affichees = MAX_EVENEMENTS_AFFICHES - 1;
    await expect(service.create(nouvelle)).resolves.toBeDefined();
    expect(sauvegarde).toHaveBeenCalled();
  });

  it('refuse la cinquième date publiée, sans rien enregistrer', async () => {
    affichees = MAX_EVENEMENTS_AFFICHES;
    await expect(service.create(nouvelle)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sauvegarde).not.toHaveBeenCalled();
  });

  /*
   * La consigne est « il peut la créer, mais pas l'afficher » : une date
   * enregistrée sans être publiée doit donc toujours passer.
   */
  it('laisse enregistrer autant de dates non publiées qu’on veut', async () => {
    affichees = MAX_EVENEMENTS_AFFICHES + 3;
    await expect(
      service.create({ ...nouvelle, publie: false }),
    ).resolves.toBeDefined();
  });

  /*
   * Un programme fait aussi d'archives : dix ans de dates publiées et
   * révolues ne doivent pas bloquer la saisie de la prochaine conférence.
   */
  it('ne compte pas une date déjà passée', async () => {
    affichees = MAX_EVENEMENTS_AFFICHES;
    aVenir = false;
    await expect(service.create(nouvelle)).resolves.toBeDefined();
  });

  it('laisse un événement déjà publié se modifier lui-même', async () => {
    // Le décompte exclut l'événement modifié : les quatre places sont
    // occupées, mais l'une d'elles est la sienne.
    affichees = MAX_EVENEMENTS_AFFICHES - 1;
    await expect(service.update(7, { lieu: 'Cotonou' })).resolves.toBeDefined();
  });

  it('cite la limite dans le message, pour que le formulaire l’explique', async () => {
    affichees = MAX_EVENEMENTS_AFFICHES;
    await expect(service.create(nouvelle)).rejects.toThrow(
      new RegExp(String(MAX_EVENEMENTS_AFFICHES)),
    );
  });
});
