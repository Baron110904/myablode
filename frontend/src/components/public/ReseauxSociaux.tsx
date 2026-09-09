import Image from 'next/image';
import { RESEAUX_SOCIAUX } from '@/lib/association';

/**
 * Liens vers les réseaux de l'association.
 *
 * Les logos sont des images fournies par l'association plutôt que des icônes
 * redessinées : Facebook, Instagram et WhatsApp imposent l'usage de leurs
 * marques telles quelles.
 */
export function ReseauxSociaux({
  taille = 22,
  variante = 'clair',
  avecLibelles = false,
}: {
  taille?: number;
  variante?: 'clair' | 'sombre';
  avecLibelles?: boolean;
}) {
  const sombre = variante === 'sombre';

  return (
    <ul className="flex flex-wrap items-center gap-2.5">
      {RESEAUX_SOCIAUX.map((reseau) => (
        <li key={reseau.nom}>
          <a
            href={reseau.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={reseau.action}
            title={reseau.action}
            className={`group inline-flex items-center gap-2.5 border px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
              sombre
                ? 'border-white/20 hover:border-white/50 hover:bg-white/5'
                : 'border-ablode-trait bg-white hover:border-ablode-encre'
            }`}
          >
            <Image
              src={reseau.logo}
              alt=""
              width={taille}
              height={taille}
              className="h-auto w-auto transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100"
              style={{ maxHeight: taille, maxWidth: taille }}
            />
            {avecLibelles && (
              <span
                className={`font-mono text-etiquette uppercase ${
                  sombre ? 'text-white/80' : 'text-ablode-encre'
                }`}
              >
                {reseau.nom}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
