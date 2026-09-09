#!/bin/sh
# Sauvegarde de la base MyABLODE.
#
#   ./sauvegarder.sh
#
# Le fichier est déposé dans ./sauvegardes, horodaté. Les sauvegardes de plus
# de trente jours sont retirées : sans purge, le disque se remplit en silence
# et c'est le jour où on en a besoin qu'on le découvre.
#
# À placer dans une tâche planifiée, une fois par nuit :
#   0 2 * * *  cd /chemin/vers/ABLODE && ./sauvegarder.sh >> sauvegardes/journal.txt 2>&1

set -eu

CONTENEUR="ablode_prod_postgres"
DOSSIER="./sauvegardes"
RETENTION_JOURS=30

if [ -f .env.production ]; then
  # shellcheck disable=SC1091
  . ./.env.production
else
  echo "Fichier .env.production introuvable." >&2
  exit 1
fi

mkdir -p "$DOSSIER"
HORODATAGE=$(date +%Y%m%d-%H%M%S)
FICHIER="$DOSSIER/ablode-$HORODATAGE.sql.gz"

echo "Sauvegarde en cours vers $FICHIER"

# `pg_dump` dans le conteneur, compression sur l'hôte : la version du client
# correspond ainsi toujours à celle du serveur.
docker exec "$CONTENEUR" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$FICHIER"

# Une sauvegarde vide est un échec silencieux : on refuse de la garder.
TAILLE=$(wc -c < "$FICHIER")
if [ "$TAILLE" -lt 10000 ]; then
  echo "Sauvegarde suspecte ($TAILLE octets), fichier retiré." >&2
  rm -f "$FICHIER"
  exit 1
fi

echo "Terminé : $(du -h "$FICHIER" | cut -f1)"

SUPPRIMEES=$(find "$DOSSIER" -name 'ablode-*.sql.gz' -mtime +$RETENTION_JOURS -print -delete | wc -l)
[ "$SUPPRIMEES" -gt 0 ] && echo "$SUPPRIMEES sauvegarde(s) de plus de $RETENTION_JOURS jours retirée(s)."

exit 0
