import type { ReactNode } from 'react'

/** Cor de folha (do logótipo) para cada ano escolar */
export function corAno(ano: string) {
  if (ano.startsWith('Pré')) return 'c-laranja'
  return { '1.º': 'c-lima', '2.º': 'c-turquesa', '3.º': 'c-rosa', '4.º': 'c-roxo' }[ano] ?? 'c-cinza'
}

/** Cor de folha para cada tipo de evento */
export function corTipo(tipo: string) {
  return { Festa: 'c-rosa', Passeio: 'c-turquesa', Atividade: 'c-lima', Angariação: 'c-laranja' }[tipo] ?? 'c-roxo'
}

export function AnoEscolar({ ano, turma }: { ano: string; turma?: string }) {
  return (
    <span className={`ano ${corAno(ano)}`}>
      <span className="folha" aria-hidden />
      {ano}
      {turma ? ` · ${turma}` : ''}
    </span>
  )
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function DataBloco({ data, mostrarAno }: { data: string; mostrarAno?: boolean }) {
  const d = data?.slice(0, 10)
  if (!d) return <div className="data-bloco"><span className="mes">data</span><span className="dia">?</span></div>
  const [a, m, dia] = d.split('-')
  return (
    <div className="data-bloco" aria-label={`${dia}/${m}/${a}`}>
      <span className="mes">{MESES[Number(m) - 1]}</span>
      <span className="dia">{Number(dia)}</span>
      {mostrarAno && <span className="ano-d">{a}</span>}
    </div>
  )
}

export function PaginaTopo({ sobre, titulo, children, descricao }: { sobre?: string; titulo: string; descricao?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pagina-topo">
      <div>
        {sobre && <span className="sobre">{sobre}</span>}
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {children && <div className="acoes">{children}</div>}
    </div>
  )
}
