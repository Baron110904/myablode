'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { ApiError, televerser } from '@/lib/api';

/**
 * Éditeur du corps d'un article.
 *
 * Le contenu d'un article se tapait en HTML dans une zone de texte : écrire
 * une actualité supposait de connaître les balises, ce qui réservait la
 * rédaction aux informaticiens. La mise en forme se fait désormais comme
 * dans un traitement de texte, et le HTML n'est plus qu'un format de
 * stockage.
 *
 * Le jeu d'outils s'arrête à la structure du texte : titres, emphase,
 * listes, liens, images. Ni police, ni corps, ni couleur - la feuille de
 * style du site les impose, et les ouvrir au rédacteur ferait diverger
 * l'allure des articles les uns des autres au fil des années.
 *
 * Ce que produit l'éditeur passe encore par l'assainissement du serveur :
 * c'est lui qui fait autorité, l'éditeur ne fait que limiter ce qu'on peut
 * composer.
 *
 * Distinct de EditeurTexte, qui compose les courriels de la newsletter : un
 * courriel et une page web n'acceptent pas le même HTML, et les clients de
 * messagerie imposent des contraintes qui n'ont pas cours ici.
 */
export function EditeurContenu({
  valeur,
  onChange,
  desactive = false,
}: {
  valeur: string;
  onChange: (html: string) => void;
  desactive?: boolean;
}) {
  const champFichier = useRef<HTMLInputElement>(null);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState('');
  const [saisieLien, setSaisieLien] = useState<string | null>(null);

  const editeur = useEditor({
    /*
     * Le rendu est repoussé au client. ProseMirror lit le document pour
     * poser sa sélection ; rendu sur le serveur, il produit un balisage que
     * React retrouve différent à l'hydratation.
     */
    immediatelyRender: false,
    editable: !desactive,
    extensions: [
      StarterKit.configure({
        // La page publique n'habille que h2, h3 et h4 : proposer un h1
        // mettrait dans l'article un titre concurrent de celui de la page.
        heading: { levels: [2, 3] },
        // Le site ne publie pas de code source.
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        },
      }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: valeur,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        /*
         * La même classe que la page publique : le rédacteur compose dans
         * la typographie du site, pas dans celle du formulaire. C'est ce
         * qui rend l'aperçu inutile.
         */
        class: 'article-contenu min-h-[420px] px-6 py-5 focus:outline-none [&_img]:my-4',
      },
    },
  });

  /*
   * Le parent reste maître du contenu : il le réécrit après enregistrement,
   * avec la version assainie par le serveur. La comparaison évite de
   * replacer le document à chaque frappe - ce qui ramènerait le curseur au
   * début à chaque lettre tapée.
   */
  useEffect(() => {
    if (!editeur || editeur.isDestroyed) return;
    if (valeur !== editeur.getHTML()) {
      editeur.commands.setContent(valeur, { emitUpdate: false });
    }
  }, [valeur, editeur]);

  useEffect(() => {
    editeur?.setEditable(!desactive);
  }, [desactive, editeur]);

  if (!editeur) {
    return <div className="admin-squelette h-[480px] rounded-carte" />;
  }

  async function deposerImage(fichier: File | null) {
    if (!fichier || !editeur) return;
    setErreur('');
    setEnvoiImage(true);
    setProgression(0);

    const corps = new FormData();
    corps.append('fichier', fichier);

    try {
      const image = await televerser<{ url: string }>('/images', {
        formData: corps,
        onProgression: setProgression,
      });
      editeur.chain().focus().setImage({ src: image.url }).run();
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Dépôt impossible.',
      );
    } finally {
      setEnvoiImage(false);
      // Sans cela, redéposer le même fichier ne relance pas l'évènement.
      if (champFichier.current) champFichier.current.value = '';
    }
  }

  function validerLien(adresse: string) {
    const propre = adresse.trim();
    setSaisieLien(null);
    if (!propre) {
      editeur?.chain().focus().unsetLink().run();
      return;
    }
    editeur?.chain().focus().setLink({ href: completerAdresse(propre) }).run();
  }

  const bloc = editeur.isActive('heading', { level: 2 })
    ? 'h2'
    : editeur.isActive('heading', { level: 3 })
      ? 'h3'
      : 'p';

  return (
    <div>
      <div className="overflow-hidden rounded-carte border border-admin-trait bg-white transition-colors duration-150 focus-within:border-admin-vert focus-within:ring-1 focus-within:ring-admin-vert">
        <div className="flex flex-wrap items-center gap-1 border-b border-admin-trait bg-admin-fond px-2.5 py-2">
          <Outil
            titre="Annuler"
            onClick={() => editeur.chain().focus().undo().run()}
            inactif={!editeur.can().undo()}
          >
            <IconeAnnuler />
          </Outil>
          <Outil
            titre="Rétablir"
            onClick={() => editeur.chain().focus().redo().run()}
            inactif={!editeur.can().redo()}
          >
            <IconeRetablir />
          </Outil>

          <Separateur />

          <label className="sr-only" htmlFor="niveau-texte">
            Niveau du texte
          </label>
          <select
            id="niveau-texte"
            value={bloc}
            disabled={desactive}
            onChange={(e) => {
              const choix = e.target.value;
              const chaine = editeur.chain().focus();
              if (choix === 'p') chaine.setParagraph().run();
              else chaine.setHeading({ level: choix === 'h2' ? 2 : 3 }).run();
            }}
            className="h-8 rounded-full border border-admin-trait bg-white px-3 text-[0.8125rem] font-medium text-admin-encre focus:border-admin-vert focus:outline-none"
          >
            <option value="p">Texte normal</option>
            <option value="h2">Titre</option>
            <option value="h3">Sous-titre</option>
          </select>

          <Separateur />

          <Outil
            titre="Gras"
            actif={editeur.isActive('bold')}
            onClick={() => editeur.chain().focus().toggleBold().run()}
          >
            <span className="font-bold">G</span>
          </Outil>
          <Outil
            titre="Italique"
            actif={editeur.isActive('italic')}
            onClick={() => editeur.chain().focus().toggleItalic().run()}
          >
            <span className="font-serif italic">I</span>
          </Outil>
          <Outil
            titre="Souligné"
            actif={editeur.isActive('underline')}
            onClick={() => editeur.chain().focus().toggleUnderline().run()}
          >
            <span className="underline underline-offset-2">S</span>
          </Outil>

          <Separateur />

          {(
            [
              ['left', 'Aligner à gauche'],
              ['center', 'Centrer'],
              ['right', 'Aligner à droite'],
            ] as const
          ).map(([sens, titre]) => (
            <Outil
              key={sens}
              titre={titre}
              actif={editeur.isActive({ textAlign: sens })}
              onClick={() => editeur.chain().focus().setTextAlign(sens).run()}
            >
              <IconeAlignement sens={sens} />
            </Outil>
          ))}

          <Separateur />

          <Outil
            titre="Liste à puces"
            actif={editeur.isActive('bulletList')}
            onClick={() => editeur.chain().focus().toggleBulletList().run()}
          >
            <IconeListe numerotee={false} />
          </Outil>
          <Outil
            titre="Liste numérotée"
            actif={editeur.isActive('orderedList')}
            onClick={() => editeur.chain().focus().toggleOrderedList().run()}
          >
            <IconeListe numerotee />
          </Outil>
          <Outil
            titre="Citation"
            actif={editeur.isActive('blockquote')}
            onClick={() => editeur.chain().focus().toggleBlockquote().run()}
          >
            <span className="text-[1.1rem] leading-none">”</span>
          </Outil>

          <Separateur />

          <Outil
            titre="Insérer un lien"
            actif={editeur.isActive('link')}
            onClick={() =>
              setSaisieLien((courant) =>
                courant === null
                  ? (editeur.getAttributes('link').href as string) || ''
                  : null,
              )
            }
          >
            <IconeLien />
          </Outil>
          <Outil
            titre="Insérer une image"
            inactif={envoiImage}
            onClick={() => champFichier.current?.click()}
          >
            {envoiImage ? (
              <span className="text-[0.6875rem] tabular-nums">{progression}%</span>
            ) : (
              <IconeImage />
            )}
          </Outil>
        </div>

        {saisieLien !== null && (
          <BarreLien
            valeurInitiale={saisieLien}
            onValider={validerLien}
            onAnnuler={() => setSaisieLien(null)}
          />
        )}

        <EditorContent editor={editeur} />
      </div>

      {/* Ouvert par le bouton de la barre, donc retiré du parcours clavier. */}
      <input
        ref={champFichier}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void deposerImage(e.target.files?.[0] ?? null)}
        disabled={desactive || envoiImage}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      {erreur && <p className="mt-2 text-[0.8125rem] text-admin-alerte">{erreur}</p>}
    </div>
  );
}

