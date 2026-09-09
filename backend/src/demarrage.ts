/**
 * Signal de démarrage, affiché avant tout chargement lourd.
 *
 * Node met une trentaine de secondes à une minute et demie à charger les
 * modules de l'application sur un poste où l'antivirus inspecte chaque fichier
 * de `node_modules`. Pendant ce temps, Nest n'a encore rien journalisé : la
 * console reste vide et le serveur paraît planté, alors qu'il charge.
 *
 * Ce fichier n'importe **rien** — c'est ce qui lui permet de s'exécuter
 * immédiatement. Il doit rester importé en tête de `main.ts`, juste après
 * `./fuseau`, et ne jamais gagner de dépendance : le premier `import` ajouté
 * ici retarderait le message qu'il est censé afficher tôt.
 */

const debut = Date.now();

process.stdout.write(
  'MyABLODE — chargement des modules…\n' +
    'Le premier démarrage peut demander une minute ou deux, sans affichage.\n',
);

/** Durée écoulée depuis le lancement du processus, en secondes. */
export function secondesDepuisLancement(): number {
  return Math.round((Date.now() - debut) / 1000);
}
