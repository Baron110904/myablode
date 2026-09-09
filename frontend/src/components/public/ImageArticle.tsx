import Image from 'next/image';

/**
 * Illustration d'article, avec repli sur un motif discret.
 *
 * Les fichiers déposés dans `public/` pèsent parfois plusieurs mégaoctets :
 * `next/image` les redimensionne et les convertit en WebP à la demande, ce
 * qui est indispensable pour tenir la cible de 1,5 s en 3G. Les URL externes
 * échappent à cette optimisation et sont servies telles quelles.
 */
export function ImageArticle({
  src,
  alt = '',
  hauteur,
  largeur = 640,
  priorite = false,
  className = '',
}: {
  src: string | null;
  alt?: string;
  hauteur: number;
  largeur?: number;
  priorite?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={`w-full ${className}`}
        style={{
          height: hauteur,
          backgroundImage:
            'repeating-linear-gradient(45deg, #eef1ef 0 6px, #f7f9f8 6px 12px)',
        }}
      />
    );
  }

  const locale = src.startsWith('/');

  if (!locale) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        loading={priorite ? 'eager' : 'lazy'}
        className={`w-full object-cover ${className}`}
        style={{ height: hauteur }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={largeur}
      height={hauteur}
      priority={priorite}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
      className={`w-full object-cover ${className}`}
      style={{ height: hauteur }}
    />
  );
}
