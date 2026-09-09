import { assainirHtml } from './sanitize-html';

describe('assainirHtml — neutralisation des vecteurs XSS', () => {
  it('supprime les balises script et leur contenu', () => {
    const sortie = assainirHtml('<p>Bonjour</p><script>alert("xss")</script>');
    expect(sortie).not.toContain('script');
    expect(sortie).not.toContain('alert');
    expect(sortie).toContain('<p>Bonjour</p>');
  });

  it('supprime les gestionnaires d’événements', () => {
    const sortie = assainirHtml('<img src="/photo.jpg" onerror="alert(1)" />');
    expect(sortie).not.toContain('onerror');
    expect(sortie).toContain('src="/photo.jpg"');
  });

  it('rejette les URL javascript: dans les liens', () => {
    const sortie = assainirHtml('<a href="javascript:alert(1)">clic</a>');
    expect(sortie).not.toContain('javascript:');
    expect(sortie).toContain('clic');
  });

  it('supprime les balises non autorisées en conservant le texte', () => {
    const sortie = assainirHtml('<marquee>texte</marquee>');
    expect(sortie).not.toContain('marquee');
    expect(sortie).toContain('texte');
  });

  it('supprime les balises style, form et iframe non autorisés', () => {
    expect(assainirHtml('<style>body{display:none}</style>')).toBe('');
    expect(assainirHtml('<form action="/x"><input name="a"></form>')).toBe('');
    expect(assainirHtml('<iframe src="https://evil.example"></iframe>')).not.toContain(
      'evil.example',
    );
  });

  it('conserve les iframes des hébergeurs vidéo autorisés', () => {
    const sortie = assainirHtml(
      '<iframe src="https://www.youtube.com/embed/abc123" width="560"></iframe>',
    );
    expect(sortie).toContain('youtube.com/embed/abc123');
    expect(sortie).toContain('width="560"');
  });

  it('ajoute rel="noopener noreferrer" aux liens ouvrant un nouvel onglet', () => {
    const sortie = assainirHtml('<a href="https://ablode.bj" target="_blank">site</a>');
    expect(sortie).toContain('rel="noopener noreferrer"');
  });

  it('conserve la mise en forme légitime de l’éditeur', () => {
    const entree =
      '<h2>Titre</h2><p><strong>gras</strong> et <em>italique</em></p><ul><li>point</li></ul>';
    expect(assainirHtml(entree)).toBe(entree);
  });

  it('accepte une image en data-URI mais pas un data: exécutable', () => {
    const image = assainirHtml(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="logo" />',
    );
    expect(image).toContain('data:image/png');

    const script = assainirHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
    expect(script).not.toContain('data:text/html');
  });

  it('supprime les commentaires HTML', () => {
    expect(assainirHtml('<p>a</p><!-- commentaire -->')).toBe('<p>a</p>');
  });

  it('gère une entrée vide sans lever d’erreur', () => {
    expect(assainirHtml('')).toBe('');
  });
});

/**
 * L'assainisseur supprimait sans le dire les balises et attributs qu'un
 * rédacteur utilise couramment : le `<h1>` disparaissait entièrement, et
 * `class` comme `style` étaient effacés. À l'enregistrement, la mise en forme
 * s'évaporait sans explication.
 */
describe('assainirHtml — conservation de la mise en forme', () => {
  it('conserve tous les niveaux de titre', () => {
    const sortie = assainirHtml('<h1>Un</h1><h2>Deux</h2><h5>Cinq</h5>');
    expect(sortie).toBe('<h1>Un</h1><h2>Deux</h2><h5>Cinq</h5>');
  });

  it('conserve les classes et les identifiants', () => {
    expect(assainirHtml('<p class="chapo" id="intro">Texte</p>')).toBe(
      '<p class="chapo" id="intro">Texte</p>',
    );
  });

  it('conserve un tableau complet et ses légendes', () => {
    const entree =
      '<table><caption>Bilan</caption><thead><tr><th scope="col">Commune</th></tr>' +
      '</thead><tbody><tr><td colspan="2">Djougou</td></tr></tbody></table>';
    expect(assainirHtml(entree)).toBe(entree);
  });

  it('conserve les listes de définitions', () => {
    expect(assainirHtml('<dl><dt>IMC</dt><dd>Indice</dd></dl>')).toBe(
      '<dl><dt>IMC</dt><dd>Indice</dd></dl>',
    );
  });

  it('conserve le titre d’un lien', () => {
    expect(assainirHtml('<a href="https://ablode.bj" title="Site">ABLODE</a>')).toBe(
      '<a href="https://ablode.bj" title="Site">ABLODE</a>',
    );
  });
});

