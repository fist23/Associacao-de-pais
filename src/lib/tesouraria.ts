// Contas da tesouraria (Caixa / Banco), vales de caixa e valores por extenso
import type { Configuracao, Conta, Movimento, Vale } from './types'

/** Conta onde entra/sai o dinheiro, conforme o método de pagamento */
export const contaDoMetodo = (metodo: string): Conta => (metodo === 'Numerário' ? 'Caixa' : 'Banco')

/** Conta efetiva de um movimento (registos antigos sem conta usam o método) */
export const contaDe = (m: Movimento): Conta => m.conta || contaDoMetodo(m.metodo)

/** Saldos da Caixa e do Banco a partir do saldo inicial e de todos os movimentos indicados */
export function saldos(movs: Movimento[], cfg: Pick<Configuracao, 'saldo_inicial_caixa' | 'saldo_inicial_banco'>) {
  const s = { Caixa: cfg.saldo_inicial_caixa || 0, Banco: cfg.saldo_inicial_banco || 0 }
  for (const m of movs) {
    const c = contaDe(m)
    if (m.tipo === 'receita') s[c] += m.valor
    else if (m.tipo === 'despesa') s[c] -= m.valor
    else if (m.tipo === 'transferencia' && m.conta_destino) {
      s[c] -= m.valor
      s[m.conta_destino] += m.valor
    }
  }
  return { caixa: s.Caixa, banco: s.Banco, total: s.Caixa + s.Banco }
}

/** Dinheiro que saiu da caixa em vales ainda não regularizados */
export const emVales = (vales: Vale[]) => vales.filter((v) => v.estado === 'Pendente').reduce((t, v) => t + v.valor_entregue, 0)

export const numeroVale = (v: Pick<Vale, 'numero' | 'ano_letivo'>) => `${String(v.numero).padStart(3, '0')}/${v.ano_letivo.replace(/^\d\d(\d\d)\/\d\d(\d\d)$/, '$1-$2')}`

// ---------- Valores por extenso (para o vale de caixa) ----------
const UNI = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n < 20) return UNI[n]
  if (n < 100) return DEZ[Math.floor(n / 10)] + (n % 10 ? ' e ' + UNI[n % 10] : '')
  if (n === 100) return 'cem'
  return CEN[Math.floor(n / 100)] + (n % 100 ? ' e ' + ate999(n % 100) : '')
}

function inteiro(n: number): string {
  if (n < 1000) return ate999(n)
  if (n < 1_000_000) {
    const mil = Math.floor(n / 1000)
    const resto = n % 1000
    const parteMil = mil === 1 ? 'mil' : ate999(mil) + ' mil'
    if (!resto) return parteMil
    return parteMil + (resto < 100 || resto % 100 === 0 ? ' e ' : ' ') + ate999(resto)
  }
  return n.toLocaleString('pt-PT')
}

/** 1234.5 -> "mil duzentos e trinta e quatro euros e cinquenta cêntimos" */
export function porExtenso(valor: number) {
  const total = Math.round(valor * 100)
  const euros = Math.floor(total / 100)
  const cent = total % 100
  const partes: string[] = []
  if (euros) partes.push(`${inteiro(euros)} ${euros === 1 ? 'euro' : 'euros'}`)
  if (cent) partes.push(`${inteiro(cent)} ${cent === 1 ? 'cêntimo' : 'cêntimos'}`)
  return partes.length ? partes.join(' e ') : 'zero euros'
}
