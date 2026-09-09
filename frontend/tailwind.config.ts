import type { Config } from 'tailwindcss';

/**
 * Deux systèmes visuels cohabitent dans le même projet :
 *
 * — `ablode.*` : le site vitrine. Éditorial, aéré, typographie large.
 * — `admin.*`  : le back-office. Dense, fonctionnel, aplats neutres.
 *
 * Les préfixes évitent qu'une retouche du site public déplace un pixel dans
 * l'outil de travail quotidien des équipes — et inversement.
 *
 * Les valeurs sont relevées au pixel sur les maquettes de `design/refonte`,
 * et non estimées : `nuit` #12291f est la même teinte pour la barre latérale
 * de l'administration, le pied de page et les boutons pleins.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ablode: {
          encre: '#14241d',
          /** Vert très sombre : pied de page, boutons pleins, blocs d'appel. */
          nuit: '#12291f',
          papier: '#fafcfb',
          voile: '#f7faf8',
          /** Fin du dégradé du bandeau d'accueil. */
          brume: '#dcefe5',
          trait: '#e3ebe6',
          gris: '#6b7671',
          vert: '#0d8f5b',
          'vert-clair': '#5ddc93',
          'vert-voile': '#eaf5ee',
          'vert-sombre': '#0a5f3d',
          alerte: '#c0392b',
          'alerte-voile': '#fdecea',
          ambre: '#b45309',
          'ambre-voile': '#fdf3e3',
          violet: '#7c3aed',
          'violet-voile': '#f3ecfe',
        },
        admin: {
          fond: '#f7faf8',
          panneau: '#ffffff',
          trait: '#e6ece8',
          encre: '#14241d',
          nuit: '#12291f',
          /** Élément actif de la barre latérale sombre. */
          'nuit-actif': '#2f433a',
          gris: '#71807a',
          actif: '#eaf5ee',
          vert: '#0d8f5b',
        },
        // Échelle choroplèthe : 5 paliers alignés sur la légende des maquettes
        // (< 3 %, 3–5 %, 5–8 %, 8–11 %, > 11 %).
        prevalence: {
          1: '#dcf0e4',
          2: '#a8dcc0',
          3: '#6cc496',
          4: '#2e9d68',
          5: '#12603f',
          vide: '#eef0ef',
        },
      },
      fontFamily: {
        sans: ['var(--police-titre)', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['var(--police-mono)', 'Consolas', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Libellés capitales espacées : en-têtes de tableau et intertitres.
        etiquette: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.09em' }],
        'etiquette-lg': ['0.75rem', { lineHeight: '1.1rem', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        /** Cartes et panneaux. */
        carte: '1.25rem',
        /** Modales et grands blocs. */
        bloc: '1.75rem',
      },
      maxWidth: {
        contenu: '76rem',
        lecture: '44rem',
      },
      boxShadow: {
        carte: '0 1px 2px rgba(18, 41, 31, 0.04), 0 8px 24px -16px rgba(18, 41, 31, 0.12)',
        relief: '0 2px 6px rgba(18, 41, 31, 0.06), 0 18px 40px -20px rgba(18, 41, 31, 0.18)',
        modale: '0 32px 80px -16px rgba(18, 41, 31, 0.28)',
      },
      backgroundImage: {
        /** Bandeau d'accueil : blanc à gauche, vert d'eau à droite. */
        bandeau: 'linear-gradient(105deg, #fafcfb 0%, #f4faf6 42%, #dcefe5 100%)',
      },
      keyframes: {
        apparition: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulsation: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        // Tiroir de filtres mobile : monte depuis le bas de l'écran.
        tiroir: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        /* Onde émise par une commune qui reçoit un dépistage. */
        onde: {
          '0%': { transform: 'scale(0.4)', opacity: '0.55' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        /* Battement du point « en direct ». */
        battement: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.6' },
        },
        /* Ligne du flux entrant : glisse depuis le haut. */
        'entree-flux': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        /* Bandeau défilant du terminal de suivi. */
        defilement: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        apparition: 'apparition 0.25s ease-out',
        pulsation: 'pulsation 1.6s ease-in-out infinite',
        tiroir: 'tiroir 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        onde: 'onde 1.8s cubic-bezier(0.2, 0.7, 0.3, 1) forwards',
        battement: 'battement 1.4s ease-in-out infinite',
        'entree-flux': 'entree-flux 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        defilement: 'defilement 42s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
