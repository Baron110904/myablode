import { Throttle } from '@nestjs/throttler';

/**
 * Plafond des lectures publiques.
 *
 * La limite globale de 100 requêtes par minute convient à un formulaire,
 * pas à des endpoints de consultation — et elle repose sur une hypothèse
 * fausse dans cette architecture : que chaque visiteur ait sa propre
 * adresse IP.
 *
 * Le site vitrine est rendu côté serveur. Les appels aux statistiques, aux
 * articles et au programme partent donc du serveur Next, pas du navigateur :
 * **tous les visiteurs partagent un seul compteur**. Sous l'ancien réglage,
 * cent pages rendues en une minute suffisaient à ce que le site se coupe
 * lui-même l'accès à ses propres données, et les pages retombaient
 * silencieusement sur leurs valeurs par défaut — chiffres à zéro, listes
 * vides — sans la moindre erreur visible.
 *
 * Mesuré : 10 clients simultanés produisaient 2 496 réponses 429 sur
 * 2 596 requêtes.
 *
 * Ce plafond ne protège donc pas d'un abus : c'est le cache ISR du site qui
 * limite les appels, et les limites strictes posées route par route
 * (connexion, contact, newsletter) qui protègent les formulaires. Il reste
 * comme garde-fou contre l'aspiration directe de l'API.
 */
export const ThrottleLecture = () =>
  Throttle({ default: { limit: 600, ttl: 60_000 } });
