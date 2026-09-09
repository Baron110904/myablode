import Image from 'next/image';
import Link from 'next/link';

export function Logo({
  taille = 40,
  avecTexte = false,
  href = '/',
}: {
  taille?: number;
  avecTexte?: boolean;
  href?: string | null;
}) {
  const contenu = (
    <span className="inline-flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="ABLODE"
        width={taille * 2}
        height={taille}
        priority
        className="h-auto w-auto"
        style={{ maxHeight: taille }}
      />
      {avecTexte && (
        <span className="font-mono text-etiquette-lg uppercase text-ablode-encre">
          MyABLODE
        </span>
      )}
    </span>
  );

  if (!href) return contenu;

  return (
    <Link href={href} aria-label="MyABLODE — accueil" className="shrink-0">
      {contenu}
    </Link>
  );
}
