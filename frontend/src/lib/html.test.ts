import { describe, expect, it } from 'vitest';
import { memeContenu } from './html';

describe('memeContenu', () => {
  /*
   * Le reproche d'origine : « L'article est enregistré, mais certaines
   * balises ont été retirées » s'affichait sur un article intact, dès qu'il
   * contenait une image. L'éditeur écrit <img>, l'assainisseur renvoie
   * <img />.
   */
  it('tient les deux écritures d’une balise orpheline pour équivalentes', () => {
    expect(
      memeContenu('<img src="/uploads/a.webp" />', '<img src="/uploads/a.webp">'),
    ).toBe(true);
    expect(memeContenu('<p>un<br />deux</p>', '<p>un<br>deux</p>')).toBe(true);
    expect(memeContenu('<hr />', '<hr>')).toBe(true);
  });

  it('ignore un blanc de bordure', () => {
    expect(memeContenu('<p>texte</p>', '  <p>texte</p>\n')).toBe(true);
  });

  it('tient un contenu identique pour identique', () => {
    const html = '<h2>Titre</h2><p>Un <strong>mot</strong> en gras.</p>';
    expect(memeContenu(html, html)).toBe(true);
  });

  /*
   * L'avertissement garde sa raison d'être : ce qui est réellement retiré
   * doit continuer à faire diverger les deux textes.
   */
  it('voit une balise réellement retirée', () => {
    expect(
      memeContenu('<p>texte</p>', '<p>texte</p><script>alert(1)</script>'),
    ).toBe(false);
  });

  it('voit une propriété de style refusée', () => {
    expect(
      memeContenu('<p>texte</p>', '<p style="position: fixed">texte</p>'),
    ).toBe(false);
  });

  it('voit un attribut retiré d’une image', () => {
    expect(
      memeContenu('<img src="/a.webp" />', '<img src="/a.webp" onerror="x()">'),
    ).toBe(false);
  });
});
