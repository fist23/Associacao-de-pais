# Endereço curto e gratuito (Cloudflare Worker)

O plano gratuito da PocketBase Cloud dá um endereço aleatório (ex.: `cpwz2m8z4mvbo2c.pwz5.pocketbasecloud.com`)
e não permite domínio próprio. Um **Cloudflare Worker** (gratuito, sem cartão, até 100 000 pedidos por dia)
dá um endereço curto e neutro, ex.: `https://app.apserpente.workers.dev`, que fica sempre na barra do browser.

## Passos (cerca de 15 minutos, tudo no browser)

1. Crie conta em <https://dash.cloudflare.com/sign-up> com o **email da associação** (não aparece publicamente).
   Confirme o email.
2. No menu da esquerda: **Compute (Workers)** → **Workers & Pages** → **Create** → **Start with Hello World!**
   (ou "Create Worker").
3. **Worker name:** `app` → **Deploy**.
4. Se for pedido para escolher o **subdomínio workers.dev** da conta, escreva um nome neutro, ex.: `apserpente`.
   (Também se muda em **Workers & Pages** → **Subdomain** → **Change**.)
5. Na página do worker, clique **Edit code**. Apague todo o código, cole o conteúdo de
   [`cloudflare/worker.js`](../cloudflare/worker.js) e clique **Deploy**.
6. Abra `https://app.apserpente.workers.dev` (os seus nomes). Um subdomínio novo pode demorar alguns minutos a funcionar.

## Notas

- O endereço antigo continua a funcionar. O monitor do UptimeRobot pode ficar no endereço antigo.
- Cada pessoa tem de entrar uma vez no endereço novo; a sessão não passa de um endereço para o outro.
- Se a instância da PocketBase Cloud mudar de endereço, altere a linha `const ORIGEM = ...` no código do worker
  e clique **Deploy**.
