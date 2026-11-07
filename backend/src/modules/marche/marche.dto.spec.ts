import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigurerFormulaireDto } from './dto/marche.dto';

/**
 * Le lien d'inscription externe.
 *
 * Il finit en `href` sur une page publique : tout ce qui est accepté ici
 * devient cliquable pour les visiteurs. La validation n'est donc pas un
 * confort de saisie, c'est la seule barrière entre le champ et le
 * navigateur de quelqu'un d'autre.
 */
async function erreurs(valeurs: Partial<ConfigurerFormulaireDto>) {
  const dto = plainToInstance(ConfigurerFormulaireDto, {
    titre: 'Marche Sucre à terre',
    ...valeurs,
  });
  return validate(dto);
}

const surLeLien = (liste: Awaited<ReturnType<typeof erreurs>>) =>
  liste.filter((e) => e.property === 'lien_externe');

describe('ConfigurerFormulaireDto - lien d’inscription externe', () => {
  it('accepte une adresse http(s) ordinaire', async () => {
    expect(surLeLien(await erreurs({ lien_externe: 'https://exemple.org/marche' }))).toHaveLength(0);
    expect(surLeLien(await erreurs({ lien_externe: 'http://exemple.org/marche' }))).toHaveLength(0);
  });

  /*
   * Le champ est facultatif : vider le lien est la manière de revenir au
   * bulletin du site. Ni `null` ni la chaîne vide ne doivent être rejetés,
   * sans quoi l'administrateur ne pourrait plus faire marche arrière.
   */
  it('laisse vider le champ pour revenir au bulletin du site', async () => {
    expect(surLeLien(await erreurs({ lien_externe: null }))).toHaveLength(0);
    expect(surLeLien(await erreurs({ lien_externe: '' }))).toHaveLength(0);
    expect(surLeLien(await erreurs({}))).toHaveLength(0);
  });

  /*
   * Sans restriction de protocole, un `javascript:` collé ici deviendrait
   * un lien exécutable sur la page publique de l'article.
   */
  it('refuse un protocole exécutable', async () => {
    const dangereux = [
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ];
    for (const lien of dangereux) {
      expect(surLeLien(await erreurs({ lien_externe: lien }))).not.toHaveLength(0);
    }
  });

  it('refuse une adresse sans protocole, qui serait lue comme un chemin interne', async () => {
    expect(surLeLien(await erreurs({ lien_externe: 'exemple.org/marche' }))).not.toHaveLength(0);
  });

  it('refuse ce qui n’est pas une adresse', async () => {
    expect(surLeLien(await erreurs({ lien_externe: 'je ne sais pas' }))).not.toHaveLength(0);
  });

  it('explique à l’administrateur ce qui est attendu', async () => {
    const [erreur] = surLeLien(await erreurs({ lien_externe: 'exemple.org' }));
    expect(Object.values(erreur.constraints ?? {}).join(' ')).toMatch(/http:\/\/ ou https:\/\//);
  });
});
