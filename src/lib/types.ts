export type Papel = 'admin' | 'tesoureiro' | 'direcao' | 'leitura'

interface Base {
  id: string
  created?: string
}

export interface Configuracao extends Base {
  nome_associacao: string
  ano_letivo: string
  valor_quota: number
  saldo_inicial: number
  saldo_inicial_caixa: number
  saldo_inicial_banco: number
}

export interface Socio extends Base {
  numero: number
  nome: string
  email: string
  telefone: string
  nif: string
  data_adesao: string
  ativo: boolean
  consentimento_rgpd: boolean
  notas: string
}

export const ANOS_ESCOLARES = ['Pré 3 anos', 'Pré 4 anos', 'Pré 5 anos', '1.º', '2.º', '3.º', '4.º', 'Saiu'] as const

export interface Educando extends Base {
  socio: string
  nome: string
  ano_escolar: string
  turma: string
}

export interface Quota extends Base {
  socio: string
  ano_letivo: string
  valor: number
  data_pagamento: string
  metodo: string
  movimento: string
}

export const METODOS = ['Numerário', 'MB WAY', 'Transferência', 'Multibanco', 'Cheque', 'Outro'] as const

export const CATEGORIAS_RECEITA = ['Quotas', 'Eventos', 'Donativos', 'Angariação de fundos', 'Subsídios', 'Outras receitas']
export const CATEGORIAS_DESPESA = ['Eventos', 'Material', 'Transportes', 'Alimentação', 'Ofertas', 'Despesas bancárias', 'Outras despesas']

export type Conta = 'Caixa' | 'Banco'
export const CONTAS: Conta[] = ['Caixa', 'Banco']

export interface Movimento extends Base {
  data: string
  /** 'transferencia' = depósito ou levantamento entre Caixa e Banco (não é receita nem despesa) */
  tipo: 'receita' | 'despesa' | 'transferencia'
  conta: Conta | ''
  conta_destino: Conta | ''
  categoria: string
  descricao: string
  valor: number
  metodo: string
  documento: string
  ano_letivo: string
  evento: string
  socio: string
}

export const TIPOS_EVENTO = ['Festa', 'Passeio', 'Atividade', 'Angariação', 'Outro'] as const
export const ESTADOS_EVENTO = ['Planeado', 'Aberto', 'Fechado', 'Concluído', 'Cancelado'] as const

export interface Evento extends Base {
  nome: string
  tipo: string
  data: string
  local: string
  preco: number
  preco_nao_socio: number
  vagas: number
  descricao: string
  ano_letivo: string
  estado: string
  /** Data limite de inscrição (opcional) */
  inscricoes_ate: string
  /** Se preenchida, os preços normais valem até esta data (inclusive) e depois aplicam-se os preços "depois" */
  preco_ate: string
  preco_depois: number
  preco_nao_socio_depois: number
}

export interface Inscricao extends Base {
  evento: string
  educando: string
  nome: string
  contacto: string
  valor: number
  pago: boolean
  movimento: string
  notas: string
}

export interface Vale extends Base {
  numero: number
  ano_letivo: string
  data: string
  beneficiario: string
  motivo: string
  valor_entregue: number
  evento: string
  estado: 'Pendente' | 'Regularizado' | 'Anulado'
  data_regularizacao: string
  valor_gasto: number
  documento: string
  movimento: string
  notas: string
}
