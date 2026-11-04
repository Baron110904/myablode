'use client';

import Image from 'next/image';
import { useState } from 'react';
import { urlMedia } from '@/lib/api';
import { date, duree, LIBELLES_CATEGORIE_VIDEO } from '@/lib/format';
import type { Video } from '@/lib/types';

/**
 * Section « Nos actions en vidéo ».
 *
 * Un grand lecteur à gauche, la liste des autres vidéos à droite. Rien n'est
 * chargé avant le clic : `preload="metadata"` ne tire que l'en-tête du
 * fichier, de quoi afficher une image d'attente et la durée. Charger quatre
 * vidéos complètes à l'ouverture de la page coûterait plusieurs centaines de
 * mégaoctets à un visiteur qui n'en regardera peut-être aucune.
 */
export function SectionVideos({ videos }: { videos: Video[] }) {
  const [selection, setSelection] = useState(0);
  const [lecture, setLecture] = useState(false);

  if (videos.length === 0) return null;

  const principale = videos[selection] ?? videos[0];
  const autres = videos.filter((_, index) => index !== selection);

  function choisir(index: number) {
    setSelection(index);
    setLecture(false);
  }

  return (
    <section className="bg-ablode-profond">
      <div className="conteneur py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-etiquette uppercase text-ablode-vert-clair">
              En images
            </p>
            <h2 className="mt-3 titre-section text-white">Nos actions en vidéo</h2>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* ─── Lecteur principal ───────────────────────────────────── */}
          <div>
            <div className="relative aspect-video overflow-hidden rounded-carte bg-black">
              {lecture ? (
                /*
                  `autoPlay` plutôt qu'un `play()` appelé après le rendu : la
                  politique de lecture automatique des navigateurs exige que
                  le démarrage découle du geste de l'utilisateur. Un appel
                  reporté — à l'image suivante, dans un effet — sort de cette
                  chaîne et se fait refuser, laissant un lecteur figé.
                */
                <video
                  key={principale.id}
                  src={urlMedia(principale.fichier_url)}
                  poster={principale.miniature_url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full"
                >
                  Votre navigateur ne peut pas lire cette vidéo.{' '}
                  <a href={urlMedia(principale.fichier_url)}>Télécharger le fichier</a>.
                </video>
              ) : (
                <button
                  type="button"
                  onClick={() => setLecture(true)}
                  className="group absolute inset-0 h-full w-full"
                  aria-label={`Lire la vidéo « ${principale.titre} »`}
                >
                  <Apercu video={principale} />

                  {/* Voile sombre : le texte posé dessus reste lisible. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10"
                  />

                  <span
                    aria-hidden
                    className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ablode-vert text-white shadow-relief transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                  >
                    <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>

                  <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2.5 p-6 text-left">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-ablode-vert px-3 py-1 text-[0.75rem] font-semibold text-white">
                        {LIBELLES_CATEGORIE_VIDEO[principale.categorie]}
                      </span>
                      {principale.date_publication && (
                        <span className="text-[0.8125rem] text-white/75">
                          {date(principale.date_publication)}
                        </span>
                      )}
                    </span>
                    <span className="text-xl font-bold leading-snug text-white sm:text-2xl">
                      {principale.titre}
                    </span>
                  </span>

                  {principale.duree_secondes !== null && (
                    <span className="absolute bottom-6 right-6 rounded-full bg-black/70 px-2.5 py-1 text-[0.75rem] tabular-nums text-white">
                      {duree(principale.duree_secondes)}
                    </span>
                  )}
                </button>
              )}
            </div>

            {principale.description && (
              <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-white/65">
                {principale.description}
              </p>
            )}
          </div>

          {/* ─── Autres vidéos ───────────────────────────────────────── */}
          {autres.length > 0 && (
            <ul className="space-y-3">
              {autres.map((video) => {
                const index = videos.indexOf(video);
                return (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => choisir(index)}
                      className="group flex w-full items-center gap-4 rounded-carte bg-white/[0.04] p-3 text-left ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/[0.09]"
                    >
                      <span className="relative aspect-video w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-black">
                        <Apercu video={video} />
                        {video.duree_secondes !== null && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-white">
                            {duree(video.duree_secondes)}
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.625rem] uppercase tracking-[0.1em] text-ablode-vert-clair">
                          {LIBELLES_CATEGORIE_VIDEO[video.categorie]}
                        </span>
                        <span className="mt-1.5 block text-[0.875rem] font-semibold leading-snug text-white">
                          {video.titre}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Image d'attente d'une vidéo.
 *
 * Sans miniature fournie, on affiche la vidéo elle-même arrêtée sur une
 * image : le fragment `#t=0.1` demande au navigateur de se placer juste
 * après le début, parce que la toute première image d'un montage est
 * souvent noire.
 */
function Apercu({ video }: { video: Video }) {
  if (video.miniature_url) {
    return (
      <Image
        src={video.miniature_url}
        alt=""
        fill
        // Adresse saisie au back-office : elle peut pointer n'importe où, et
        // l'optimiseur de Next refuse les hôtes qu'il ne connaît pas.
        unoptimized
        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
      />
    );
  }

  return (
    <video
      src={`${urlMedia(video.fichier_url)}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      aria-hidden
      tabIndex={-1}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
    />
  );
}