describe('assainirHtml — filtrage de l’attribut style', () => {
  it('conserve les propriétés de mise en forme', () => {
    expect(assainirHtml('<p style="text-align:center;color:#0f766e">Centre</p>')).toBe(
      '<p style="text-align:center; color:#0f766e">Centre</p>',
    );
  });

  it('retire les propriétés permettant de recouvrir la page', () => {
    // Un bloc en position fixe superposerait un faux formulaire au contenu.
    const sortie = assainirHtml(
      '<div style="position:fixed;top:0;z-index:9999;color:red">X</div>',
    );
    expect(sortie).toBe('<div style="color:red">X</div>');
  });

  it('retire une déclaration chargeant une ressource externe', () => {
    const sortie = assainirHtml('<p style="background-color:url(http://pisteur.tld/x)">X</p>');
    expect(sortie).toBe('<p>X</p>');
  });

  it('retire expression() et les valeurs échappées par antislash', () => {
    expect(assainirHtml('<p style="width:expression(alert(1))">X</p>')).toBe('<p>X</p>');
    // \x5c est l'antislash : « \6a avascript: » est un « javascript: » encodé en CSS.
    expect(assainirHtml('<p style="color:\x5c6a avascript:alert(1)">X</p>')).toBe(
      '<p>X</p>',
    );
  });

  it('n’émet pas d’attribut style vide', () => {
    expect(assainirHtml('<p style="position:absolute">X</p>')).toBe('<p>X</p>');
  });

  it('refuse toujours les gestionnaires d’événements', () => {
    expect(assainirHtml('<p class="a" onclick="alert(1)">X</p>')).toBe(
      '<p class="a">X</p>',
    );
  });
});

/**
 * Deux contournements confirmés exploitables sur la page publique d'un article
 * — rendue côté serveur, où un <script> injecté s'exécute réellement.
 */
describe('assainirHtml — contournements confirmés', () => {
  it('refuse un « javascript: » encodé en entité HTML', () => {
    // Le navigateur décode &colon; puis exécute le lien au clic. Vérifié.
    expect(assainirHtml('<a href="javascript&colon;alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href="&#x6a;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href="&amp;#106;avascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('refuse un schéma coupé par un blanc ou un caractère de contrôle', () => {
    expect(assainirHtml('<a href="java\nscript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(assainirHtml('<a href="  javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('neutralise une balise laissée ouverte', () => {
    /*
     * « <script src=//exemple.tld » sans « > » traversait le filtre intact :
     * le navigateur absorbait le balisage suivant comme attributs et lançait
     * la requête vers le script. Le chevron doit être échappé.
     */
    const sortie = assainirHtml('<p>ok</p><script src=//exemple.tld');
    expect(sortie).not.toContain('<script');
    expect(sortie).toContain('&lt;script');
    expect(sortie).toContain('<p>ok</p>');
  });

  it('n’autorise que les schémas d’URL attendus', () => {
    expect(assainirHtml('<a href="https://ablode.bj">x</a>')).toContain('https://ablode.bj');
    expect(assainirHtml('<a href="mailto:contact@ablode.bj">x</a>')).toContain('mailto:');
    expect(assainirHtml('<a href="tel:+22965508645">x</a>')).toContain('tel:');
    expect(assainirHtml('<a href="/actualites">x</a>')).toContain('href="/actualites"');
    expect(assainirHtml('<a href="file:///etc/passwd">x</a>')).toBe('<a>x</a>');
  });
});
