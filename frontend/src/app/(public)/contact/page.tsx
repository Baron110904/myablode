import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FormulaireContact } from './FormulaireContact';
import { ReseauxSociaux } from '@/components/public/ReseauxSociaux';
import { ASSOCIATION, lienTelephone } from '@/lib/association';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contactez l’ABLODE : question, proposition de partenariat ou demande de ' +
    'campagne de dépistage dans votre commune.',
};

export default async function PageContact() {
  const t = await getTranslations('contact');

  return (
    <div className="conteneur py-12">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
            {t('titre')}
          </h1>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-ablode-gris">
            {t('chapeau')}
          </p>

          <div className="mt-10 border-t border-ablode-trait pt-8">
            <h2 className="etiquette">{t('coordonnees')}</h2>
            <address className="mt-4 space-y-1 text-[0.9375rem] not-italic leading-relaxed text-ablode-encre">
              <p className="font-bold">{ASSOCIATION.sigle}</p>
              <p className="text-ablode-gris">{ASSOCIATION.nom}</p>
              <p className="pt-2 text-ablode-gris">
                {ASSOCIATION.ville}, {ASSOCIATION.pays}
              </p>

            </address>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="etiquette mb-1.5">Adresse</dt>
                <dd className="text-[0.9375rem] leading-relaxed">
                  {ASSOCIATION.adresse}
                  <br />
                  {ASSOCIATION.ville}, {ASSOCIATION.pays}
                </dd>
              </div>

              <div>
                <dt className="etiquette mb-1.5">Téléphone</dt>
                <dd className="flex flex-col gap-1">
                  {ASSOCIATION.telephones.map((numero) => (
                    <a
                      key={numero}
                      href={lienTelephone(numero)}
                      className="font-mono text-[0.9375rem] text-ablode-encre transition-colors hover:text-ablode-vert"
                    >
                      {numero}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <p className="etiquette mb-3">Nous joindre en ligne</p>
              <ReseauxSociaux taille={22} avecLibelles />
            </div>
          </div>

          <div className="mt-8 border-l-2 border-ablode-vert bg-ablode-voile p-5">
            <p className="text-[0.9375rem] leading-relaxed text-ablode-encre">
              <strong>Urgence médicale ?</strong> Ce formulaire n’est pas un service de
              soins. En cas de malaise ou de symptôme préoccupant, rendez-vous directement
              dans le centre de santé le plus proche.
            </p>
          </div>
        </div>

        <FormulaireContact />
      </div>
    </div>
  );
}
