import {
  deduireChampCible,
  deduireMapping,
  reduireNomChamp,
} from './correspondance-champs';

/**
 * Champs réels d'un formulaire Kobo de dépistage ABLODE.
 * Kobo remplace chaque caractère non ASCII par un souligné.
 */
const CHAMPS_REELS = [
  'formhub/uuid',
  'start',
  'end',
  'Code_de_d_pistage',
  'T_l_phone',
  'Nom',
  'Pr_nom',
  'Date_de_naissance',
  'Sexe',
  'Commune',
  'Date_de_d_pistage',
  'Type_de_d_pistage',
  'Campagne_associ_e',
  'Glyc_mie_MG_DL',
  'IMC',
  'meta/instanceID',
  'meta/rootUuid',
];

describe('reduireNomChamp', () => {
  it('retire le groupe, les accents et les séparateurs', () => {
    expect(reduireNomChamp('Groupe/Glyc_mie_MG_DL')).toBe('glycmiemgdl');
    expect(reduireNomChamp('Pr_nom')).toBe('prnom');
    expect(reduireNomChamp('Date de dépistage')).toBe('datededepistage');
    expect(reduireNomChamp('Nom')).toBe('nom');
  });
});

describe('deduireChampCible — formulaire Kobo réel', () => {
  it.each([
    ['Nom', 'nom'],
    ['Pr_nom', 'prenom'],
    ['Date_de_naissance', 'date_naissance'],
    ['Sexe', 'sexe'],
    ['Commune', 'commune_id'],
    ['Date_de_d_pistage', 'date_depistage'],
    ['Type_de_d_pistage', 'type'],
    ['Glyc_mie_MG_DL', 'glycemie'],
    ['IMC', 'imc'],
    ['Code_de_d_pistage', 'code_unique'],
    ['T_l_phone', 'telephone'],
  ])('associe « %s » à %s', (champ, attendu) => {
    expect(deduireChampCible(champ)).toBe(attendu);
  });

  it('ignore les métadonnées Kobo', () => {
    for (const meta of ['start', 'end', 'formhub/uuid', 'meta/instanceID', 'meta/rootUuid']) {
      expect(deduireChampCible(meta)).toBeNull();
    }
  });

  it('ne confond pas prénom et nom', () => {
    // « prnom » contient « nom » : sans priorité, le prénom finirait dans nom.
    expect(deduireChampCible('Pr_nom')).toBe('prenom');
    expect(deduireChampCible('Prenom')).toBe('prenom');
    expect(deduireChampCible('Prénoms')).toBe('prenom');
    expect(deduireChampCible('Nom')).toBe('nom');
    expect(deduireChampCible('Nom_complet')).toBe('nom');
  });

  it('ne confond pas les deux dates', () => {
    expect(deduireChampCible('Date_de_naissance')).toBe('date_naissance');
    expect(deduireChampCible('Date_de_d_pistage')).toBe('date_depistage');
    expect(deduireChampCible('DDN')).toBe('date_naissance');
  });
});

describe('deduireChampCible — libellés variés', () => {
  it.each([
    ['nom_complet', 'nom'],
    ['glyc_mgdl', 'glycemie'],
    ['glycemie_a_jeun', 'glycemie'],
    ['taux_de_sucre', 'glycemie'],
    ['sexe_h_f', 'sexe'],
    ['genre', 'sexe'],
    ['commune_de_residence', 'commune_id'],
    ['ville', 'commune_id'],
    ['telephone_beneficiaire', 'telephone'],
    ['tel', 'telephone'],
    ['imc_calcule', 'imc'],
    ['oriente_vers_centre', 'oriente_centre'],
    ['observations', 'notes'],
    ['resultat_du_test', 'resultat'],
  ])('associe « %s » à %s', (champ, attendu) => {
    expect(deduireChampCible(champ)).toBe(attendu);
  });

  it('renvoie null plutôt que de deviner au hasard', () => {
    expect(deduireChampCible('question_12')).toBeNull();
    expect(deduireChampCible('xyz')).toBeNull();
    expect(deduireChampCible('')).toBeNull();
  });
});

describe('deduireMapping', () => {
  it('couvre tous les champs obligatoires du formulaire réel', () => {
    const mapping = deduireMapping(CHAMPS_REELS);
    const cibles = new Set(Object.values(mapping));

    // Sans ces cinq colonnes, la synchronisation rejette chaque ligne.
    for (const requis of ['nom', 'prenom', 'date_naissance', 'sexe', 'commune_id', 'date_depistage']) {
      expect(cibles.has(requis as never)).toBe(true);
    }
  });

  it('associe correctement les champs du formulaire réel', () => {
    const mapping = deduireMapping(CHAMPS_REELS);

    expect(mapping['Nom']).toBe('nom');
    expect(mapping['Pr_nom']).toBe('prenom');
    expect(mapping['Glyc_mie_MG_DL']).toBe('glycemie');
    expect(mapping['Date_de_d_pistage']).toBe('date_depistage');
    expect(mapping['Date_de_naissance']).toBe('date_naissance');
  });

  it('n’attribue jamais deux champs à la même colonne', () => {
    const mapping = deduireMapping([...CHAMPS_REELS, 'Nom_du_patient', 'Autre_commune']);
    const cibles = Object.values(mapping);
    expect(cibles.length).toBe(new Set(cibles).size);
  });

  it('laisse les métadonnées hors de la correspondance', () => {
    const mapping = deduireMapping(CHAMPS_REELS);
    expect(mapping['start']).toBeUndefined();
    expect(mapping['meta/instanceID']).toBeUndefined();
    expect(mapping['formhub/uuid']).toBeUndefined();
  });
});
