'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Éditeur de texte mis en forme, pour les courriels de la newsletter.
 *
 * L'auteur tape du texte et clique sur les boutons ; il ne voit jamais de
 * balise. Le composant produit néanmoins du HTML, parce que c'est ce qu'un
 * courriel transporte.
 *
 * `document.execCommand` est officiellement déprécié mais reste la seule API
 * d'édition disponible dans tous les navigateurs sans embarquer une
 * bibliothèque. Sa sortie est en revanche désordonnée — `<span style>`,
 * `<div>`, `<font>` selon le navigateur — donc elle est systématiquement
 * nettoyée avant de remonter au parent.
 */

/** Balises conservées. Tout le reste est déplié en texte. */
const BALISES_AUTORISEES = new Set([
  'P',
  'BR',
  'STRONG',
  'EM',
  'U',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'A',
  'BLOCKQUOTE',
]);

/**
 * Réécrit l'arbre produit par le navigateur en HTML de courriel.
 *
 * Les clients de messagerie ignorent une grande partie du CSS : mieux vaut des
 * balises sémantiques qu'un `<span style="font-weight:bold">`, que Outlook
 * rendra en texte normal.
 */
function nettoyer(racine: HTMLElement): string {
  const traduire = (noeud: Node): string => {
    if (noeud.nodeType === Node.TEXT_NODE) {
      return (noeud.textContent ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    if (noeud.nodeType !== Node.ELEMENT_NODE) return '';

    const element = noeud as HTMLElement;
    const enfants = Array.from(element.childNodes).map(traduire).join('');

    // Le navigateur exprime le gras de trois façons selon la version.
    const style = element.getAttribute('style') ?? '';
    if (element.tagName === 'B' || /font-weight:\s*(bold|[6-9]00)/.test(style)) {
      return enfants ? `<strong>${enfants}</strong>` : '';
    }
    if (element.tagName === 'I' || /font-style:\s*italic/.test(style)) {
      return enfants ? `<em>${enfants}</em>` : '';
    }

    if (element.tagName === 'A') {
      const href = element.getAttribute('href') ?? '';
      // Seuls http, https et mailto : un « javascript: » n'a rien à faire ici.
      const propre = /^(https?:|mailto:)/i.test(href) ? href : '';
      if (!propre) return enfants;
      return `<a href="${propre.replace(/"/g, '&quot;')}">${enfants}</a>`;
    }

    if (!BALISES_AUTORISEES.has(element.tagName)) {
      // DIV et SPAN disparaissent en laissant leur contenu.
      return enfants;
    }

    if (element.tagName === 'BR') return '<br />';
    if (!enfants.trim()) return '';
    return `<${element.tagName.toLowerCase()}>${enfants}</${element.tagName.toLowerCase()}>`;
  };

  const html = Array.from(racine.childNodes).map(traduire).join('');

  /*
   * Le texte saisi sans mise en forme arrive sans balise de bloc. Sans
   * paragraphe, un courriel affiche tout d'un seul tenant.
   */
  return /^\s*<(p|h2|h3|ul|ol|blockquote)/i.test(html)
    ? html
    : `<p>${html}</p>`;
}

interface Outil {
  libelle: string;
  titre: string;
  commande: string;
  valeur?: string;
}

const OUTILS: Outil[] = [
  { libelle: 'Gras', titre: 'Mettre en gras', commande: 'bold' },
  { libelle: 'Italique', titre: 'Mettre en italique', commande: 'italic' },
  { libelle: 'Titre', titre: 'Transformer en titre', commande: 'formatBlock', valeur: 'h2' },
  {
    libelle: 'Sous-titre',
    titre: 'Transformer en sous-titre',
    commande: 'formatBlock',
    valeur: 'h3',
  },
  { libelle: 'Paragraphe', titre: 'Revenir au texte normal', commande: 'formatBlock', valeur: 'p' },
  { libelle: 'Liste', titre: 'Créer une liste à puces', commande: 'insertUnorderedList' },
  { libelle: 'Citation', titre: 'Mettre en citation', commande: 'formatBlock', valeur: 'blockquote' },
];

export function EditeurTexte({
  valeur,
  onChange,
  placeholder = 'Écrivez votre message…',
  hauteur = 'min-h-[260px]',
}: {
  valeur: string;
  onChange: (html: string) => void;
  placeholder?: string;
  hauteur?: string;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const [vide, setVide] = useState(!valeur);

  /*
   * Le HTML n'est injecté qu'au montage et lorsqu'il change depuis l'extérieur.
   * Le réinjecter à chaque frappe replacerait le curseur en tête de zone.
   */
  useEffect(() => {
    const element = zone.current;
    if (!element) return;
    if (element.innerHTML !== valeur) element.innerHTML = valeur;
    setVide(!element.textContent?.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remonter = useCallback(() => {
    const element = zone.current;
    if (!element) return;
    setVide(!element.textContent?.trim());
    onChange(element.textContent?.trim() ? nettoyer(element) : '');
  }, [onChange]);

  function appliquer(outil: Outil) {
    zone.current?.focus();
    document.execCommand(outil.commande, false, outil.valeur);
    remonter();
  }

  function ajouterLien() {
    const url = window.prompt('Adresse du lien (https://…)');
    if (!url) return;
    if (!/^(https?:|mailto:)/i.test(url)) {
      window.alert('Le lien doit commencer par https:// ou mailto:');
      return;
    }
    zone.current?.focus();
    document.execCommand('createLink', false, url);
    remonter();
  }

  return (
    <div className="overflow-hidden rounded-carte border border-admin-trait bg-white transition-colors duration-150 focus-within:border-admin-vert focus-within:ring-1 focus-within:ring-admin-vert">
      <div className="flex flex-wrap gap-1.5 border-b border-admin-trait bg-admin-fond px-3 py-2.5">
        {OUTILS.map((outil) => (
          <button
            key={outil.libelle}
            type="button"
            title={outil.titre}
            /* `onMouseDown` : un clic ne doit pas faire perdre la sélection. */
            onMouseDown={(evenement) => evenement.preventDefault()}
            onClick={() => appliquer(outil)}
            className="rounded-full border border-admin-trait bg-white px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150 hover:border-admin-encre hover:bg-admin-fond"
          >
            {outil.libelle}
          </button>
        ))}
        <button
          type="button"
          title="Insérer un lien"
          onMouseDown={(evenement) => evenement.preventDefault()}
          onClick={ajouterLien}
          className="rounded-full border border-admin-trait bg-white px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150 hover:border-admin-encre hover:bg-admin-fond"
        >
          Lien
        </button>
      </div>

      <div className="relative">
        {vide && (
          <span className="pointer-events-none absolute left-4 top-3.5 text-sm text-admin-gris">
            {placeholder}
          </span>
        )}
        <div
          ref={zone}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Corps du message"
          onInput={remonter}
          onBlur={remonter}
          /*
           * Un collage depuis Word apporte des feuilles de style entières.
           * On ne garde que le texte ; la mise en forme se refait au clavier.
           */
          onPaste={(evenement) => {
            evenement.preventDefault();
            const texte = evenement.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, texte);
          }}
          className={`article-contenu ${hauteur} w-full px-4 py-3.5 text-sm leading-relaxed text-admin-encre focus:outline-none`}
        />
      </div>
    </div>
  );
}
