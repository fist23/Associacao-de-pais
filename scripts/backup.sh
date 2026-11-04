#!/usr/bin/env bash
# Cópia de segurança da base de dados e dos comprovativos.
# Guarda os últimos 30 dias em /opt/associacao/backups e, se o rclone estiver
# configurado com um destino chamado "drive" (ex.: Google Drive da associação), envia uma cópia para lá.
set -euo pipefail

DIR=/opt/associacao
DESTINO=$DIR/backups
DATA=$(date +%Y-%m-%d_%H%M)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Cópia consistente da base de dados SQLite, mesmo com a app a funcionar
sqlite3 "$DIR/pb_data/data.db" ".backup '$TMP/data.db'"
[ -d "$DIR/pb_data/storage" ] && cp -r "$DIR/pb_data/storage" "$TMP/storage"

tar -czf "$DESTINO/associacao_$DATA.tar.gz" -C "$TMP" .
find "$DESTINO" -name 'associacao_*.tar.gz' -mtime +30 -delete
echo "$(date '+%F %T') cópia criada: associacao_$DATA.tar.gz"

if command -v rclone >/dev/null && rclone listremotes 2>/dev/null | grep -q '^drive:'; then
  rclone copy "$DESTINO/associacao_$DATA.tar.gz" drive:associacao-backups/ && echo "  enviada para o Google Drive"
fi
