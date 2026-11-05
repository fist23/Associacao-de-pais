# Associação de Pais EB JI da Serpente — app de gestão

App web gratuita para a direção de uma Associação de Pais (pré-escolar ao 4.º ano) gerir:

- **Sócios** — famílias, encarregados de educação, educandos (Pré 3/4/5 anos, 1.º–4.º ano, turma), quotas anuais pagas/em falta, consentimento RGPD.
- **Festas e passeios** — eventos com preço de sócio/não sócio (opcionalmente mais barato até uma data), data limite de inscrição, vagas, inscrições (individual, turma inteira ou não sócios), pagamentos, despesas e resultado de cada evento, lista de inscritos para exportar.
- **Tesouraria** — receitas e despesas por categoria, saldos separados de **Caixa** (numerário) e **Banco**, depósitos e levantamentos, **vales de caixa** (adiantamentos em dinheiro, numerados e impressos para assinar, regularizados com fatura e troco), n.º de fatura/recibo, exportação para Excel (CSV) e **relatório de contas** pronto a imprimir para a Assembleia Geral.

Pagar uma quota ou marcar uma inscrição como paga cria automaticamente a receita na tesouraria — não é preciso registar duas vezes.

Funciona no computador e no telemóvel (pode ser "instalada" no ecrã inicial como uma app).

## Custos: 0 €

| Peça | Solução gratuita |
|---|---|
| Alojamento (base de dados + login + app) | [PocketBase Cloud](https://pocketbasecloud.com), plano Free (50 MB) |
| Endereço com HTTPS | `https://<nome>.pocketbasecloud.com` (incluído) |
| Manter acordada / alertas | [UptimeRobot](https://uptimerobot.com), plano Free |
| Ficheiro da app | Gerado automaticamente pelo GitHub em [Releases](https://github.com/fist23/Associacao-de-pais/releases/tag/app-mais-recente) |

👉 **Guia de instalação, tudo pelo browser: [docs/POCKETBASE_CLOUD.md](docs/POCKETBASE_CLOUD.md)**

Alternativas com servidor próprio (Oracle Cloud *Always Free*, computador antigo ou Raspberry Pi): [docs/INSTALACAO.md](docs/INSTALACAO.md).

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

Em **Definições → Passar para o ano letivo seguinte** abre-se um ecrã de revisão com todos os educandos e o ano
proposto (Pré 3 → Pré 4 → Pré 5 → 1.º → … → 4.º → "Saiu"). Antes de confirmar pode marcar quem **fica retido**,
mudar o ano ou a turma de qualquer educando. Quem passa do pré-escolar para o 1.º ano fica com a turma em branco.
Durante o ano, o ano e a turma de um educando também se mudam na ficha do sócio.

**Turmas mistas** (ex.: 1.º e 2.º anos juntos, ou salas do pré com várias idades): cada educando mantém o seu ano
e todos ficam com o mesmo nome de turma (ex.: "Mista", "Sala Azul"). Ao inscrever num evento, em **Turma / ano**
escolha "Todos os anos" e o nome da turma. A app sugere os nomes de turma já usados, para evitar variantes.

## Identidade visual

As cores e o motivo das folhas vêm do logótipo da associação: verde do texto (`#0a5c2c`), fundo menta,
castanho do tronco e as cores das folhas — que identificam o ano escolar (Pré laranja, 1.º lima, 2.º turquesa,
3.º rosa, 4.º roxo) e o tipo de evento. Tipos de letra: Fraunces (títulos) e Figtree (texto), servidos pela
própria app (sem Google Fonts, por causa do RGPD).

Para trocar o logótipo, substitua em `public/`: `logo.webp`/`logo.jpg` (ecrã de entrada), `emblema.png`
(árvore, no topo e no relatório) e os ícones `icon-*.png`, `apple-touch-icon.png`, `favicon.png`.

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
