import { createContext, useContext } from 'react'
import type { Configuracao, Papel } from './types'

export interface Sessao {
  id: string
  nome: string
  papel: Papel
  config: Configuracao
  recarregarConfig: () => Promise<void>
}

export const SessaoCtx = createContext<Sessao | null>(null)

export function useSessao() {
  const s = useContext(SessaoCtx)
  if (!s) throw new Error('Sessão indisponível')
  return {
    ...s,
    podeEditar: s.papel !== 'leitura',
    podeApagarMov: s.papel === 'admin' || s.papel === 'tesoureiro',
    admin: s.papel === 'admin',
  }
}
