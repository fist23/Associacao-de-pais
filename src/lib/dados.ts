// Operações que mexem em mais do que uma tabela (ex.: pagar quota = quota + movimento na tesouraria)
import { pb } from './pb'
import type { Evento, Inscricao, Movimento, Quota, Socio } from './types'
import { paraPB } from './util'
import { contaDoMetodo } from './tesouraria'

type NovoMovimento = Omit<Movimento, 'id' | 'created' | 'documento' | 'evento' | 'socio' | 'conta' | 'conta_destino'> &
  Partial<Pick<Movimento, 'documento' | 'evento' | 'socio' | 'conta' | 'conta_destino'>>

export function criarMovimento(m: NovoMovimento) {
  return pb.collection('movimentos').create<Movimento>({
    conta: contaDoMetodo(m.metodo),
    ...m,
    data: paraPB(m.data),
    criado_por: pb.authStore.record?.id,
  })
}

/** Regista o pagamento da quota e a respetiva receita na tesouraria */
export async function pagarQuota(socio: Socio, anoLetivo: string, valor: number, data: string, metodo: string) {
  const mov = await criarMovimento({
    data,
    tipo: 'receita',
    categoria: 'Quotas',
    descricao: `Quota ${anoLetivo} — sócio ${socio.numero ? 'n.º ' + socio.numero + ' ' : ''}${socio.nome}`,
    valor,
    metodo,
    ano_letivo: anoLetivo,
    socio: socio.id,
  })
  try {
    return await pb.collection('quotas').create<Quota>({
      socio: socio.id,
      ano_letivo: anoLetivo,
      valor,
      data_pagamento: paraPB(data),
      metodo,
      movimento: mov.id,
    })
  } catch (e) {
    await pb.collection('movimentos').delete(mov.id).catch(() => {})
    throw e
  }
}

/** Anula o pagamento de uma quota (apaga também a receita associada) */
export async function anularQuota(q: Quota) {
  // Primeiro a receita: só tesoureiro/admin podem apagar movimentos, e assim não ficam receitas órfãs
  if (q.movimento) await pb.collection('movimentos').delete(q.movimento)
  await pb.collection('quotas').delete(q.id)
}

/** Marca uma inscrição como paga e regista a receita do evento */
export async function pagarInscricao(i: Inscricao, ev: Evento, data: string, metodo: string) {
  let movimento = ''
  if (i.valor > 0) {
    const mov = await criarMovimento({
      data,
      tipo: 'receita',
      categoria: 'Eventos',
      descricao: `${ev.nome} — ${i.nome}`,
      valor: i.valor,
      metodo,
      ano_letivo: ev.ano_letivo,
      evento: ev.id,
    })
    movimento = mov.id
  }
  try {
    return await pb.collection('inscricoes').update<Inscricao>(i.id, { pago: true, movimento })
  } catch (e) {
    if (movimento) await pb.collection('movimentos').delete(movimento).catch(() => {})
    throw e
  }
}

export async function anularPagamentoInscricao(i: Inscricao) {
  if (i.movimento) await pb.collection('movimentos').delete(i.movimento)
  await pb.collection('inscricoes').update(i.id, { pago: false, movimento: '' })
}

export const somar = (ms: Movimento[], tipo: 'receita' | 'despesa') =>
  ms.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.valor, 0)
