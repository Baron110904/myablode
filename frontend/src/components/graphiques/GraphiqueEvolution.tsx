'use client';

import { Line } from 'react-chartjs-2';
import { useTranslations } from 'next-intl';
import { COULEURS, enregistrerChartJs } from './enregistrer-chartjs';
import { moisAnnee, nombre } from '@/lib/format';
import type { PointEvolution } from '@/lib/types';

enregistrerChartJs();

/** Figure 1 de la page Résultats : dépistages et cas détectés dans le temps. */
export function GraphiqueEvolution({
  donnees,
  hauteur = 300,
}: {
  donnees: PointEvolution[];
  hauteur?: number;
}) {
  const t = useTranslations('kpi');

  if (donnees.length === 0) {
    return <EtatVide hauteur={hauteur} />;
  }

  return (
    <div style={{ height: hauteur }}>
      <Line
        data={{
          labels: donnees.map((point) => moisAnnee(point.periode)),
          datasets: [
            {
              label: t('depistages'),
              data: donnees.map((point) => point.depistages),
              borderColor: COULEURS.encre,
              backgroundColor: COULEURS.encre,
              borderWidth: 1.5,
              pointRadius: 2.5,
              pointHoverRadius: 4,
              tension: 0,
            },
            {
              label: t('cas'),
              data: donnees.map((point) => point.cas),
              borderColor: COULEURS.vert,
              backgroundColor: COULEURS.vert,
              borderWidth: 1.5,
              pointRadius: 2.5,
              pointHoverRadius: 4,
              tension: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 12,
                boxHeight: 3,
                usePointStyle: false,
                padding: 16,
              },
            },
            tooltip: {
              callbacks: {
                label: (contexte) =>
                  `${contexte.dataset.label} : ${nombre(contexte.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { color: '#e3e8e4' },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#eef1ef' },
              border: { display: false },
              ticks: { callback: (valeur) => nombre(Number(valeur)) },
            },
          },
        }}
      />
    </div>
  );
}

function EtatVide({ hauteur }: { hauteur: number }) {
  const t = useTranslations('carte');
  return (
    <div
      className="flex items-center justify-center bg-ablode-voile"
      style={{ height: hauteur }}
    >
      <span className="font-mono text-etiquette uppercase text-ablode-gris">
        {t('aucuneDonnee')}
      </span>
    </div>
  );
}
