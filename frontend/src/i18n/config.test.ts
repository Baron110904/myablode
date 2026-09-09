import { describe, expect, it } from 'vitest';
import { LANGUE_DEFAUT, langueDuSite, negocierLangue } from './config';

describe('langueDuSite', () => {
  it('sert le français, langue de travail de l’association', () => {
    // Le site ne bascule pas en anglais selon le navigateur : le public visé
    // est francophone, et l'anglais masquerait la langue de l'association.
    expect(langueDuSite()).toBe('fr');
  });
});

describe('negocierLangue', () => {
  it('retient le français pour un navigateur francophone', () => {
    expect(negocierLangue('fr-BJ,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(negocierLangue('fr')).toBe('fr');
  });

  it('retient l’anglais pour un navigateur anglophone', () => {
    expect(negocierLangue('en-US,en;q=0.9')).toBe('en');
    expect(negocierLangue('en-GB')).toBe('en');
  });

  it('privilégie le français dès qu’il est accepté, même en second choix', () => {
    // Le public de l'association est francophone : l'anglais ne prend la main
    // que si le français n'est pas demandé du tout.
    expect(negocierLangue('en;q=0.5,fr;q=0.9')).toBe('fr');
    expect(negocierLangue('fr;q=0.3,en;q=0.95')).toBe('fr');
    expect(negocierLangue('en-US,en;q=0.9,fr;q=0.1')).toBe('fr');
  });

  it('ignore une langue non prise en charge et passe à la suivante', () => {
    expect(negocierLangue('yo-NG,yo;q=0.9,en;q=0.7')).toBe('en');
    expect(negocierLangue('de-DE,de;q=0.9,fr;q=0.4')).toBe('fr');
  });

  it('replie sur le français quand aucune langue ne correspond', () => {
    expect(negocierLangue('yo-NG,ha;q=0.8')).toBe(LANGUE_DEFAUT);
    expect(negocierLangue('')).toBe(LANGUE_DEFAUT);
    expect(negocierLangue(null)).toBe(LANGUE_DEFAUT);
    expect(negocierLangue(undefined)).toBe(LANGUE_DEFAUT);
  });

  it('écarte une langue explicitement refusée (q=0)', () => {
    expect(negocierLangue('en;q=0,fr;q=0.5')).toBe('fr');
  });

  it('tolère les espaces et la casse', () => {
    expect(negocierLangue('  EN-us , FR ; q=0.4 ')).toBe('fr');
    expect(negocierLangue('  EN-us ')).toBe('en');
  });
});
