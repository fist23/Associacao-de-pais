export type Papel = 'admin' | 'tesoureiro' | 'direcao' | 'leitura'

export interface Configuracao {
  id: number
  nome_associacao: string
  ano_letivo: string
  valor_quota: number
  saldo_inicial: number
}

export interface Socio {
  id: number
  numero: number | null
  nome: string
  email: string | null
  telefone: string | null
  nif: string | null
  data_adesao: string
  ativo: boolean
  consentimento_rgpd: boolean
  notas: string | null
}

export const ANOS_ESCOLARES = ['Pré 3 anos', 'Pré 4 anos', 'Pré 5 anos', '1.º', '2.º', '3.º', '4.º', 'Saiu'] as const

export interface Educando {
  id: number
  socio_id: number
  nome: string
  ano_escolar: string
  turma: string | null
}

export interface Quota {
  id: number
  socio_id: number
  ano_letivo: string
  valor: number
  data_pagamento: string
  metodo: string
  movimento_id: number | null
}

export const METODOS = ['Numerário', 'MB WAY', 'Transferência', 'Multibanco', 'Cheque', 'Outro'] as const

export const CATEGORIAS_RECEITA = ['Quotas', 'Eventos', 'Donativos', 'Angariação de fundos', 'Subsídios', 'Outras receitas']
export const CATEGORIAS_DESPESA = ['Eventos', 'Material', 'Transportes', 'Alimentação', 'Ofertas', 'Despesas bancárias', 'Outras despesas']

export interface Movimento {
  id: number
  data: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  metodo: string
  documento: string | null
  ano_letivo: string
  evento_id: number | null
  socio_id: number | null
}

export const TIPOS_EVENTO = ['Festa', 'Passeio', 'Atividade', 'Angariação', 'Outro'] as const
export const ESTADOS_EVENTO = ['Planeado', 'Aberto', 'Fechado', 'Concluído', 'Cancelado'] as const

export interface Evento {
  id: number
  nome: string
  tipo: string
  data: string | null
  local: string | null
  preco: number
  preco_nao_socio: number | null
  vagas: number | null
  descricao: string | null
  ano_letivo: string
  estado: string
}

export interface Inscricao {
  id: number
  evento_id: number
  educando_id: number | null
  nome: string
  contacto: string | null
  valor: number
  pago: boolean
  movimento_id: number | null
  notas: string | null
}
