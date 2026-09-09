/**
 * Assainissement du HTML produit par l'éditeur WYSIWYG.
 *
 * Le contenu d'un article est rédigé par un administrateur authentifié, mais
 * il est ensuite affiché tel quel à tous les visiteurs : un compte compromis
 * ou un copier-coller depuis une page piégée suffirait à injecter un script.
 * On applique donc une liste blanche stricte (OWASP A03 — XSS).
 */

const BALISES_AUTORISEES = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'code', 'pre',
  'a', 'img', 'figure', 'figcaption',
  'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'iframe', 'hr', 'span', 'div',
]);

const ATTRIBUTS_AUTORISES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  iframe: new Set(['src', 'width', 'height', 'allowfullscreen']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  ol: new Set(['start', 'reversed']),
};

/**
 * Attributs acceptés sur n'importe quelle balise.
 *
 * `class` et `style` ne peuvent pas exécuter de code : les retirer faisait
 * simplement disparaître la mise en forme de l'auteur à l'enregistrement,
 * sans qu'il comprenne pourquoi. `style` reste filtré propriété par propriété
 * (voir PROPRIETES_CSS_AUTORISEES).
 */
const ATTRIBUTS_GLOBAUX = new Set(['class', 'style', 'title', 'lang', 'dir', 'id']);

/**
 * Propriétés CSS acceptées dans un attribut `style`.
 *
 * La liste couvre la mise en forme rédactionnelle et exclut tout ce qui
 * permettrait de détourner la page : `position`, `z-index` et `content`
 * autorisent la superposition d'un faux formulaire par-dessus le contenu.
 */
const PROPRIETES_CSS_AUTORISEES = new Set([
  'color', 'background-color',
  'text-align', 'text-decoration', 'text-transform', 'text-indent',
  'font-size', 'font-style', 'font-weight', 'font-family',
  'line-height', 'letter-spacing', 'white-space',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-color', 'border-style', 'border-width', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'width', 'max-width', 'min-width', 'height', 'max-height',
  'vertical-align', 'list-style-type', 'float', 'clear',
]);

/** Hébergeurs vidéo acceptés dans un iframe (fonction « embed » de TipTap). */
const HOTES_IFRAME_AUTORISES = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
];

export function assainirHtml(html: string): string {
  if (!html) return '';

  let sortie = html;

  // 1. Retirer entièrement les éléments dont le contenu est exécutable.
  sortie = sortie.replace(
    /<(script|style|object|embed|form|input|button|link|meta)\b[\s\S]*?<\/\1\s*>/gi,
    '',
  );
  sortie = sortie.replace(
    /<(script|style|object|embed|form|input|button|link|meta)\b[^>]*\/?>/gi,
    '',
  );
  sortie = sortie.replace(/<!--[\s\S]*?-->/g, '');

  /*
   * 2. Neutraliser les « < » qui n'ouvrent pas une balise complète.
   *
   * L'étape suivante ne reconnaît que les balises terminées par « > ». Une
   * balise laissée ouverte — « <script src=//exemple.tld » en fin de contenu —
   * traversait donc le filtre intacte ; le navigateur absorbait ensuite le
   * balisage suivant comme attributs et chargeait le script. Vérifié : la
   * requête réseau partait bel et bien.
   */
  sortie = sortie.replace(/<(?!\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^<>]*)?\/?>)/g, '&lt;');

  // 3. Filtrer chaque balise restante contre la liste blanche.
  sortie = sortie.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)\/?>/g,
    (_correspondance, fermeture: string, nomBrut: string, attributs: string) => {
      const nom = nomBrut.toLowerCase();
      if (!BALISES_AUTORISEES.has(nom)) return '';
      if (fermeture) return `</${nom}>`;

      const attributsFiltres = filtrerAttributs(nom, attributs);
      const autoFermante = ['br', 'hr', 'img'].includes(nom);
      return `<${nom}${attributsFiltres}${autoFermante ? ' /' : ''}>`;
    },
  );

  return sortie.trim();
}

