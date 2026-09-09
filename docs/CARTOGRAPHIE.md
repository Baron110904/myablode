# La carte : d'où viennent les données et comment elle est construite

Document technique répondant à trois questions : d'où viennent les contours des
communes, comment les couleurs sont calculées, et quelles sont les limites
d'interprétation.

---

## 1. Les contours des 77 communes

### Source

Les frontières proviennent de **[geoBoundaries](https://www.geoboundaries.org/)**,
un projet de recherche du *William & Mary geoLab* (Virginie, États-Unis) qui
publie les découpages administratifs de tous les pays du monde en données
ouvertes.

| | |
|---|---|
| Jeu de données | `geoBoundaries-BEN-ADM2` (version simplifiée) |
| Niveau administratif | ADM2 = communes |
| Nombre d'entités | 77 |
| Licence | Open Data Commons Open Database License (ODbL) |
| Format | GeoJSON, projection WGS 84 (EPSG:4326) |
| Poids | ~173 Ko |
| Emplacement dans le projet | `backend/data/benin-communes.geojson` |

**Pourquoi ADM2 ?** Le Bénin compte trois niveaux administratifs :

- **ADM1** — 12 départements (Alibori, Atacora, Atlantique…)
- **ADM2** — **77 communes** ← le niveau retenu
- **ADM3** — 546 arrondissements

Les spécifications demandent une carte « par commune », et les campagnes de
dépistage sont organisées à cette échelle. Le niveau arrondissement aurait
produit des effectifs trop faibles par zone pour que les taux aient un sens.

**Et les départements ?** Ils sont affichés vus de loin (voir « Deux niveaux »
plus bas), mais aucun fichier ADM1 n'est téléchargé : les 12 départements sont
reconstitués en fusionnant les communes qui les composent.

**Et les arrondissements ?** geoBoundaries publie bien un ADM3 pour le Bénin
(546 unités), mais il provient d'OpenStreetMap et non d'un découpage officiel :
le jeu de référence humanitaire COD-AB, lui, s'arrête à l'ADM2. S'y ajoute un
obstacle de données : un dépistage n'est rattaché qu'à une commune. Le passage
à l'arrondissement suppose d'abord une question de position GPS dans le
formulaire Kobo — la synchronisation lit déjà `_geolocation`.

**Et les quartiers ?** Aucun ADM4 n'est publié pour le Bénin dans les sources
ouvertes. Il faudrait s'adresser directement à l'INStaD.

**Pourquoi la version simplifiée ?** geoBoundaries publie aussi des contours
haute définition (plusieurs mégaoctets). La version simplifiée suffit
largement à l'échelle d'affichage — un pays entier sur un écran — et permet de
tenir la cible de chargement en moins de 2 secondes sur réseau 3G.

### Le référentiel des communes

Le fichier GeoJSON fournit les géométries et un nom par entité, sans accents
(`Seme-Kpodji`, `Aguegues`, `Kobli`). Le projet y ajoute deux choses, dans
`backend/src/database/seeds/communes.reference.ts` :

1. **Le nom français correct** — `Sèmè-Kpodji`, `Aguégués`, `Cobly`. C'est ce
   nom qui s'affiche partout dans l'interface.
2. **Le département de rattachement** — les 77 communes réparties dans les
   12 départements, ce que le fichier source ne fournit pas à ce niveau.

Chaque commune reçoit un code stable à quatre chiffres : les deux premiers
identifient le département, les deux suivants le rang de la commune. Ce code
sert de clé de rapprochement lors des imports.

### Ce qui est stocké en base

```sql
CREATE TABLE communes (
  id           SERIAL PRIMARY KEY,
  nom          VARCHAR(100),          -- « Sèmè-Kpodji »
  code         VARCHAR(10) UNIQUE,    -- « 1009 »
  departement  VARCHAR(60),           -- « Ouémé »
  geometry     GEOMETRY(Geometry, 4326),  -- le contour, PostGIS
  centroid_lat DOUBLE PRECISION,      -- centre pré-calculé
  centroid_lng DOUBLE PRECISION,
  population   INTEGER                -- non renseigné, voir § limites
);
CREATE INDEX idx_communes_geom ON communes USING GiST (geometry);
```

Le **centroïde est calculé une fois au chargement** (`ST_Centroid`) plutôt qu'à
chaque affichage : la carte admin place des milliers de points, un calcul
géométrique par requête serait inutilement coûteux.

L'**index GiST** accélère les requêtes spatiales — notamment la jointure entre
un point GPS de dépistage et la commune qui le contient.

---

## 2. Comment la carte est fabriquée

### Le trajet des données

```
PostGIS                    API NestJS              Navigateur
───────                    ──────────              ──────────
communes.geometry
depistages          ─┐
                     ├─→  agrégation SQL
                     │    par commune
                     │         ↓
                     │    ST_SimplifyPreserveTopology
                     │         ↓
                     │    ST_AsGeoJSON
                     │         ↓
                     └─→  cache Redis (15 min)  ─→  Leaflet
                                                    (choroplèthe)
```

### La requête

Une seule requête SQL produit le GeoJSON complet, contours et statistiques
réunis — `backend/src/modules/stats/stats.service.ts`, méthode `carteGeoJson` :

```sql
WITH agregats AS (
  SELECT c.id, c.nom, c.departement, c.geometry,
         COUNT(d.id) AS depistages,
         COUNT(d.id) FILTER (WHERE d.resultat = ANY($1)) AS cas,
         ROUND(100.0 * COUNT(d.id) FILTER (WHERE d.resultat = ANY($1))
               / NULLIF(COUNT(d.id), 0), 1) AS taux
  FROM communes c
  LEFT JOIN depistages d ON d.commune_id = c.id AND <filtres>
  GROUP BY c.id
)
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', json_agg(json_build_object(
    'type', 'Feature',
    'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geometry, 0.002))::json,
    'properties', json_build_object('nom', nom, 'taux', taux, ...)
  ))
) FROM agregats;
```

Trois points méritent explication :

- **`LEFT JOIN`** — les 77 communes apparaissent toujours, y compris celles où
  aucun dépistage n'a eu lieu. Une commune absente de la carte serait
  interprétée comme une erreur d'affichage ; une commune grise se lit comme
  « pas encore couverte ».
- **`ST_SimplifyPreserveTopology(geometry, 0.002)`** — allège les contours à
  l'envoi (tolérance ≈ 200 m) en garantissant qu'aucune frontière ne se
  chevauche ni ne laisse de trou entre communes voisines.
- **`NULLIF(COUNT(d.id), 0)`** — évite la division par zéro sur une commune sans
  dépistage.

### Le calcul du taux de prévalence

```
taux = cas détectés ÷ dépistages réalisés × 100
```

Un **« cas détecté »** est un dépistage dont le résultat est `diabete`,
`obesite` ou `autre` (endocrinopathie). Le **pré-diabète n'est pas compté**
comme un cas : c'est un facteur de risque réversible par l'alimentation et
l'activité physique, pas une maladie déclarée. Il est suivi séparément.

Cette règle est définie à un seul endroit (`RESULTATS_POSITIFS` dans
`stats.service.ts`) et vaut pour la carte, les statistiques publiques, le
tableau de bord et les exports.

### Les couleurs

Cinq paliers, repris de la maquette :

| Palier | Taux | Couleur |
|---|---|---|
| — | aucun dépistage | `#eef0ef` gris |
| 1 | < 3 % | `#dcf0e4` |
| 2 | 3 – 5 % | `#a8dcc0` |
| 3 | 5 – 8 % | `#6cc496` |
| 4 | 8 – 11 % | `#2e9d68` |
| 5 | > 11 % | `#12603f` |

La fonction `paliersPrevalence` (`frontend/src/lib/format.ts`) distingue
explicitement **« aucun dépistage »** (gris) de **« 0 % de prévalence »**
(vert le plus clair). Confondre les deux ferait passer une commune non
visitée pour une commune saine.

### Le rendu

- **Bibliothèque** : Leaflet 1.9 via react-leaflet, chargé uniquement côté
  navigateur (il manipule `window` dès l'import).
- **Fond de carte** : tuiles OpenStreetMap, affichées à 40 % d'opacité pour
  que la choroplèthe reste la couche lisible.
- **Cadrage** : ajusté automatiquement à l'emprise du pays et à la taille du
  conteneur, avec zoom fractionnaire — la carte occupe le même espace dans la
  bannière large de l'accueil et dans la colonne étroite du tableau de bord.
- **Interaction** : survol pour l'infobulle, clic pour le panneau de détail.
  Le clic ne recentre pas : on garde la vue d'ensemble.

### Le cache

Les agrégats par commune sont mis en cache Redis **15 minutes**, les chiffres
clés **5 minutes**. Le cache est vidé immédiatement après tout import, toute
synchronisation Kobo et toute modification de dépistage : les chiffres publics
ne peuvent pas rester en retard sur la base.

Si Redis est indisponible, les requêtes retombent directement sur PostgreSQL —
le site reste debout, simplement plus lent.

---

## 3. Le rattachement des dépistages aux communes

Un dépistage arrive avec un **nom de commune en texte libre**, saisi sur le
terrain ou renvoyé par KoboCollect. Le rapprochement se fait sur une clé
normalisée : minuscules, sans accents, sans ponctuation.

```
« SÈMÈ-KPODJI »  ─┐
« Seme Kpodji »   ├─→  « semekpodji »  ─→  commune #65
« sèmè kpodji »   ─┘
```

Côté base, la fonction `unaccent_lower` (extension PostgreSQL `unaccent`) fait
la même normalisation, avec un index dédié pour que la recherche reste rapide
sur des imports de plusieurs milliers de lignes.

Une commune non reconnue **fait rejeter la ligne** avec un motif explicite
(« Commune "Xyz" inconnue du référentiel béninois ») plutôt que d'être
rattachée au hasard ou laissée sans commune. Le rapport d'import liste ces
rejets.

Quand KoboCollect fournit des coordonnées GPS (`_geolocation`), elles sont
stockées en `GEOMETRY(Point, 4326)` et servent la couche « points
individuels » de la carte admin — jamais exposée publiquement.

---

## 4. Mettre à jour les contours

Paramètres → Géographie permet de téléverser un nouveau GeoJSON. Le
rapprochement se fait **par nom**, insensible aux accents et à la casse :
seules les géométries sont remplacées, les dépistages déjà rattachés ne sont
jamais dissociés.

Le fichier doit être une `FeatureCollection`, avec un nom de commune dans
l'une de ces propriétés : `nom`, `shapeName`, `name` ou `NAME_2`. Les entités
non reconnues sont listées dans le rapport plutôt qu'ignorées en silence.

---

## 5. Limites d'interprétation

Ce point est important, et il est rappelé sur la page Résultats comme dans les
mentions légales.

**Les taux portent sur la population dépistée, pas sur la population
générale.** Le dépistage de l'ABLODE est *opportuniste* : il touche les
personnes présentes lors d'une campagne, qui viennent souvent parce qu'elles
se savent à risque ou ressentent des symptômes. Cette population n'est pas
représentative de la commune.

Conséquences concrètes :

- Un taux de 13 % à Klouékanmè **ne signifie pas** que 13 % des habitants de
  Klouékanmè sont diabétiques.
- Comparer deux communes suppose des protocoles de campagne comparables.
- Une commune très colorée peut simplement avoir été dépistée dans un contexte
  ciblé (consultation, dispensaire) plutôt qu'en population ouverte.

**Ce que la carte montre réellement** : où l'association est passée, combien de
personnes ont été testées, et quelle proportion d'entre elles présentait un
résultat anormal. C'est un outil de **pilotage opérationnel** — où retourner,
où renforcer — pas une estimation épidémiologique.

**Le champ `population` est volontairement vide.** Le renseigner permettrait de
calculer un taux rapporté à la population communale, mais ce chiffre serait
trompeur : le dénominateur correct d'une prévalence est la population
*examinée*, pas la population *résidente*. Les données démographiques du RGPH
pourront y être versées si l'association veut afficher un taux de couverture
(part de la population atteinte par les campagnes), qui est une autre mesure.

---

## Attribution

Les contours sont sous licence ODbL, qui impose de citer la source. La mention
figure dans le pied de page du site et dans les mentions légales :

> Contours des communes : geoBoundaries (données ouvertes).
> Fond de carte : OpenStreetMap.

**Références**

- geoBoundaries — <https://www.geoboundaries.org/>
- OpenStreetMap — <https://www.openstreetmap.org/copyright>
- PostGIS — <https://postgis.net/documentation/>
- Leaflet — <https://leafletjs.com/reference.html>

---

## Deux niveaux d'affichage

La carte change de découpage selon le zoom :

| Zoom | Découpage | Unités |
|---|---|---|
| Vue du pays | Départements | 12 |
| Rapproché | Communes | 77 |

Vus du pays entier, 77 polygones forment une mosaïque illisible et leurs
effectifs sont trop faibles pour être comparés d'un coup d'œil. Le seuil de
bascule est asymétrique — 7,5 pour entrer dans le détail communal, 7,1 pour en
sortir. Sans cette zone morte, un zoom s'arrêtant pile sur le seuil ferait
osciller la carte, et chaque bascule est un rechargement.

L'API expose le choix : `GET /api/stats/carte?niveau=departement|commune`.
Le découpage par défaut reste la commune, pour ne pas changer le sens des
appels existants.

Les contours départementaux sont pré-calculés au seed, dans la table
`departements` :

```sql
ST_Multi(ST_Buffer(ST_Union(c.geometry), 0))
```

`ST_Buffer(..., 0)` referme les micro-interstices que laissent des contours
simplifiés indépendamment les uns des autres — sans lui, la frontière
départementale apparaît trouée. La fusion coûte environ 400 ms : trop pour
être refaite à chaque cache froid, d'où la table.

---

## Population et taux de couverture

Chaque commune et chaque département porte désormais une population, issue des
projections **2024** publiées par OCHA d'après l'INStaD (jeu « COD-PS Bénin »,
licence CC BY-IGO). Les fichiers sont déposés dans `backend/data/` pour que le
seed reste reproductible hors ligne.

| Fichier | Contenu |
|---|---|
| `benin-population-adm1-2024.csv` | 12 départements |
| `benin-population-adm2-2024.csv` | 77 communes, ventilées par sexe et tranche d'âge |

La jointure se fait sur le libellé, réduit des deux côtés (sans accents, sans
casse, sans apostrophes) : le fichier écrit « N'Dali » là où le référentiel
suit geoBoundaries avec « N'dali ». Total obtenu : **14 697 052 habitants**.

Cela permet un indicateur que le seul comptage des dépistages n'autorisait
pas : **les dépistés pour 1 000 habitants**, c'est-à-dire la couverture du
territoire. Il répond à « où ne sommes-nous pas encore allés ? », question
d'action pour l'association.

**Ce que la population ne permet toujours pas.** Calculer la prévalence réelle
du diabète. Les personnes dépistées ne sont pas un échantillon au hasard — on
vient souvent se faire dépister parce qu'on a déjà un doute. Aucune donnée de
population ne corrige ce biais de sélection : c'est une limite de méthode, pas
de données. Le taux affiché sur la carte reste un taux de positivité **parmi
les dépistés**.

### Rafraîchir les populations

Les projections sont republiées chaque année. Pour les mettre à jour :
télécharger les deux CSV depuis
[HDX — Benin Subnational Population Statistics](https://data.humdata.org/dataset/cod-ps-ben),
les déposer dans `backend/data/` sous les mêmes noms, puis relancer
`npm run db:seed`. Le seed est idempotent et met aussi à jour les contours
départementaux.
