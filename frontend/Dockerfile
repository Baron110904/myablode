FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# L'adresse de l'API est lue à la construction : Next l'inscrit dans le
# JavaScript envoyé au navigateur. La changer demande donc de reconstruire —
# c'est pour cela qu'elle est un argument de build et non une variable
# d'exécution.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Déclenche `output: 'standalone'` — voir next.config.js.
ENV BUILD_STANDALONE=true

RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# `standalone` embarque le serveur et ses seules dépendances utiles ; les
# fichiers statiques et le dossier public se copient à côté.
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
