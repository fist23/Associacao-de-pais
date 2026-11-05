// Endereço curto para a app da Associação de Pais (Cloudflare Worker, plano gratuito).
// Reencaminha tudo o que chega a este endereço para a instância na PocketBase Cloud,
// mantendo o endereço curto na barra do browser.
//
// Se a instância mudar de endereço, altere só a linha seguinte.
const ORIGEM = 'https://cpwz2m8z4mvbo2c.pwz5.pocketbasecloud.com'

export default {
  async fetch(request) {
    const aqui = new URL(request.url)
    const destino = new URL(aqui.pathname + aqui.search, ORIGEM)

    const resposta = await fetch(new Request(destino, request), { redirect: 'manual' })

    // Redirecionamentos para o endereço original passam a apontar para o endereço curto
    const local = resposta.headers.get('location')
    if (local && local.startsWith(ORIGEM)) {
      const r = new Response(resposta.body, resposta)
      r.headers.set('location', aqui.origin + local.slice(ORIGEM.length))
      return r
    }
    return resposta
  },
}
