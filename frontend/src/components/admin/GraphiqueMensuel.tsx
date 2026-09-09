'use client';

import { Bar } from 'react-chartjs-2';
import { COULEURS, enregistrerChartJs } from '@/components/graphiques/enregistrer-chartjs';
import { moisAnnee, nombre } from '@/lib/format';
import type { PointEvolution } from '@/lib/types';

enregistrerChartJs();

/**
 * Histogramme empilé du tableau de bord : cas détectés à l'intérieur du
 * total des dépistages, comme sur la maquette 05.
 */
export function GraphiqueMensuel({ donnees }: { donnees: PointEvolution[] }) {
  if (donnees.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center bg-admin-fond">
        <span className="font-mono text-etiquette uppercase text-admin-gris">
          Aucune donnée
        </span>
      </div>
    );
  }

  return (
    <div className="h-[320px]">
      <Bar
        data={{
          labels: donnees.map((point) => moisAnnee(point.periode)),
          datasets: [
            {
              label: 'Cas détectés',
              data: donnees.map((point) => point.cas),
              backgroundColor: COULEURS.vert,
              stack: 'total',
              barPercentage: 0.55,
              categoryPercentage: 0.8,
            },
            {
              label: 'Dépistages sans cas',
              // Empilé au-dessus des cas : la hauteur totale reste le nombre
              // de dépistages, la part verte se lit comme la part de cas.
              data: donnees.map((point) => Math.max(0, point.depistages - point.cas)),
              backgroundColor: COULEURS.voile,
              stack: 'total',
              barPercentage: 0.55,
              categoryPercentage: 0.8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (contexte) => {
                  const point = donnees[contexte.dataIndex];
                  return contexte.datasetIndex === 0
                    ? `Cas détectés : ${nombre(point.cas)}`
                    : `Dépistages : ${nombre(point.depistages)}`;
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              border: { color: '#e6e9e7' },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: '#f0f2f1' },
              border: { display: false },
              ticks: { callback: (valeur) => nombre(Number(valeur)) },
            },
          },
        }}
      />
    </div>
  );
}
