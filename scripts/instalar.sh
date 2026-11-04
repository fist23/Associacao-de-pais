#!/usr/bin/env bash
# =====================================================================
# Instala a app da Associação de Pais num servidor Ubuntu/Debian
# (ex.: Oracle Cloud Always Free, Raspberry Pi, computador antigo).
#
# Uso:
#   sudo bash instalar.sh ap-escola.duckdns.org      # com HTTPS automático (domínio)
#   sudo bash instalar.sh                            # sem domínio (porta 8090, p/ Cloudflare Tunnel)
#
# Variáveis opcionais:
#   REPO=https://github.com/<utilizador>/<repositorio>.git   (repositório da app)
#   RAMO=main                                                 (ramo a instalar)
# =====================================================================
set -euo pipefail

DOMINIO="${1:-}"
REPO="${REPO:-https://github.com/fist23/Associacao-de-pais.git}"
RAMO="${RAMO:-main}"
PB_VERSAO="0.40.6"
NODE_VERSAO="22.21.1"
DIR=/opt/associacao
UTIL=associacao

[ "$(id -u)" -eq 0 ] || { echo "Execute com sudo."; exit 1; }

case "$(uname -m)" in
  x86_64) ARQ=amd64; NODE_ARQ=x64 ;;
  aarch64|arm64) ARQ=arm64; NODE_ARQ=arm64 ;;
  armv7l) ARQ=armv7; NODE_ARQ=armv7l ;;
  *) echo "Arquitetura não suportada: $(uname -m)"; exit 1 ;;
esac

echo "==> Pacotes do sistema"
apt-get update -qq
apt-get install -y -qq git unzip curl ca-certificates sqlite3 >/dev/null

echo "==> Utilizador de sistema '$UTIL'"
id "$UTIL" >/dev/null 2>&1 || useradd --system --home "$DIR" --shell /usr/sbin/nologin "$UTIL"
mkdir -p "$DIR"/{bin,pb_data,pb_public,pb_migrations,backups}

echo "==> PocketBase $PB_VERSAO ($ARQ)"
TMP=$(mktemp -d)
curl -fsSL -o "$TMP/pb.zip" "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSAO}/pocketbase_${PB_VERSAO}_linux_${ARQ}.zip"
unzip -o -q "$TMP/pb.zip" pocketbase -d "$DIR/bin"
chmod +x "$DIR/bin/pocketbase"

echo "==> Node.js $NODE_VERSAO (só para compilar a app)"
if [ ! -x /opt/node/bin/node ]; then
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSAO}/node-v${NODE_VERSAO}-linux-${NODE_ARQ}.tar.xz" | tar -xJ -C "$TMP"
  rm -rf /opt/node && mv "$TMP/node-v${NODE_VERSAO}-linux-${NODE_ARQ}" /opt/node
fi
rm -rf "$TMP"

echo "==> Código da app ($REPO, ramo $RAMO)"
if [ -d "$DIR/src/.git" ]; then
  git -C "$DIR/src" fetch -q origin "$RAMO" && git -C "$DIR/src" checkout -q -B "$RAMO" "origin/$RAMO"
else
  git clone -q --branch "$RAMO" "$REPO" "$DIR/src"
fi

bash "$DIR/src/scripts/atualizar.sh" --sem-reiniciar

echo "==> Serviço systemd"
if [ -n "$DOMINIO" ]; then
  # HTTPS automático (Let's Encrypt) nas portas 80/443
  EXEC="$DIR/bin/pocketbase serve $DOMINIO --dir=$DIR/pb_data --publicDir=$DIR/pb_public --migrationsDir=$DIR/pb_migrations"
else
  # Só HTTP local na porta 8090 (usar com Cloudflare Tunnel)
  EXEC="$DIR/bin/pocketbase serve --http=127.0.0.1:8090 --dir=$DIR/pb_data --publicDir=$DIR/pb_public --migrationsDir=$DIR/pb_migrations"
fi
cat > /etc/systemd/system/associacao.service <<EOF
[Unit]
Description=Associacao de Pais (PocketBase)
After=network-online.target
Wants=network-online.target

[Service]
User=$UTIL
Group=$UTIL
WorkingDirectory=$DIR
ExecStart=$EXEC
Restart=always
RestartSec=5
LimitNOFILE=4096
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

chown -R "$UTIL:$UTIL" "$DIR"
systemctl daemon-reload
systemctl enable --now associacao.service

if [ -n "$DOMINIO" ]; then
  echo "==> Abrir portas 80 e 443 na firewall local"
  if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  fi
  # As imagens Ubuntu da Oracle Cloud trazem regras iptables que bloqueiam tudo exceto SSH
  if iptables -S INPUT 2>/dev/null | grep -q "REJECT"; then
    for p in 443 80; do
      iptables -C INPUT -p tcp --dport $p -m state --state NEW -j ACCEPT 2>/dev/null ||
        iptables -I INPUT 5 -p tcp --dport $p -m state --state NEW -j ACCEPT
    done
    command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null || true
  fi
fi

echo "==> Cópia de segurança diária (03:30)"
cat > /etc/cron.d/associacao-backup <<EOF
30 3 * * * $UTIL /bin/bash $DIR/src/scripts/backup.sh >> $DIR/backups/backup.log 2>&1
EOF

sleep 2
systemctl --no-pager --lines=0 status associacao.service | head -3
echo
echo "=================================================================="
echo " Instalação concluída."
echo
echo " 1) Crie a conta de superutilizador (gestão técnica):"
echo "    sudo -u $UTIL $DIR/bin/pocketbase superuser upsert O_SEU_EMAIL UMA_PASSWORD_FORTE --dir=$DIR/pb_data"
echo
echo " 2) Abra o painel técnico e crie o primeiro membro da direção (papel 'admin'):"
if [ -n "$DOMINIO" ]; then
  echo "    https://$DOMINIO/_/   ->  coleção 'users'  ->  New record"
  echo
  echo " 3) A app fica em: https://$DOMINIO"
else
  echo "    http://127.0.0.1:8090/_/  (através do túnel / ssh -L 8090:127.0.0.1:8090)"
fi
echo "=================================================================="