function filtrerAttributs(balise: string, attributsBruts: string): string {
  if (!attributsBruts.trim()) return '';
  const autorises = ATTRIBUTS_AUTORISES[balise];

  const conserves: string[] = [];
  const motif = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let correspondance: RegExpExecArray | null;

  while ((correspondance = motif.exec(attributsBruts)) !== null) {
    const nom = correspondance[1].toLowerCase();
    const valeur = correspondance[3] ?? correspondance[4] ?? correspondance[5] ?? '';

    // Aucun gestionnaire d'événement, quelle que soit la balise.
    if (nom.startsWith('on')) continue;
    if (!ATTRIBUTS_GLOBAUX.has(nom) && !autorises?.has(nom)) continue;

    if (nom === 'href' || nom === 'src') {
      const url = urlPropre(balise, nom, valeur);
      if (url === null) continue;
      conserves.push(`${nom}="${echapperGuillemets(url)}"`);
      continue;
    }

    if (nom === 'style') {
      const style = filtrerStyle(valeur);
      if (style) conserves.push(`style="${echapperGuillemets(style)}"`);
      continue;
    }

    conserves.push(`${nom}="${echapperGuillemets(valeur)}"`);
  }

  // Un lien externe ouvert dans un nouvel onglet doit couper l'accès à
  // window.opener (vulnérabilité « reverse tabnabbing »).
  if (balise === 'a' && conserves.some((attribut) => attribut.startsWith('target='))) {
    if (!conserves.some((attribut) => attribut.startsWith('rel='))) {
      conserves.push('rel="noopener noreferrer"');
    }
  }

  return conserves.length > 0 ? ` ${conserves.join(' ')}` : '';
}

/**
 * Ne garde que les déclarations dont la propriété est explicitement autorisée.
 *
 * `url()` chargerait une ressource extérieure (pistage), `expression()` du
 * code sur les anciens moteurs, et un antislash permet d'encoder un mot-clé
 * pour passer sous le filtre.
 */
function filtrerStyle(valeur: string): string {
  return valeur
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separateur = declaration.indexOf(':');
      if (separateur <= 0) return false;

      const propriete = declaration.slice(0, separateur).trim().toLowerCase();
      if (!PROPRIETES_CSS_AUTORISEES.has(propriete)) return false;

      const contenu = declaration.slice(separateur + 1).toLowerCase();
      if (!contenu.trim()) return false;
      return !/url\(|expression|javascript:|\\|\/\*/.test(contenu);
    })
    .join('; ');
}

/**
 * Ramène une URL à la forme que le navigateur exécutera réellement.
 *
 * Le navigateur décode les entités HTML d'un attribut et ignore blancs et
 * caractères de contrôle dans un schéma. Comparer la valeur brute laissait
 * donc passer « javascript&colon;… », « &#106;avascript:… » et un
 * « javascript: » coupé par un retour à la ligne : les trois ont été
 * confirmés exécutables sur la page publique d'un article.
 */
function urlComparable(valeur: string): string {
  // Filtrage caractère par caractère plutôt que par classe d'échappements :
  // une URL légitime n'a besoin ni d'espaces ni de caractères de contrôle.
  return Array.from(decoderEntites(valeur))
    .filter((caractere) => {
      const code = caractere.codePointAt(0) ?? 0;
      return code > 32 && code !== 127;
    })
    .join('');
}

/** Décode les entités qu'un navigateur résoudrait dans un attribut. */
function decoderEntites(texte: string): string {
  const nommees: Record<string, string> = {
    colon: ':',
    sol: '/',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };

  // Deux passes : « &amp;#58; » devient « &#58; » puis « : ».
  let sortie = texte;
  for (let passe = 0; passe < 2; passe++) {
    sortie = sortie
      .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#([0-9]+);?/g, (_, dec: string) =>
        String.fromCodePoint(parseInt(dec, 10)),
      )
      .replace(/&([a-zA-Z]+);?/g, (correspondance, nom: string) =>
        nommees[nom.toLowerCase()] ?? correspondance,
      );
  }
  return sortie;
}

/** Schémas acceptés : une liste blanche, et non une liste d'interdits. */
const SCHEMAS_AUTORISES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Renvoie l'URL à écrire dans l'attribut, ou null si elle est refusée.
 *
 * C'est la forme décodée qui est renvoyée, afin que la valeur stockée soit
 * exactement celle qui a été validée : conserver la valeur brute rouvrirait
 * l'écart entre ce que l'on contrôle et ce que le navigateur interprète.
 */
function urlPropre(balise: string, attribut: string, valeur: string): string | null {
  const url = urlComparable(valeur);

  // Exception : les images en data-URI d'un format bitmap connu.
  const imageInline =
    balise === 'img' &&
    attribut === 'src' &&
    /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url);

  const schema = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
  if (schema && !imageInline && !SCHEMAS_AUTORISES.includes(schema[1].toLowerCase())) {
    return null;
  }

  if (balise === 'iframe') {
    try {
      const parsee = new URL(url, 'https://ablode.bj');
      if (!HOTES_IFRAME_AUTORISES.includes(parsee.hostname)) return null;
    } catch {
      return null;
    }
  }

  return url;
}

function echapperGuillemets(valeur: string): string {
  return valeur.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
