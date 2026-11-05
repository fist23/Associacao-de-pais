#!/usr/bin/env bash
# Gera app-associacao.zip (pb_public + pb_migrations) para carregar na PocketBase Cloud:
# instância → Deploy → arrastar o ZIP.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
rm -rf .pacote app-associacao.zip
mkdir -p .pacote/pb_public .pacote/pb_migrations
cp -r dist/. .pacote/pb_public/
cp pb_migrations/*.js .pacote/pb_migrations/
(cd .pacote && python3 -c "
import os, zipfile
with zipfile.ZipFile('../app-associacao.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, ficheiros in os.walk('.'):
        for f in sorted(ficheiros):
            caminho = os.path.join(raiz, f)
            z.write(caminho, os.path.relpath(caminho, '.'))
")
rm -rf .pacote
echo "Criado: app-associacao.zip ($(du -h app-associacao.zip | cut -f1))"
