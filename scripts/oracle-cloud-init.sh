#!/bin/bash
# =====================================================================
#  Instalação automática da app da Associação de Pais
#  Colar TUDO isto na Oracle Cloud, ao criar a instância:
#  "Show advanced options" → "Management" → "Paste cloud-init script"
#
#  Preencha apenas as linhas entre aspas abaixo.
# =====================================================================

DOMINIO="ap-serpente.duckdns.org"         # o endereço que criou no DuckDNS
DUCKDNS_TOKEN="cole-aqui-o-token"         # o "token" que aparece no topo da página do DuckDNS

ADMIN_NOME="Nome do Presidente"           # a sua conta na app
ADMIN_EMAIL="email@exemplo.pt"
ADMIN_PASSWORD="UmaPalavraPasseForte!"    # mínimo 10 caracteres, sem os símbolos  "  $  `  \

NOME_ASSOCIACAO="Associação de Pais EB JI da Serpente"

# ---------------------------------------------------------------------
#  Não é preciso alterar nada a partir daqui
# ---------------------------------------------------------------------
RAMO=""   # vazio = ramo principal do repositório
exec > /var/log/associacao-instalacao.log 2>&1
set -x
for i in 1 2 3 4 5 6; do
  curl -fsSL -o /root/instalar.sh "https://raw.githubusercontent.com/fist23/Associacao-de-pais/${RAMO:-HEAD}/scripts/instalar.sh" && break
  sleep $((i * 10))
done
set +x
export RAMO DUCKDNS_TOKEN ADMIN_NOME ADMIN_EMAIL ADMIN_PASSWORD NOME_ASSOCIACAO HOME=/root
bash /root/instalar.sh "$DOMINIO"
