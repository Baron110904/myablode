# Déploiement de MyABLODE

Deux voies, au choix.

| | Vercel + Render + Neon | Docker sur un serveur |
| --- | --- | --- |
| Mise en place | ~1 h, surtout de l'attente | ~20 min |
| Coût | gratuit | prix du serveur |
| Carte bancaire | non | non |
| Prérequis | trois comptes | une machine Linux |
| HTTPS | fourni | à installer |

Les trois services sont pris sur leur palier gratuit. Cela impose deux
contraintes, détaillées plus bas : le service s'endort après quinze minutes
d'inactivité, et il dispose de 512 Mo de mémoire.

La première convient à une version de test ouverte aux parties prenantes. La
seconde si l'association dispose déjà d'un serveur.

---

# Voie A — Vercel, Render et Neon

## A1. La base sur Neon

Créez un projet, région **Frankfurt** ou **Paris** — le plus proche du Bénin
parmi les régions disponibles.

Dans l'éditeur SQL de Neon, activez les deux extensions :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

L'application utilise onze fonctions PostGIS pour les cartes ; sans cette
extension, les migrations s'arrêtent immédiatement.

Copiez la chaîne de connexion. Elle ressemble à :

```
postgresql://ablode:xxxx@ep-cool-name-123.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Retirez `?sslmode=require`** de la fin : le chiffrement est activé par la
variable `DB_SSL`, et le paramètre en double fait échouer la connexion.

## A2. Le schéma et les données

Depuis votre machine, pas depuis Render — Neon est joignable publiquement et
c'est plus simple.

```sh
cd backend
```

**En PowerShell** — la syntaxe `VAR=valeur commande` n'existe pas, il faut
poser les variables d'abord :

```powershell
$env:DATABASE_URL = "postgresql://…"   # la chaîne Neon, sans ?sslmode=require
$env:DB_SSL = "true"
$env:SEED_DEMO_DATA = "true"
npm run migration:run
npm run db:seed
```

**En Git Bash ou sous Linux** :

```sh
export DATABASE_URL="postgresql://…"
export DB_SSL=true
export SEED_DEMO_DATA=true
npm run migration:run
npm run db:seed
```

> Le préfixe `VAR=valeur npm run …` sur une seule ligne fonctionne en bash
> mais **échoue silencieusement en PowerShell** : les variables sont ignorées,
> l'application retombe sur le `.env` local et c'est votre base de
> développement qui est modifiée. Le seed affiche alors « déjà présents »
> partout, ce qui donne l'illusion que tout s'est bien passé.

Vérifiez sur quelle base vous avez travaillé :

```sh
npm run migration:run
```

Relancée, la commande doit répondre `No migrations are pending`.

Le seed annonce à la fin : `✓ Démo : 11732 dépistages, 26 campagnes,
6 articles, 48 abonnés.`

## A3. L'API sur Render

Poussez le dépôt sur GitHub, puis dans Render : **New → Blueprint**, pointez
sur votre dépôt. Le fichier `render.yaml` décrit le service.

Trois variables restent à saisir à la main (Render ne les devine pas) :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | la chaîne Neon, sans `?sslmode=require` |
| `CORS_ORIGINS` | l'adresse Vercel — à remplir après l'étape A4 |
| `SEED_ADMIN_PASSWORD` | le mot de passe administrateur voulu |

Laissez `CORS_ORIGINS` vide pour ce premier déploiement ; on y revient.

Le premier build prend cinq à dix minutes. Vérifiez ensuite :

```sh
curl https://myablode-api.onrender.com/api/health
```

Réponse attendue — `cache: "absent"` est normal, il n'y a pas de Redis :

```json
{ "statut": "ok", "base": "connectee" }
```

## A4. Le site sur Vercel

**New Project**, pointez sur le même dépôt, et réglez :

- **Root Directory** : `frontend`
- **Framework Preset** : Next.js (détecté)
- **Variable d'environnement** :
  `NEXT_PUBLIC_API_URL` = `https://myablode-api.onrender.com`

> Cette adresse est inscrite dans le JavaScript envoyé au navigateur. La
> changer plus tard impose un redéploiement, pas seulement un redémarrage.

