import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import type { Configuracao, Evento, Movimento, Vale } from '../lib/types'
import { dataPT, dia, euro, exportarCSV, plural } from '../lib/util'
import { somar } from '../lib/dados'
import { contaDe, emVales, saldos } from '../lib/tesouraria'
import FormMovimento from '../components/FormMovimento'
import { PaginaTopo } from '../components/Visual'

/** Separadores Movimentos / Vales de caixa */
export function SeparadoresTesouraria() {
  return (
    <nav className="separadores" aria-label="Tesouraria">
      <NavLink to="/tesouraria" end>Movimentos</NavLink>
      <NavLink to="/tesouraria/vales">Vales de caixa</NavLink>
    </nav>
  )
}

const ROTULO_TIPO = { receita: 'Receita', despesa: 'Despesa', transferencia: 'Caixa ⇄ Banco' } as const

export default function Tesouraria() {
  const { config, podeEditar } = useSessao()
  const [todos, setTodos] = useState<Movimento[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [ano, setAno] = useState(config.ano_letivo)
  const [tipo, setTipo] = useState('')
  const [conta, setConta] = useState('')
  const [categoria, setCategoria] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [aEditar, setAEditar] = useState<Movimento | Movimento['tipo'] | null>(null)
  const [relatorio, setRelatorio] = useState(false)
  const [vales, setVales] = useState<Vale[]>([])

  const carregar = useCallback(async () => {
    const [m, e, v] = await Promise.all([
      pb.collection('movimentos').getFullList<Movimento>({ sort: '-data,-created' }),
      pb.collection('eventos').getFullList<Evento>({ sort: '-data' }),
      pb.collection('vales').getFullList<Vale>({ filter: 'estado = "Pendente"' }),
    ])
    setTodos(m)
    setEventos(e)
    setVales(v)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const anos = useMemo(() => [...new Set([config.ano_letivo, ...todos.map((m) => m.ano_letivo)])].sort().reverse(), [todos, config])
  const doAno = todos.filter((m) => m.ano_letivo === ano)
  const categorias = [...new Set(doAno.map((m) => m.categoria))].sort()
  const nomeEvento = new Map(eventos.map((e) => [e.id, e.nome]))

  const visiveis = doAno.filter(
    (m) =>
      (!tipo || m.tipo === tipo) &&
      (!conta || contaDe(m) === conta || m.conta_destino === conta) &&
      (!categoria || m.categoria === categoria) &&
      (!pesquisa || `${m.descricao} ${m.documento} ${m.categoria}`.toLowerCase().includes(pesquisa.toLowerCase())),
  )

  // Saldo no início do ano letivo selecionado = saldo inicial + movimentos de anos anteriores
  const anteriores = todos.filter((m) => m.ano_letivo < ano)
  const abertura = saldos(anteriores, config)
  const saldoAbertura = abertura.total
  const fecho = saldos(todos.filter((m) => m.ano_letivo <= ano), config)
  const rec = somar(doAno, 'receita')
  const desp = somar(doAno, 'despesa')
  const atual = ano === config.ano_letivo
  const valesPendentes = emVales(vales)

  function exportar() {
    exportarCSV(
      `tesouraria-${ano.replace('/', '-')}`,
      visiveis.map((m) => ({
        Data: dataPT(m.data),
        Tipo: ROTULO_TIPO[m.tipo],
        Conta: m.tipo === 'transferencia' ? `${contaDe(m)} → ${m.conta_destino}` : contaDe(m),
        Categoria: m.categoria,
        Descrição: m.descricao,
        Evento: nomeEvento.get(m.evento) ?? '',
        Método: m.metodo,
        Documento: m.documento,
        Valor: (m.tipo === 'despesa' ? -m.valor : m.valor).toFixed(2).replace('.', ','),
      })),
    )
  }

  if (relatorio)
    return (
      <Relatorio
        ano={ano}
        nome={config.nome_associacao}
        movimentos={doAno}
        saldoAbertura={saldoAbertura}
        fecho={fecho}
        valesPendentes={atual ? valesPendentes : 0}
        onFechar={() => setRelatorio(false)}
      />
    )

  return (
    <>
      <PaginaTopo sobre={`Ano letivo ${ano}`} titulo="Tesouraria">
        <button className="secundario" onClick={() => setRelatorio(true)}>Relatório de contas</button>
        <button className="secundario" onClick={exportar}>Exportar para Excel</button>
        {podeEditar && <button className="secundario" onClick={() => setAEditar('transferencia')}>Caixa ⇄ Banco</button>}
        {podeEditar && <button className="receita-btn" onClick={() => setAEditar('receita')}>+ Receita</button>}
        {podeEditar && <button className="despesa-btn" onClick={() => setAEditar('despesa')}>+ Despesa</button>}
      </PaginaTopo>
      <SeparadoresTesouraria />

      <div className="contas">
        <div className="kpi"><span>Saldo inicial</span><b>{euro(saldoAbertura)}</b><small>no início de {ano}</small></div>
        <div className="kpi"><span>Receitas</span><b className="receita">+{euro(rec)}</b><small>{plural(doAno.filter((m) => m.tipo === 'receita').length, 'movimento')}</small></div>
        <div className="kpi"><span>Despesas</span><b className="despesa">−{euro(desp)}</b><small>{plural(doAno.filter((m) => m.tipo === 'despesa').length, 'movimento')}</small></div>
        <div className="kpi saldo"><span>Saldo</span><b>{euro(fecho.total)}</b><small>{atual ? 'atual' : `no fim de ${ano}`}</small></div>
      </div>

      <div className="contas contas-3">
        <div className="kpi">
          <span>Na caixa (dinheiro)</span>
          <b>{euro(fecho.caixa - (atual ? valesPendentes : 0))}</b>
          <small>{atual && valesPendentes > 0 ? `deve estar fisicamente na caixa (${euro(valesPendentes)} em vales)` : 'deve estar fisicamente na caixa'}</small>
        </div>
        <div className="kpi"><span>No banco</span><b>{euro(fecho.banco)}</b><small>deve bater com o extrato</small></div>
        <div className="kpi">
          <span>Vales por regularizar</span>
          <b className={atual && valesPendentes > 0 ? 'alerta-texto' : ''}>{euro(atual ? valesPendentes : 0)}</b>
          <small>{atual ? <NavLink to="/tesouraria/vales">{plural(vales.length, 'vale')} pendente{vales.length === 1 ? '' : 's'} →</NavLink> : '—'}</small>
        </div>
      </div>

      <div className="filtros">
        <input type="search" placeholder="Procurar descrição ou n.º de documento" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} aria-label="Procurar" />
        <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Ano letivo">
          {anos.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          <option value="receita">Só receitas</option>
          <option value="despesa">Só despesas</option>
          <option value="transferencia">Depósitos e levantamentos</option>
        </select>
        <select value={conta} onChange={(e) => setConta(e.target.value)} aria-label="Conta">
          <option value="">Caixa e Banco</option>
          <option value="Caixa">Só Caixa</option>
          <option value="Banco">Só Banco</option>
        </select>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="tabela">
        <table className="cartoes">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Conta</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((m) => (
              <tr key={m.id} className="clicavel" onClick={() => setAEditar(m)}>
                <td className="secundaria" style={{ whiteSpace: 'nowrap' }}>{dataPT(m.data)}</td>
                <td>
                  {m.descricao}
                  {m.evento && nomeEvento.get(m.evento) && <span className="secundaria">{nomeEvento.get(m.evento)}</span>}
                </td>
                <td className="secundaria">{m.categoria}</td>
                <td className="secundaria m-esconder">
                  {m.tipo === 'transferencia' ? `${contaDe(m)} → ${m.conta_destino}` : `${contaDe(m)} · ${m.metodo}`}
                  {m.documento ? ` · ${m.documento}` : ''}
                </td>
                <td className={`num m-lado ${m.tipo}`}>{m.tipo === 'receita' ? '+' : m.tipo === 'despesa' ? '−' : '⇄ '}{euro(m.valor)}</td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr><td colSpan={5} className="vazio">{doAno.length ? 'Nenhum movimento corresponde aos filtros.' : `Ainda não há movimentos em ${ano}.`}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {aEditar && (
        <FormMovimento
          movimento={typeof aEditar === 'string' ? null : aEditar}
          tipo={typeof aEditar === 'string' ? aEditar : undefined}
          eventos={eventos}
          onFechar={() => setAEditar(null)}
          onGuardado={() => {
            setAEditar(null)
            carregar()
          }}
        />
      )}
    </>
  )
}

/** Relatório simples de contas do ano letivo, pronto a imprimir/guardar como PDF para a Assembleia Geral */
function Relatorio(p: {
  ano: string
  nome: string
  movimentos: Movimento[]
  saldoAbertura: number
  fecho: { caixa: number; banco: number; total: number }
  valesPendentes: number
  onFechar: () => void
}) {
  const agrupar = (tipo: 'receita' | 'despesa') => {
    const m = new Map<string, number>()
    for (const x of p.movimentos.filter((x) => x.tipo === tipo)) m.set(x.categoria, (m.get(x.categoria) ?? 0) + x.valor)
    return [...m].sort((a, b) => b[1] - a[1])
  }
  const rec = somar(p.movimentos, 'receita')
  const desp = somar(p.movimentos, 'despesa')
  const ordenados = [...p.movimentos].sort((a, b) => dia(a.data).localeCompare(dia(b.data)))

  return (
    <div className="relatorio">
      <div className="acoes nao-imprimir">
        <button className="secundario" onClick={p.onFechar}>← Voltar</button>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <div className="relatorio-cabecalho">
        <img src="./emblema.png" alt="" />
        <div>
          <h1>{p.nome}</h1>
          <span className="sobre" style={{ margin: 0 }}>Relatório de contas · ano letivo {p.ano}</span>
        </div>
      </div>

      <table className="resumo">
        <tbody>
          <tr><td>Saldo no início do ano letivo</td><td className="num">{euro(p.saldoAbertura)}</td></tr>
          <tr><td>Total de receitas</td><td className="num">{euro(rec)}</td></tr>
          <tr><td>Total de despesas</td><td className="num">{euro(desp)}</td></tr>
          <tr><td>Resultado do ano</td><td className="num">{euro(rec - desp)}</td></tr>
          <tr className="total"><td>Saldo final</td><td className="num">{euro(p.fecho.total)}</td></tr>
        </tbody>
      </table>

      <table className="resumo">
        <thead><tr><th>Saldo final por conta</th><th className="num">Valor</th></tr></thead>
        <tbody>
          <tr><td>Banco</td><td className="num">{euro(p.fecho.banco)}</td></tr>
          <tr><td>Caixa (numerário)</td><td className="num">{euro(p.fecho.caixa - p.valesPendentes)}</td></tr>
          {p.valesPendentes > 0 && <tr><td>Vales de caixa por regularizar</td><td className="num">{euro(p.valesPendentes)}</td></tr>}
        </tbody>
      </table>

      <div className="duas-colunas">
        {(['receita', 'despesa'] as const).map((t) => (
          <table key={t} className="resumo">
            <thead><tr><th>{t === 'receita' ? 'Receitas' : 'Despesas'} por categoria</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {agrupar(t).map(([c, v]) => <tr key={c}><td>{c}</td><td className="num">{euro(v)}</td></tr>)}
            </tbody>
          </table>
        ))}
      </div>

      <h3>Movimentos</h3>
      <table className="resumo">
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Doc.</th><th className="num">Valor</th></tr></thead>
        <tbody>
          {ordenados.map((m) => (
            <tr key={m.id}>
              <td>{dataPT(m.data)}</td>
              <td>{m.descricao}</td>
              <td>{m.categoria}</td>
              <td>{m.documento}</td>
              <td className="num">{m.tipo === 'despesa' ? '−' : m.tipo === 'transferencia' ? '⇄ ' : ''}{euro(m.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ajuda">Emitido em {new Date().toLocaleDateString('pt-PT')}.</p>
      <div className="assinaturas">
        <span>O(A) Tesoureiro(a)</span>
        <span>O(A) Presidente da Direção</span>
      </div>
    </div>
  )
}
