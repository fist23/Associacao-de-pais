# Associação de Pais — app de gestão

App web gratuita para a direção de uma Associação de Pais (pré-escolar ao 4.º ano) gerir:

- **Sócios** — famílias, encarregados de educação, educandos (Pré 3/4/5 anos, 1.º–4.º ano, turma), quotas anuais pagas/em falta, consentimento RGPD.
- **Festas e passeios** — eventos com preço de sócio/não sócio, vagas, inscrições (individual, turma inteira ou não sócios), pagamentos, despesas e resultado de cada evento, lista de inscritos para exportar.
- **Tesouraria** — receitas e despesas por categoria, comprovativos (foto/PDF), saldo, filtros por ano letivo, exportação para Excel (CSV) e **relatório de contas** pronto a imprimir para a Assembleia Geral.

Pagar uma quota ou marcar uma inscrição como paga cria automaticamente a receita na tesouraria — não é preciso registar duas vezes.

Funciona no computador e no telemóvel (pode ser "instalada" no ecrã inicial como uma app).

## Custos: 0 €

| Peça | Solução gratuita |
|---|---|
| Base de dados + login + API | [PocketBase](https://pocketbase.io) (um único programa, SQLite) |
| Servidor | Oracle Cloud *Always Free*, ou um computador antigo / Raspberry Pi |
| Endereço | Subdomínio grátis [DuckDNS](https://www.duckdns.org) (ex.: `ap-escola.duckdns.org`) |
| HTTPS | Certificado Let's Encrypt automático (incluído no PocketBase) |
| Cópias de segurança | Diárias no servidor + opcionalmente no Google Drive da associação (rclone) |

👉 **Guia de instalação passo a passo: [docs/INSTALACAO.md](docs/INSTALACAO.md)**

## Perfis de acesso

Só os membros da direção têm conta (os pais não entram na app). Ninguém se pode registar sozinho.

| Papel | Pode |
|---|---|
| Administrador | Tudo, incluindo gerir membros, definições e passagem de ano letivo |
| Tesoureiro(a) | Tudo exceto membros e definições |
| Direção | Registar e editar sócios, eventos, pagamentos e movimentos (não apaga movimentos) |
| Só consulta | Ver |

As regras são aplicadas no servidor (`pb_migrations/`), não apenas no ecrã.

## Passagem de ano letivo

Em **Definições → Passar para o ano letivo seguinte**, todos os educandos sobem um ano
(Pré 3 → Pré 4 → Pré 5 → 1.º → … → 4.º → "Saiu") e as quotas passam a contar para o novo ano.
Depois disso, reveja as turmas e marque como inativas as famílias que já não têm filhos na escola.

## Desenvolvimento

Requisitos: Node.js 20.19+ e o [PocketBase](https://pocketbase.io/docs/) (`pocketbase` na raiz do projeto).

```bash
npm install
cp .env.example .env.local

# terminal 1 — servidor (aplica o esquema de pb_migrations/ automaticamente)
./pocketbase superuser upsert admin@exemplo.pt passwordforte123
./pocketbase serve
# abrir http://127.0.0.1:8090/_/ e criar um registo em "users" com papel "admin"

# terminal 2 — app
npm run dev
```

Estrutura:

```
pb_migrations/    esquema da base de dados e regras de acesso
src/pages/        ecrãs (Painel, Sócios, Eventos, Tesouraria, Definições)
src/lib/dados.ts  operações que ligam quotas/inscrições à tesouraria
scripts/          instalar.sh, atualizar.sh, backup.sh (servidor)
```

`npm run build` gera a pasta `dist/`, que o PocketBase serve a partir de `pb_public/`.
