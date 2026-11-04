#!/usr/bin/env bash
# Atualiza a app para a versão mais recente do repositório e reinicia o serviço.
# Uso: sudo bash /opt/associacao/src/scripts/atualizar.sh
set -euo pipefail

DIR=/opt/associacao
UTIL=associacao
RAMO="${RAMO:-$(git -C "$DIR/src" rev-parse --abbrev-ref HEAD)}"
export PATH="/opt/node/bin:$PATH"

[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }

if [ "${1:-}" != "--sem-reiniciar" ]; then
  echo "==> Cópia de segurança antes de atualizar"
  sudo -u "$UTIL" bash "$DIR/src/scripts/backup.sh" || true
  echo "==> A obter a versão mais recente (ramo $RAMO)"
  git -C "$DIR/src" fetch -q origin "$RAMO"
  git -C "$DIR/src" checkout -q -B "$RAMO" "origin/$RAMO"
fi

echo "==> A compilar a app"
cd "$DIR/src"
npm ci --no-audit --no-fund --loglevel=error
npm run build --silent

echo "==> A publicar"
rm -rf "$DIR/pb_public"/* "$DIR/pb_migrations"/*
cp -r dist/. "$DIR/pb_public/"
cp pb_migrations/*.js "$DIR/pb_migrations/"
chown -R "$UTIL:$UTIL" "$DIR"

if [ "${1:-}" != "--sem-reiniciar" ]; then
  systemctl restart associacao.service
  echo "==> Atualizado e reiniciado."
fi
