/**
 * Compare deux contenus d'article sans s'arrêter à l'écriture des balises.
 *
 * Le serveur renvoie le contenu qu'il a réellement enregistré, et le
 * formulaire prévient l'auteur quand il diffère de sa saisie : c'est ainsi
 * qu'on signale une mise en forme refusée. Mais l'assainisseur réécrit les
 * balises orphelines en forme auto-fermante - « <img> » devient
 * « <img /> » - alors que l'éditeur les produit sans barre oblique. Comparer
 * les chaînes brutes annonçait donc une perte de mise en forme à chaque
 * article contenant une image, un saut de ligne ou un filet.
 *
 * Les deux écritures sont équivalentes en HTML. On les ramène à la même
 * avant de comparer ; une balise réellement retirée fait toujours diverger
 * les deux textes.
 */
export function memeContenu(a: string, b: string): boolean {
  return normaliser(a) === normaliser(b);
}

function normaliser(html: string): string {
  return html.replace(/\s*\/>/g, '>').trim();
}