/** Saisie d'adresse, dépliée sous la barre d'outils. */
function BarreLien({
  valeurInitiale,
  onValider,
  onAnnuler,
}: {
  valeurInitiale: string;
  onValider: (adresse: string) => void;
  onAnnuler: () => void;
}) {
  const [adresse, setAdresse] = useState(valeurInitiale);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-admin-trait bg-white px-3 py-2.5">
      <label htmlFor="adresse-lien" className="etiquette-douce">
        Adresse
      </label>
      <input
        id="adresse-lien"
        type="text"
        autoFocus
        value={adresse}
        onChange={(e) => setAdresse(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onValider(adresse);
          }
          if (e.key === 'Escape') onAnnuler();
        }}
        placeholder="ablode.bj ou https://…"
        className="admin-champ h-8 min-w-[12rem] flex-1 py-0 text-[0.8125rem]"
      />
      <button
        type="button"
        onClick={() => onValider(adresse)}
        className="admin-bouton h-8 px-4 py-0 text-[0.8125rem]"
      >
        Appliquer
      </button>
      <button
        type="button"
        onClick={() => onValider('')}
        className="text-[0.8125rem] font-semibold text-admin-gris hover:underline"
      >
        Retirer
      </button>
    </div>
  );
}

function Outil({
  titre,
  actif = false,
  inactif = false,
  onClick,
  children,
}: {
  titre: string;
  actif?: boolean;
  inactif?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      disabled={inactif}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.875rem] transition-colors duration-150 disabled:opacity-40 ${
        actif
          ? 'bg-admin-nuit text-white'
          : 'text-admin-encre hover:bg-admin-trait/60'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Complète une adresse saisie sans schéma.
 *
 * « ablode.bj » tapé tel quel est lu comme un chemin du site : le lien
 * menait vers /admin/ablode.bj. Les schémas déjà écrits sont laissés
 * intacts, mailto: et tel: compris, qu'un rédacteur peut vouloir.
 */
export function completerAdresse(adresse: string): string {
  const propre = adresse.trim();
  if (!propre) return '';
  return /^(https?:|mailto:|tel:)/i.test(propre) ? propre : `https://${propre}`;
}

function Separateur() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-admin-trait" />;
}

/* ─── Icônes ──────────────────────────────────────────────────────────── */

const TRAIT = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function IconeAnnuler() {
  return (
    <svg {...TRAIT} aria-hidden>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function IconeRetablir() {
  return (
    <svg {...TRAIT} aria-hidden>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}

function IconeAlignement({ sens }: { sens: 'left' | 'center' | 'right' }) {
  const courtes =
    sens === 'left'
      ? ['M3 6h18', 'M3 12h10', 'M3 18h14']
      : sens === 'center'
        ? ['M3 6h18', 'M7 12h10', 'M5 18h14']
        : ['M3 6h18', 'M11 12h10', 'M7 18h14'];
  return (
    <svg {...TRAIT} aria-hidden>
      {courtes.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function IconeListe({ numerotee }: { numerotee: boolean }) {
  return (
    <svg {...TRAIT} aria-hidden>
      <path d="M9 6h12" />
      <path d="M9 12h12" />
      <path d="M9 18h12" />
      {numerotee ? (
        <>
          <path d="M4 6V4h1" />
          <path d="M3 12h2l-2 2h2" />
          <path d="M3 17h2v3H3" />
        </>
      ) : (
        <>
          <circle cx="4.5" cy="6" r="1" fill="currentColor" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function IconeLien() {
  return (
    <svg {...TRAIT} aria-hidden>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function IconeImage() {
  return (
    <svg {...TRAIT} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5L5 20" />
    </svg>
  );
}
