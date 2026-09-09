# Construction en deux temps : les dépendances de développement et le
# compilateur TypeScript restent dans la première image et ne partent pas en
# production.
FROM node:20-alpine AS build

WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker réutilise la
# couche d'installation et le déploiement suivant ne réinstalle rien.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# `--omit=dev` : ni Jest, ni les types, ni le compilateur dans l'image servie.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# Modèles de courriel et fichiers de police du rapport PDF.
COPY src/assets ./dist/assets

# Référentiel géographique : contours des 77 communes et projections de
# population. Le seed le lit depuis `data/` relatif au dossier de travail ;
# sans lui, la création des données de démonstration s'arrête net.
COPY data ./data

# Utilisateur non privilégié : une faille dans l'application ne doit pas
# donner la racine du conteneur.
USER node

EXPOSE 4000

# Sonde applicative plutôt que simple test de port : elle vérifie aussi que
# la base et le cache répondent.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
