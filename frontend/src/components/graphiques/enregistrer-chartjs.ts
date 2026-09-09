import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

/**
 * Enregistrement sélectif des modules Chart.js.
 *
 * Importer `chart.js/auto` embarquerait tous les types de graphiques (radar,
 * bulle, polaire…) dont l'application n'utilise aucun — inutile sur un site
 * ciblant un chargement sous 1,5 s en 3G.
 */
let enregistre = false;

export function enregistrerChartJs(): void {
  if (enregistre) return;
  Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    Tooltip,
    Legend,
    Filler,
  );

  Chart.defaults.font.family =
    'var(--police-titre), Segoe UI, Helvetica Neue, Arial, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#6b7671';
  Chart.defaults.plugins.tooltip.backgroundColor = '#101614';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 0;
  Chart.defaults.plugins.tooltip.displayColors = false;

  enregistre = true;
}

export const COULEURS = {
  encre: '#101614',
  vert: '#0d8f5b',
  vertClair: '#5ef29a',
  voile: '#dcf0e4',
  gris: '#c9d1cc',
};
