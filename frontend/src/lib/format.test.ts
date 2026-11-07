import { describe, expect, it } from 'vitest';
import {
  age,
  classePastilleResultat,
  date,
  dateCourte,
  dateHeure,
  decomposerEdition,
  editionNormalisee,
  nombre,
  paliersPrevalence,
  pourcentage,
  typographieFr,
  typographieFrProfonde,
  variation,
} from './format';

describe('nombre', () => {
  it('applique le séparateur de milliers français', () => {
    // Espace insécable étroit (U+202F) inséré par Intl en locale fr-FR.
    expect(nombre(35233).replace(/\s/g, ' ')).toBe('35 233');
    expect(nombre(542)).toBe('542');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(nombre(null)).toBe('-');
    expect(nombre(undefined)).toBe('-');
    expect(nombre(Number.NaN)).toBe('-');
  });

  it('utilise une espace insécable dessinée par les polices', () => {
    // U+202F (espace fine) est rendue sans largeur par Inter : le nombre
    // apparaîtrait « 11732 ». On lui substitue U+00A0.
    const rendu = nombre(11732);
    expect(rendu).not.toContain(' ');
    expect(rendu).toContain(' ');
  });
});

describe('pourcentage', () => {
  it('utilise la virgule décimale', () => {
    expect(pourcentage(1.5)).toBe('1,5 %');
    expect(pourcentage(12.84)).toBe('12,8 %');
  });

  it('respecte le nombre de décimales demandé', () => {
    expect(pourcentage(7.25, 0)).toBe('7 %');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(pourcentage(null)).toBe('-');
  });
});

describe('variation', () => {
  it('préfixe les hausses et les baisses', () => {
    expect(variation(128)).toBe('+128');
    expect(variation(-9)).toBe('−9');
    expect(variation(0)).toBe('±0');
  });
});

describe('age', () => {
  it('calcule l’âge à la date de dépistage', () => {
    expect(age('1985-04-12', '2026-08-24')).toBe(41);
  });

  it('retire une année si l’anniversaire n’est pas passé', () => {
    expect(age('1985-12-31', '2026-08-24')).toBe(40);
  });

  it('renvoie null pour une date invalide', () => {
    expect(age('pas-une-date', '2026-08-24')).toBeNull();
  });
});

describe('dateCourte', () => {
  it('formate en JJ/MM/AA', () => {
    expect(dateCourte('2026-08-24')).toBe('24/08/26');
  });
});

describe('paliersPrevalence', () => {
  it('distingue « aucun dépistage » d’un taux nul', () => {
    const sansDonnee = paliersPrevalence(0, 0);
    expect(sansDonnee.palier).toBeNull();
    expect(sansDonnee.couleur).toBe('#eef0ef');

    const tauxNul = paliersPrevalence(0, 120);
    expect(tauxNul.palier).toBe(1);
  });

  it('applique les cinq paliers de la légende', () => {
    expect(paliersPrevalence(2.9, 100).palier).toBe(1);
    expect(paliersPrevalence(4.2, 100).palier).toBe(2);
    expect(paliersPrevalence(7.5, 100).palier).toBe(3);
    expect(paliersPrevalence(11, 100).palier).toBe(4);
    expect(paliersPrevalence(13.2, 100).palier).toBe(5);
  });

  it('place les bornes exactes dans le bon palier', () => {
    expect(paliersPrevalence(3, 100).palier).toBe(2);
    expect(paliersPrevalence(5, 100).palier).toBe(3);
    expect(paliersPrevalence(8, 100).palier).toBe(4);
    expect(paliersPrevalence(11.1, 100).palier).toBe(5);
  });
});

describe('classePastilleResultat', () => {
  it('signale les cas détectés en alerte', () => {
    expect(classePastilleResultat('diabete')).toContain('pastille-alerte');
    expect(classePastilleResultat('obesite')).toContain('pastille-alerte');
  });

  it('signale le pré-diabète en attention', () => {
    expect(classePastilleResultat('pre-diabete')).toContain('pastille-attention');
  });

  it('signale un résultat normal en vert', () => {
    expect(classePastilleResultat('normal')).toContain('pastille-normal');
  });
});

describe('fuseau horaire du Bénin', () => {
  /**
   * Le Bénin est à UTC+1 toute l'année. Les timestamps arrivent en UTC :
   * l'affichage doit ajouter l'heure, quel que soit le fuseau du navigateur.
   */
  it('affiche l’heure locale béninoise, pas UTC', () => {
    // 22 h 30 UTC = 23 h 30 au Bénin, le même jour.
    expect(dateHeure('2026-08-31T22:30:00.000Z')).toContain('23:30');
  });

  it('ne décale pas le jour en fin de soirée', () => {
    // 23 h 30 UTC = 00 h 30 le lendemain au Bénin.
    const rendu = dateHeure('2026-08-31T23:30:00.000Z');
    expect(rendu).toContain('01/09/2026');
    expect(rendu).toContain('00:30');
  });

  it('garde la bonne date pour une date pure', () => {
    // Une date de dépistage sans heure ne doit jamais reculer d'un jour.
    expect(date('2026-08-24')).toBe('24 août 2026');
    expect(dateCourte('2026-08-24')).toBe('24/08/26');
  });

  it('reste stable au premier jour du mois', () => {
    expect(date('2026-09-01')).toBe('1 septembre 2026');
  });
});

