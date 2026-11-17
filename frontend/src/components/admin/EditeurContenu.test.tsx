import { describe, expect, it } from 'vitest';
import { completerAdresse } from './EditeurContenu';

describe('completerAdresse', () => {
  /*
   * Le reproche d'origine : une adresse tapée sans « https:// » était lue
   * comme un chemin du site, et le lien de l'article menait vers
   * /admin/ablode.bj au lieu du site du partenaire.
   */
  it('préfixe une adresse saisie sans schéma', () => {
    expect(completerAdresse('ablode.bj')).toBe('https://ablode.bj');
    expect(completerAdresse('exemple.org/page?a=1')).toBe(
      'https://exemple.org/page?a=1',
    );
  });

  it('laisse intacte une adresse qui porte déjà son schéma', () => {
    expect(completerAdresse('https://ablode.bj')).toBe('https://ablode.bj');
    expect(completerAdresse('http://ablode.bj')).toBe('http://ablode.bj');
  });

  // Un rédacteur peut vouloir pointer une adresse de contact.
  it('accepte les schémas de courriel et de téléphone', () => {
    expect(completerAdresse('mailto:contact@ablode.bj')).toBe(
      'mailto:contact@ablode.bj',
    );
    expect(completerAdresse('tel:+22965508645')).toBe('tel:+22965508645');
  });

  it('reconnaît le schéma quelle que soit la casse', () => {
    expect(completerAdresse('HTTPS://ablode.bj')).toBe('HTTPS://ablode.bj');
  });

  it('ignore les blancs autour de la saisie', () => {
    expect(completerAdresse('  ablode.bj  ')).toBe('https://ablode.bj');
  });

  it('rend une chaîne vide pour une saisie vide', () => {
    expect(completerAdresse('   ')).toBe('');
  });

  /*
   * Aucun schéma exécutable ne passe : faute de correspondre à la liste, il
   * est préfixé et devient une adresse inerte. L'assainisseur du serveur
   * reste la défense qui fait autorité, celle-ci lui évite le cas.
   */
  it('neutralise un schéma exécutable au lieu de le poser tel quel', () => {
    expect(completerAdresse('javascript:alert(1)')).toBe(
      'https://javascript:alert(1)',
    );
  });
});
