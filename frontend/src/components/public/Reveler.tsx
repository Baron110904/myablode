'use client';

import { useEffect, useRef, useState } from 'react';
import { useAnimationsReduites } from '@/hooks/useAnimationsReduites';

/**
 * Révèle son contenu quand il entre dans le champ de vision.
 *
 * L'observation s'arrête au premier déclenchement : une section déjà lue ne
 * doit pas rejouer son apparition si l'on remonte la page.
 */
export function Reveler({
  children,
  delai = 0,
  as: Balise = 'div',
  className = '',
}: {
  children: React.ReactNode;
  /** Décalage en millisecondes, pour révéler une liste en cascade. */
  delai?: number;
  as?: 'div' | 'section' | 'li' | 'article';
  className?: string;
}) {
  const reference = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const animationsReduites = useAnimationsReduites();

  useEffect(() => {
    if (animationsReduites) {
      setVisible(true);
      return;
    }

    const element = reference.current;
    if (!element) return;

    // Navigateur sans IntersectionObserver : on affiche sans animer.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees[0]?.isIntersecting) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      // Déclenche un peu avant l'entrée réelle : l'animation est terminée
      // quand l'élément arrive au centre du regard.
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [animationsReduites]);

  return (
    <Balise
      ref={reference as never}
      style={visible && delai ? { transitionDelay: `${delai}ms` } : undefined}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
    >
      {children}
    </Balise>
  );
}