Une fois déployé, Vercel vous donne une adresse du type
`myablode.vercel.app`. Le site vitrine **et** le back-office `/admin` sont
servis par ce même projet.

## A5. Refermer la boucle

Retournez dans Render et renseignez :

```
CORS_ORIGINS = https://myablode.vercel.app
```

Sans barre oblique finale, et exactement l'adresse tapée dans le navigateur.
Render redéploie tout seul.

## A6. Garder le service éveillé

Le palier gratuit de Render endort le service après quinze minutes sans
visite. Le réveil, ajouté au chargement des modules, fait patienter une à
deux minutes le premier visiteur — de quoi faire croire à une panne pendant
une démonstration.

Un appel régulier suffit à l'empêcher de dormir. Sur
[cron-job.org](https://cron-job.org), gratuit et sans carte :

```
URL        https://myablode-api.onrender.com/api/health
Intervalle toutes les 10 minutes
```

Le palier gratuit offre 750 heures de service par mois ; un mois complet en
compte environ 730, ce qui tient tout juste pour un seul service maintenu
éveillé en permanence.

> Avant une réunion, ouvrez le site cinq minutes à l'avance dans tous les
> cas. C'est la précaution la plus simple.

## A6 bis. La limite de mémoire

512 Mo sur le palier gratuit. Mesures relevées sur la version actuelle :

| Usage | Mémoire |
| --- | --- |
| Démarrage et navigation | 114 Mo |
| Export CSV de 11 732 lignes | 283 Mo |
| **Export Excel de 11 732 lignes** | **596 Mo** |

La navigation, les cartes et les tableaux de bord tiennent largement.
**L'export Excel de la liste complète dépasse la limite** : Render arrête le
service et le redémarre, ce qui coupe le téléchargement et rend le site
indisponible une à deux minutes.

Trois façons de vivre avec :

- filtrer avant d'exporter — par commune ou par campagne, le volume tombe et
  la mémoire avec ;
- utiliser l'export CSV, qui passe à 283 Mo et s'ouvre aussi dans Excel ;
- passer au palier `starter` (7 $/mois, 2 Go) si l'export complet doit
  fonctionner.

## A7. Vérifier

| Adresse | Ce qu'on doit voir |
| --- | --- |
| `https://myablode.vercel.app` | l'accueil, carte du Bénin colorée |
| `…/carte` | les 77 communes, cliquables |
| `…/resultats` | les graphiques et le récapitulatif |
| `…/admin` | l'écran de connexion |

Connectez-vous avec `admin@ablode.bj` et le mot de passe choisi en A3, puis
**rechargez la page**. Si vous restez connecté, le cookie inter-domaines
fonctionne — c'est le point le plus fragile de cette configuration.

## Si ça ne marche pas

**Déconnecté à chaque rechargement de `/admin`.** Le cookie de session ne
traverse pas. Vérifiez dans Render que `COOKIE_SAMESITE=none` et
`COOKIE_SECURE=true`. Les deux ensemble : `none` sans `secure` est refusé par
tous les navigateurs.

**`CORS` refusé dans la console du navigateur.** `CORS_ORIGINS` ne
correspond pas exactement à l'adresse du site — un `http://` au lieu de
`https://`, ou une barre oblique en trop.

**La première visite met deux minutes.** Le service Render dort. Le palier
`starter` du `render.yaml` l'évite ; si vous êtes repassé au gratuit, c'est
le comportement attendu.

**`base: "deconnectee"`.** `DB_SSL` n'est pas à `true`, ou `?sslmode=require`
est resté dans `DATABASE_URL`.

**Les écrans sont vides malgré le seed.** Le seed a-t-il bien tourné avec
`SEED_DEMO_DATA=true` ? Sans cette variable, il n'installe que les 77
communes et le compte administrateur.

---

# Voie B — Docker sur un serveur

## Prérequis

Une machine Linux avec **Docker** et **Docker Compose v2**
(`docker compose version` doit répondre), 2 Go de mémoire, 10 Go de disque,
et les ports 3000 et 4000 joignables.

## B1. Environnement

```sh
git clone <adresse-du-depot> ABLODE
cd ABLODE
cp .env.production.exemple .env.production
```

Remplissez les valeurs marquées « À REMPLIR » :

```sh
openssl rand -base64 24   # DB_PASSWORD
openssl rand -base64 24   # REDIS_PASSWORD
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
```

`JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET` doivent être **différents**.

> Respectez les noms à la lettre. Une variable mal nommée n'empêche pas le
> démarrage : l'application repart sur son secret de développement, inscrit
> dans le code et donc connu de quiconque le lit.

En accès direct par adresse IP, sans HTTPS :

```
SITE_URL=http://203.0.113.10:3000
API_URL=http://203.0.113.10:4000
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

> `COOKIE_SECURE=false` est indispensable en HTTP simple : sinon le
> navigateur refuse le cookie et la connexion boucle sans message.

## B2. Construire et démarrer

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
```

Les quatre services doivent être `running`, `postgres` et `redis` en
`healthy`. Cinq à dix minutes pour la première construction.

## B3. Schéma et données

```sh
docker compose -f docker-compose.prod.yml exec api npm run migration:run:prod
docker compose -f docker-compose.prod.yml exec api npm run db:seed:prod
```

> Ce sont bien les variantes `:prod`. Les commandes sans suffixe passent par
> ts-node et lisent les sources, absentes de l'image.

Videz ensuite le cache, sinon les chiffres restent à zéro pendant cinq
minutes — l'API a mis en cache une base encore vide :

```sh
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a "$REDIS_PASSWORD" FLUSHALL
```

## B4. Vérifier

```sh
curl http://localhost:4000/api/health
curl "http://localhost:4000/api/stats/resume?periode=tout"
```

`totalDepistages` doit valoir 11 732 et `totalCommunes` 77.

Identifiants : `admin@ablode.bj` / `Ablode2026!` — **à changer** depuis
Paramètres → Sécurité avant d'ouvrir l'accès.

## B5. Sauvegardes

```sh
chmod +x sauvegarder.sh
./sauvegarder.sh
crontab -e
# 0 2 * * *  cd /chemin/vers/ABLODE && ./sauvegarder.sh >> sauvegardes/journal.txt 2>&1
```

## B6. HTTPS

Les conteneurs servent en HTTP. Pour une mise à disposition qui dure, un
reverse proxy devant — Caddy obtient les certificats tout seul :

```
test.ablode.bj {
  reverse_proxy localhost:3000
}
api-test.ablode.bj {
  reverse_proxy localhost:4000
}
```

Passez alors `COOKIE_SECURE=true` et redémarrez.

## Commandes utiles

```sh
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml down      # arrêt, données gardées
docker compose -f docker-compose.prod.yml down -v   # EFFACE LA BASE
```

---

# Ce qui n'est pas configuré, quelle que soit la voie

**L'envoi de courriels.** Sans `SMTP_HOST`, l'application fonctionne mais les
messages — réinitialisation de mot de passe, accusés de réception — échouent
en étant journalisés. Acceptable pour une phase de test. Pour les activer :
renseignez les variables `SMTP_*` puis testez depuis Paramètres → Mail.

**La collecte de terrain.** La configuration Kobo est vide. Renseignez-la
depuis Paramètres → KoboToolbox. Le bouton « Tester la connexion » liste vos
formulaires et propose une correspondance des champs.

**Redis, en voie A.** Le service de cache retombe sur la base quand Redis est
absent. Les pages publiques interrogent alors PostgreSQL à chaque visite —
sans conséquence à l'échelle d'une démonstration. Ajoutez Upstash ou le
service « Key Value » de Render si la charge le justifie.

# Limites connues

- Cinq dépendances portent des vulnérabilités classées « hautes » dont la
  correction demande des montées de version majeures (NestJS 10 → 12,
  nodemailer 6 → 10). Les routes concernées — envois de fichiers — sont
  réservées aux administrateurs authentifiés. À traiter avant une mise en
  service réelle, pas avant une démonstration.
- Une seule session par compte : se connecter depuis un second appareil
  ferme la première.
- L'export CSV de la liste complète des dépistages prend une quinzaine de
  secondes sur 11 000 lignes.
- L'API met vingt à quatre-vingt-dix secondes à charger ses modules au
  démarrage. C'est visible au premier lancement et après chaque
  redéploiement.
