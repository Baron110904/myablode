import Image from 'next/image';
import Link from 'next/link';
import { ASSOCIATION } from '@/lib/association';

/*
 * Trois fichiers pour une seule marque.
 *
 * Le verrouillage officiel porte le nom de l'association sur trois lignes
 * sous l'emblème. Réduit à la hauteur d'un bandeau de navigation, ce nom
 * tombe à neuf pixels par ligne : il n'est plus lisible, seulement sali.
 * L'emblème seul est donc servi là où la hauteur est comptée, et le
 * verrouillage complet là où il y a la place de le lire.
 *
 * Et en deux versions, parce qu'un nom composé en noir disparaît sur le vert
 * nuit du pied de page.
 *
 * Les trois fichiers sont découpés du même original (`design/New Logo.png`),
 * seul des deux fournis à porter une vraie transparence : « Logo texte
 * blanc.png » n'a pas de canal alpha, son damier est peint dans les pixels.
 */
const VARIANTES = {
  embleme: { src: '/logo.png', largeur: 900, hauteur: 520, alt: 'ABLODE' },
  'complet-clair': {
    src: '/logo-complet.png',
    largeur: 900,
    hauteur: 684,
    alt: ASSOCIATION.nom,
  },
  'complet-sombre': {
    src: '/logo-complet-blanc.png',
    largeur: 900,
    hauteur: 684,
    alt: ASSOCIATION.nom,
  },
} as const;

export type VarianteLogo = keyof typeof VARIANTES;

export function Logo({
  taille = 56,
  variante = 'embleme',
  href = '/',
  className,
}: {
  /** Hauteur de rendu, en pixels, quand `className` n'en impose pas une. */
  taille?: number;
  variante?: VarianteLogo;
  href?: string | null;
  /** Hauteurs par palier, pour les emplacements qui suivent l'écran. */
  className?: string;
}) {
  const { src, largeur, hauteur, alt } = VARIANTES[variante];
  // Largeur déduite du rapport réel du fichier : sans elle, Next réserve une
  // boîte au mauvais format et la page tressaute au chargement de l'image.
  const largeurRendue = Math.round((taille * largeur) / hauteur);

  const image = (
    <Image
      src={src}
      alt={alt}
      width={largeurRendue}
      height={taille}
      priority
      sizes={`${largeurRendue}px`}
      className={className}
      style={className ? undefined : { height: taille, width: 'auto' }}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} aria-label="MyABLODE - accueil" className="inline-flex shrink-0 items-center">
      {image}
    </Link>
  );
}
