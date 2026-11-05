// Regras de preço e prazo de inscrição dos eventos
import type { Evento } from './types'
import { dataPT, dia, euro, hoje } from './util'

/** true se já passou a data em que o preço normal termina */
export const precoDepoisAtivo = (ev: Evento, data = hoje()) => Boolean(dia(ev.preco_ate)) && data > dia(ev.preco_ate)

/** Preço a cobrar numa inscrição feita na data indicada (por omissão, hoje) */
export function precoEvento(ev: Evento, socio: boolean, data = hoje()) {
  const [base, naoSocio] = precoDepoisAtivo(ev, data)
    ? [ev.preco_depois, ev.preco_nao_socio_depois]
    : [ev.preco, ev.preco_nao_socio]
  return socio || !naoSocio ? base : naoSocio
}

/** true se a data limite de inscrição já passou */
export const inscricoesFechadas = (ev: Evento, data = hoje()) => Boolean(dia(ev.inscricoes_ate)) && data > dia(ev.inscricoes_ate)

/** Texto curto com os preços, ex.: "Sócio 3,00 € · não sócio 5,00 € — a partir de 11/12: 5,00 € · 7,00 €" */
export function textoPrecos(ev: Evento) {
  const par = (s: number, n: number) => (n && n !== s ? `sócio ${euro(s)} · não sócio ${euro(n)}` : s ? euro(s) : 'gratuito')
  const normal = par(ev.preco, ev.preco_nao_socio)
  if (!dia(ev.preco_ate)) return normal
  return `${normal} até ${dataPT(ev.preco_ate)} · depois ${par(ev.preco_depois, ev.preco_nao_socio_depois)}`
}

/** Texto do prazo de inscrição, ou '' se não houver prazo */
export function textoPrazo(ev: Evento) {
  if (!dia(ev.inscricoes_ate)) return ''
  return inscricoesFechadas(ev) ? 'Inscrições fechadas' : `Inscrições até ${dataPT(ev.inscricoes_ate)}`
}
