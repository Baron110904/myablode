import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionVideos } from './SectionVideos';
import type { OrientationVideo, Video } from '@/lib/types';

function video(id: number, titre: string, orientation: OrientationVideo): Video {
  return {
    id,
    titre,
    description: null,
    categorie: 'evenement',
    fichier_url: `/uploads/videos/${id}.mp4`,
    fichier_nom: `${id}.mp4`,
    taille: '2048',
    mime: 'video/mp4',
    miniature_url: null,
    duree_secondes: null,
    orientation,
    statut: 'published',
    a_la_une: false,
    date_publication: '2026-11-16T09:00:00Z',
    created_at: '2026-11-16T09:00:00Z',
  };
}

/** Le cadre du lecteur principal, qui porte le rapport de forme. */
function cadreDuLecteur(conteneur: HTMLElement): HTMLElement {
  const bouton = screen.getByRole('button', { name: /Lire la vidéo/ });
  const cadre = bouton.parentElement;
  if (!cadre) throw new Error('cadre du lecteur introuvable');
  expect(conteneur).toContainElement(cadre);
  return cadre;
}

describe('SectionVideos', () => {
  it('compose une vidéo paysage dans un cadre 16:9', () => {
    const { container } = render(
      <SectionVideos videos={[video(1, 'Conférence de presse', 'paysage')]} />,
    );

    expect(cadreDuLecteur(container).className).toContain('aspect-video');
  });

  /*
   * Le reproche d'origine : filmée au téléphone, la vidéo se retrouvait
   * encadrée de deux larges bandes noires dans un cadre 16:9.
   */
  it('donne son propre cadre à une vidéo portrait', () => {
    const { container } = render(
      <SectionVideos videos={[video(2, 'Marche Sucre à terre', 'portrait')]} />,
    );

    const classes = cadreDuLecteur(container).className;
    expect(classes).toContain('aspect-[9/16]');
    expect(classes).not.toContain('aspect-video');
  });

  /*
   * En 9:16 sur toute la colonne, le lecteur ferait plus de mille pixels de
   * haut. La largeur bornée est donc ce qui rend le cadre portrait tenable,
   * pas une préférence d'habillage.
   */
  it('borne la largeur du cadre portrait', () => {
    const { container } = render(
      <SectionVideos videos={[video(3, 'Témoignage', 'portrait')]} />,
    );

    expect(cadreDuLecteur(container).className).toContain('max-w-[20rem]');
  });

  /*
   * Tant que l'API tourne sur une version antérieure, elle ne renvoie pas du
   * tout l'orientation. La page doit alors composer comme avant, pas tomber.
   */
  it('retombe sur le paysage quand l’orientation manque', () => {
    const sansOrientation = video(6, 'Ancienne fiche', 'paysage');
    delete (sansOrientation as Partial<Video>).orientation;

    const { container } = render(<SectionVideos videos={[sansOrientation]} />);

    expect(cadreDuLecteur(container).className).toContain('aspect-video');
  });

  it('compose chaque vignette de la liste selon sa propre orientation', () => {
    render(
      <SectionVideos
        videos={[
          video(4, 'À la une', 'paysage'),
          video(5, 'Filmée au téléphone', 'portrait'),
        ]}
      />,
    );

    // La première occupe le grand lecteur ; la seconde est dans la liste.
    const entree = screen.getByRole('button', { name: /Filmée au téléphone/ });
    const vignette = entree.querySelector('span');
    expect(vignette?.className).toContain('aspect-[9/16]');
  });
});
