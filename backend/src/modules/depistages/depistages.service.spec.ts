import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import {
  Depistage,
  DepistageResultat,
  DepistageType,
} from 'src/database/entities';
import { SettingsService } from 'src/modules/settings/settings.service';
import { DepistagesService } from './depistages.service';

describe('DepistagesService — classification clinique', () => {
  let service: DepistagesService;

  const seuils = {
    glycemieNormale: 100,
    glycemieDiabete: 126,
    imcSurpoids: 25,
    imcObesite: 30,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepistagesService,
        { provide: getRepositoryToken(Depistage), useValue: {} },
        {
          provide: SettingsService,
          useValue: { seuilsCliniques: jest.fn().mockResolvedValue(seuils) },
        },
        { provide: CacheService, useValue: { invalidate: jest.fn() } },
      ],
    }).compile();

    service = module.get(DepistagesService);
  });

  describe('dépistage de type diabète', () => {
    it('classe une glycémie sous 100 mg/dL comme normale', async () => {
      const resultat = await service.deduireResultat({
        type: DepistageType.DIABETE,
        glycemie: 92,
      });
      expect(resultat).toBe(DepistageResultat.NORMAL);
    });

    it('classe une glycémie entre 100 et 125 mg/dL en pré-diabète', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 100 }),
      ).toBe(DepistageResultat.PRE_DIABETE);
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 125 }),
      ).toBe(DepistageResultat.PRE_DIABETE);
    });

    it('classe une glycémie de 126 mg/dL ou plus comme diabète', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 126 }),
      ).toBe(DepistageResultat.DIABETE);
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 240 }),
      ).toBe(DepistageResultat.DIABETE);
    });

    it('ne conclut pas sans mesure de glycémie', async () => {
      const resultat = await service.deduireResultat({
        type: DepistageType.DIABETE,
        glycemie: null,
      });
      expect(resultat).toBe(DepistageResultat.AUTRE);
    });
  });

  /*
   * Le cas qui a motivé le résultat « à vérifier » : une glycémie de
   * 12 mg/dL passait « Normal » parce que 12 est inférieur au seuil de 100.
   */
  describe('mesure hors des bornes physiologiques', () => {
    it('ne conclut pas sur une glycémie invraisemblablement basse', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 12 }),
      ).toBe(DepistageResultat.A_VERIFIER);
    });

    it('ne conclut pas sur une glycémie invraisemblablement haute', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 1200 }),
      ).toBe(DepistageResultat.A_VERIFIER);
    });

    it('ne conclut pas sur un IMC invraisemblable', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.OBESITE, imc: 120 }),
      ).toBe(DepistageResultat.A_VERIFIER);
    });

    it('conclut normalement aux bornes du plausible', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 20 }),
      ).toBe(DepistageResultat.NORMAL);
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: 900 }),
      ).toBe(DepistageResultat.DIABETE);
    });

    it('n’est pas déclenché par une mesure absente', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.DIABETE, glycemie: null }),
      ).toBe(DepistageResultat.AUTRE);
    });
  });

  describe('dépistage de type obésité', () => {
    it('classe un IMC de 30 ou plus comme obésité', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.OBESITE, imc: 30 }),
      ).toBe(DepistageResultat.OBESITE);
      expect(
        await service.deduireResultat({ type: DepistageType.OBESITE, imc: 41.2 }),
      ).toBe(DepistageResultat.OBESITE);
    });

    it('classe un IMC sous 30 comme normal', async () => {
      expect(
        await service.deduireResultat({ type: DepistageType.OBESITE, imc: 27 }),
      ).toBe(DepistageResultat.NORMAL);
    });
  });

  it('laisse l’endocrinopathie à l’appréciation clinique', async () => {
    const resultat = await service.deduireResultat({
      type: DepistageType.ENDOCRINOPATHIE,
      glycemie: 95,
    });
    expect(resultat).toBe(DepistageResultat.AUTRE);
  });

  it('suit les seuils configurés plutôt que des valeurs codées en dur', async () => {
    // Un comité scientifique peut abaisser le seuil : la classification suit.
    seuils.glycemieDiabete = 110;
    const resultat = await service.deduireResultat({
      type: DepistageType.DIABETE,
      glycemie: 115,
    });
    expect(resultat).toBe(DepistageResultat.DIABETE);
    seuils.glycemieDiabete = 126;
  });
});