describe('libelle d’edition', () => {
  /*
   * Le defaut constate en production : l’administrateur avait saisi
   * « 6ème édition » la ou le jeu de demonstration portait
   * « 6ᵉ édition ». Les deux doivent desormais se composer
   * pareil.
   */
  it('ramene toutes les graphies au meme couple', () => {
    for (const saisie of [
      '6ème édition',
      '6eme édition',
      '6e édition',
      '6ᵉ édition',
      '6 édition',
      '6',
    ]) {
      expect(decomposerEdition(saisie)).toEqual({ numero: '6', exposant: 'e' });
    }
  });

  it('accorde la premiere edition au feminin', () => {
    expect(decomposerEdition('1ère édition')).toEqual({ numero: '1', exposant: 're' });
    expect(decomposerEdition('1re édition')).toEqual({ numero: '1', exposant: 're' });
    expect(decomposerEdition('1 édition')).toEqual({ numero: '1', exposant: 're' });
    expect(decomposerEdition('1er édition')).toEqual({ numero: '1', exposant: 'er' });
  });

  it('ecrit l’exposant pour une lecture en ligne', () => {
    expect(editionNormalisee('6ème édition')).toBe('6ᵉ édition');
    expect(editionNormalisee('1ère édition')).toBe('1ʳᵉ édition');
  });

  /*
   * Un intitule qui ne commence pas par un nombre est rendu tel quel plutot
   * que tronque : mieux vaut un libelle inattendu qu’un bandeau vide.
   */
  it('laisse passer un intitule libre sans le casser', () => {
    expect(decomposerEdition('Édition spéciale')).toBeNull();
    expect(editionNormalisee('Édition spéciale')).toBe('Édition spéciale');
    expect(editionNormalisee(null)).toBeNull();
    expect(editionNormalisee('   ')).toBeNull();
  });
});

/*
 * Le defaut d'origine : sur l'accueil, la carte « Campagne « Le diabete et
 * nous » » renvoyait le guillemet fermant seul a la ligne suivante. Rien dans
 * la mise en page ne pouvait l'empecher — la coupure etait permise par
 * l'espace ordinaire qui precedait le signe.
 */
describe('typographieFr', () => {
  const INSECABLE = ' ';

  it('soude le guillemet fermant au mot qui le precede', () => {
    const titre = typographieFr('Campagne « Le diabète et nous »');
    expect(titre).toBe(`Campagne «${INSECABLE}Le diabète et nous${INSECABLE}»`);
    // Plus aucune espace ordinaire contre un guillemet : plus aucune coupure
    // possible a cet endroit.
    expect(titre).not.toMatch(/ [»]|« /);
    // Et c'est bien la fine, pas la pleine : l'ecart se remarquait avant le
    // signe.
    expect(titre).not.toContain(' ');
  });

  it('traite de meme les autres signes doubles', () => {
    expect(typographieFr('Tous concernés, tous dépistés !')).toBe(
      `Tous concernés, tous dépistés${INSECABLE}!`,
    );
    expect(typographieFr('Une question ? Écrivez-nous.')).toBe(
      `Une question${INSECABLE}? Écrivez-nous.`,
    );
    expect(typographieFr('Horaires : 8 h')).toBe(`Horaires${INSECABLE}: 8 h`);
  });

  /*
   * La regle ne convertit que des espaces deja ecrites, elle n'en ajoute
   * jamais. Une regle qui insererait l'espace manquante ecrirait « 14 :30 »
   * et « https //… ».
   */
  it('n’insere pas d’espace la ou il n’y en avait pas', () => {
    expect(typographieFr('Rendez-vous à 14:30')).toBe('Rendez-vous à 14:30');
    expect(typographieFr('https://ablode.bj/actualites?page=2')).toBe(
      'https://ablode.bj/actualites?page=2',
    );
  });

  it('laisse l’anglais intact, qui n’espace pas ses signes', () => {
    expect(typographieFr('Free screening: book your slot!')).toBe(
      'Free screening: book your slot!',
    );
  });

  it('peut etre appliquee deux fois sans degat', () => {
    const une = typographieFr('Marche « Sucre à terre »');
    expect(typographieFr(une)).toBe(une);
  });
});

describe('typographieFrProfonde', () => {
  const INSECABLE = ' ';

  it('corrige toutes les chaines d’une reponse imbriquee', () => {
    const recu = typographieFrProfonde({
      items: [{ titre: 'Marche « Sucre à terre »', extrait: 'Cinq kilomètres.' }],
      meta: { total: 1, suivant: null, actif: true },
    });

    expect(recu.items[0].titre).toBe(`Marche «${INSECABLE}Sucre à terre${INSECABLE}»`);
    expect(recu.items[0].extrait).toBe('Cinq kilomètres.');
    // Les valeurs qui ne sont pas du texte traversent sans etre touchees :
    // un identifiant ou un drapeau transforme en chaine casserait la page.
    expect(recu.meta).toEqual({ total: 1, suivant: null, actif: true });
  });

  it('corrige aussi le contenu HTML d’un article', () => {
    expect(
      typographieFrProfonde('<p>Le projet <em>« Le diabète et nous »</em> a dix ans.</p>'),
    ).toBe(`<p>Le projet <em>«${INSECABLE}Le diabète et nous${INSECABLE}»</em> a dix ans.</p>`);
  });
});
