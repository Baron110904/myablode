# MyABLODE

Plateforme de centralisation, de visualisation cartographique et de pilotage des
campagnes de dépistage du diabète et de l'obésité au Bénin, pour l'**ABLODE**
(Association Béninoise de Lutte contre l'Obésité, le Diabète et les Endocrinopathies).

Implémentation des spécifications fonctionnelles v1.0 (`specs/`).

---

## Sommaire

1. [Architecture](#architecture)
2. [Démarrage rapide](#démarrage-rapide)
3. [Connexion à KoboToolbox](#connexion-à-kobotoolbox)
4. [Structure du projet](#structure-du-projet)
5. [Tests](#tests)
6. [Sécurité et données de santé](#sécurité-et-données-de-santé)
7. [Mise en production](#mise-en-production)
8. [Points ouverts](#points-ouverts)

---

## Architecture

| Couche          | Technologie                   | Port  |
| --------------- | ----------------------------- | ----- |
| Frontend        | Next.js 14 (App Router)       | 3000  |
| Backend         | NestJS 10                     | 4000  |
| Base de données | PostgreSQL 15 + PostGIS 3.4   | 5433  |
| Cache           | Redis 7                       | 6380  |
| Cartographie    | Leaflet + react-leaflet       | —     |
| Multilingue     | next-intl (fr / en, auto)     | —     |

**Site public et back-office sont deux interfaces distinctes** dans une même
application Next.js :

- le **site vitrine** (`src/app/(public)/`) est éditorial et aéré : typographie
  large, pleine largeur, palette `ablode.*` ;
- le **back-office** (`src/app/admin/`) est dense et fonctionnel : barre
  latérale, tableaux compacts, palette `admin.*`.

Les deux systèmes ne partagent aucune classe CSS, seulement le client API et les
types. Un seul déploiement, une seule session — mais retoucher le site public ne
déplace pas un pixel dans l'outil de travail quotidien des équipes.

**Le site vitrine ne renvoie jamais vers le back-office.** Ni lien, ni mention :
l'espace de gestion s'atteint en saisissant `/admin`, et son adresse est exclue
des moteurs de recherche. Un visiteur n'a aucune raison d'en connaître
l'existence.

**La langue suit le navigateur.** Le site s'affiche en français ou en anglais
selon l'en-tête `Accept-Language`, sans sélecteur ni cookie : le visiteur a déjà
exprimé sa préférence dans ses réglages, la lui redemander serait redondant.

---

## Démarrage rapide

### Prérequis

- Node.js 20 ou supérieur
- Docker et Docker Compose

### 1. Base de données et cache

```bash
docker compose up -d
```

Postgres écoute sur `5433` et Redis sur `6380` — décalés des ports standards
pour ne pas entrer en conflit avec une installation locale.

### 2. Backend

```bash
cd backend
cp .env.example .env        # ajuster si besoin
npm install
npm run migration:run       # crée le schéma
npm run db:seed             # 77 communes + compte admin + démo
npm run start:dev
```

L'API démarre sur <http://localhost:4000/api>, sa documentation Swagger sur
<http://localhost:4000/api/docs>.

Le seed affiche les identifiants du compte super administrateur créé :

```
admin@ablode.bj / Ablode2026!
```

> **Changez ce mot de passe avant toute mise en production**
> (Paramètres → Mon compte).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Le site est sur <http://localhost:3000>, le back-office sur
<http://localhost:3000/admin>.

### Données de démonstration

Le seed génère un jeu de démonstration : ~11 700 dépistages, 30 campagnes,
6 articles, 48 abonnés. **Aucune de ces données ne provient du terrain.** Elles
servent à valider les agrégations, la carte et les écrans avant le branchement
de Kobo.

Pour une base vide (installation réelle), mettez `SEED_DEMO_DATA=false` dans
`backend/.env` avant de lancer le seed. Les 77 communes, les paramètres système
et le compte administrateur sont créés dans tous les cas.

Pour repartir de zéro :

```bash
docker compose down -v && docker compose up -d
cd backend && npm run db:reset
```

---

## Connexion à KoboToolbox

Tout se fait depuis **Paramètres → KoboToolbox** (rôle super admin).

1. **Récupérez votre jeton API** dans KoboToolbox :
   *Compte → Paramètres du compte → Jeton API*.
2. **Renseignez l'URL de l'API** :
   - serveur public : `https://kf.kobotoolbox.org`
   - serveur OCHA : `https://kobo.humanitarianresponse.info`
3. **Collez le jeton**, puis cliquez sur **Tester la connexion**.
   La liste de vos formulaires accessibles s'affiche.
4. **Choisissez le formulaire** à synchroniser. Ses champs réels sont alors
   détectés depuis une soumission existante.
5. **Associez chaque champ Kobo à une colonne** de la base. Une correspondance
   par défaut est proposée pour les noms de champs courants
   (`nom_complet` → `nom`, `glyc_mgdl` → `glycemie`, …).
6. **Enregistrez**, puis **Sync maintenant**.

Ce qui se passe à la synchronisation :

- récupération des soumissions via `/api/v2/assets/{uid}/data/`, paginée ;
- **mode incrémental** : seules les soumissions postérieures à la dernière
  synchro réussie sont demandées (avec 1 h de marge pour les envois différés).
  « Resynchroniser tout » rejoue l'intégralité ;
- **dédoublonnage** par `_uuid` Kobo — rejouer une synchro ne crée pas de
  doublon ;
- **normalisation** : dates (`24/08/2026`, `2026-08-24`, série Excel), sexe
  (`F`, `Féminin`, `2`, `female`…), glycémie saisie en g/L convertie en mg/dL ;
- **rattachement** automatique à la commune (par nom, insensible aux accents) et
  à la campagne couvrant la date ;
- **classification** du résultat selon les seuils cliniques configurés ;
- les lignes rejetées sont listées avec leur motif dans le journal des
  synchronisations.

**Synchronisation automatique** : cochez la case et fixez un intervalle (5 min
à 24 h). Après deux échecs consécutifs, un email d'alerte part vers l'adresse
administrateur (US-ADM-17).

### Tester sans Kobo

L'onglet Import de la page Dépistages accepte un fichier CSV ou XLSX avec le
même assistant de correspondance. C'est le chemin le plus rapide pour vérifier
la chaîne complète avec vos vraies données.

---

## Structure du projet

```
ABLODE/
├── docker-compose.yml          PostGIS + Redis
├── backend/
│   ├── data/
│   │   └── benin-communes.geojson    77 communes (geoBoundaries ADM2)
│   └── src/
│       ├── common/             cache Redis, guards, normalisation, filtres
│       ├── config/
│       ├── database/           entités, migrations, seeds
│       └── modules/
│           ├── auth/           JWT, rôles, 2FA, mot de passe oublié
│           ├── depistages/     table centrale
│           ├── communes/       référentiel PostGIS
│           ├── campagnes/
│           ├── stats/          agrégations, GeoJSON de la carte
│           ├── kobo/           client API, sync, planificateur
│           ├── imports/        CSV / XLSX avec mapping
│           ├── exports/        CSV / Excel / PDF / JSON
│           ├── articles/       + assainissement HTML
│           ├── newsletter/
│           ├── contacts/       contact et bénévoles
│           ├── users/
│           ├── settings/       seuils cliniques, langues
│           ├── audit/          journal immuable
│           └── mail/
└── frontend/
    └── src/
        ├── app/
        │   ├── (public)/       accueil, carte, résultats, actualités…
        │   └── admin/          login + back-office
        ├── components/
        │   ├── public/         en-tête, pied de page, formulaires
        │   ├── admin/          barre latérale, garde, modales, tableaux
        │   ├── carte/          Leaflet, filtres, légende
        │   └── graphiques/     Chart.js
        ├── lib/                client API, types, formatage
        ├── i18n/               configuration next-intl
        └── messages/           fr.json, en.json
```

---

## Tests

```bash
# Backend — 72 tests unitaires
cd backend && npm test

# Backend — 21 tests e2e (nécessite Docker et le seed)
cd backend && npm run test:e2e

# Frontend — 37 tests de composants, formatage et négociation de langue
cd frontend && npm test
```

**130 tests** au total. Ils couvrent notamment :

- la normalisation des données de terrain (dates, sexe, unités de glycémie) ;
- la classification clinique selon les seuils configurés ;
- l'assainissement HTML des articles contre les injections de script ;
- le cloisonnement des données nominatives (routes protégées, jeton Kobo jamais
  renvoyé, hash de mot de passe jamais sérialisé) ;
- l'absence d'énumération d'utilisateurs à la connexion ;
- le choix de la langue depuis l'en-tête `Accept-Language` ;
- l'affichage des chiffres clés sans dépendre du JavaScript.

---

## Sécurité et données de santé

Les dépistages contiennent des **données nominatives de santé**. Les garanties
implémentées (section 6.2 des spécifications) :

| Risque                  | Mesure                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Injection SQL           | TypeORM, requêtes paramétrées, liste blanche sur les tris      |
| XSS                     | Assainissement HTML par liste blanche + CSP stricte            |
| CSRF                    | Cookie `SameSite=Lax`, jeton d'accès en en-tête `Authorization`|
| Exposition des données  | Aucune route publique nominative ; exports Viewer anonymisés   |
| Authentification faible | bcrypt (12 tours), politique de mot de passe, 2FA TOTP         |
| Sessions                | Access token 15 min + refresh HttpOnly 7 j, rotation à chaque usage |
| Bourrage d'identifiants | 10 tentatives/min sur la connexion, 100 req/min par IP         |
| Traçabilité             | Journal d'audit immuable — aucune route d'écriture exposée     |

**Prérequis à la mise en production** rappelés dans les spécifications :

- consentement des personnes dépistées recueilli sur le terrain ;
- anonymisation de tout export diffusé hors de l'association ;
- accès nominatif restreint aux rôles Admin et Super Admin.

Les taux publiés portent sur la **population dépistée**, pas sur la population
générale : le dépistage est opportuniste, ces chiffres ne sont pas une
estimation épidémiologique. Cette limite est rappelée sur la page Résultats et
dans les mentions légales.

---

## Mise en production

### Variables à changer impérativement

Dans `backend/.env` :

```bash
NODE_ENV=production
JWT_ACCESS_SECRET=<openssl rand -hex 48>
JWT_REFRESH_SECRET=<openssl rand -hex 48>
COOKIE_SECURE=true
SEED_DEMO_DATA=false
CORS_ORIGINS=https://votre-domaine.bj
```

Dans `frontend/.env.local` :

```bash
NEXT_PUBLIC_API_URL=https://api.votre-domaine.bj
NEXT_PUBLIC_SITE_URL=https://votre-domaine.bj
```

### Email

La configuration se fait **depuis l'interface** : Paramètres → Email (super
admin). Elle est enregistrée en base et appliquée sans redémarrage — l'ABLODE
peut changer d'hébergeur mail sans accès au serveur.

### Vérifier les emails en développement

`docker compose up -d` démarre **Mailpit**, qui capture tous les messages au
lieu de les livrer :

- interface de lecture : <http://localhost:8025>
- serveur SMTP : `localhost:1025`, sans authentification

C'est la configuration par défaut du `.env.example` : aucun message ne peut
partir par erreur vers une vraie adresse pendant les essais. Le préréglage
« Mailpit (test local) » de l'écran Paramètres → Email la restaure en un clic.

L'écran propose des préréglages (Brevo, Gmail, Mailjet, OVH) et deux
vérifications distinctes :

- **Tester la connexion** — vérifie que le serveur répond et accepte les
  identifiants, sans rien envoyer ;
- **Envoyer un test** — envoie un vrai message à l'adresse de votre choix, seul
  moyen de valider la chaîne complète jusqu'à la boîte de réception.

Les erreurs SMTP sont traduites en messages actionnables (« Identifiants
refusés », « Port bloqué par le pare-feu ») plutôt qu'en codes `EAUTH` ou
`ETIMEDOUT`.

Les variables `SMTP_*` du fichier `.env` servent de valeurs initiales ; la
configuration saisie dans l'interface a priorité.

**Sans serveur configuré**, le service bascule en mode journal : les messages
sont écrits dans les logs au lieu d'être envoyés, et un avertissement s'affiche
sur l'écran Paramètres. Réinitialisations de mot de passe, accusés de réception,
lettre d'information et alertes de synchronisation ne partent alors pas.

### Build

```bash
cd backend && npm run build && npm run start:prod
cd frontend && npm run build && npm start
```

Prévoir un reverse proxy (nginx ou Caddy) pour TLS et le routage des deux
services.

### Sauvegardes

```bash
docker exec ablode_postgres pg_dump -U ablode ablode | gzip > sauvegarde-$(date +%F).sql.gz
```

À automatiser quotidiennement : la base contient des données de santé qu'on ne
peut pas recollecter.

---

## Points ouverts

Ces éléments demandent une décision ou une contribution de l'association :

1. **Mentions légales.** Numéro d'enregistrement de l'association, directeur de
   publication et coordonnées complètes sont marqués « à compléter » dans
   `frontend/src/app/(public)/mentions-legales/page.tsx`.

2. **Logos des partenaires.** La page À propos réserve quatre emplacements avec
   des libellés provisoires.

3. **Hébergement des images.** Les articles acceptent une URL d'image externe.
   Un téléversement direct (Cloudinary, offre gratuite jusqu'à 5 Go, ou stockage
   sur le VPS) reste à brancher.

4. **Suivi d'ouverture de la newsletter.** Les colonnes `nb_ouvertures` et
   `nb_clics` existent en base mais ne sont pas encore alimentées : cela suppose
   un pixel de tracking, avec les implications de confidentialité correspondantes.

---

## Sources de données

- **Contours des communes** : [geoBoundaries](https://www.geoboundaries.org/)
  ADM2 Bénin — 77 communes, licence ODbL.
- **Fond de carte** : [OpenStreetMap](https://www.openstreetmap.org/copyright).

📄 **[docs/CARTOGRAPHIE.md](docs/CARTOGRAPHIE.md)** détaille l'origine des
contours, le calcul des taux de prévalence, le rattachement des dépistages aux
communes et les limites d'interprétation de la carte.
