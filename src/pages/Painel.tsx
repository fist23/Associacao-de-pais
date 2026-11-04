import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import type { Evento, Movimento } from '../lib/types'
import { euro, hoje } from '../lib/util'
import { somar } from '../lib/dados'
import { DataBloco, PaginaTopo, corTipo } from '../components/Visual'

interface Resumo {
  saldo: number
  receitasAno: number
  despesasAno: number
  socios: number
  quotasPagas: number
  porCategoria: { categoria: string; receita: number; despesa: number }[]
  eventos: Evento[]
}

export default function Painel() {
  const { config, nome } = useSessao()
  const [r, setR] = useState<Resumo | null>(null)

  useEffect(() => {
    ;(async () => {
      const ano = config.ano_letivo
      const [todos, socios, quotas, eventos] = await Promise.all([
        pb.collection('movimentos').getFullList<Movimento>({ fields: 'tipo,valor,categoria,ano_letivo' }),
        pb.collection('socios').getList(1, 1, { filter: 'ativo = true', fields: 'id' }),
        pb.collection('quotas').getList(1, 1, { filter: pb.filter('ano_letivo = {:ano}', { ano }), fields: 'id' }),
        pb.collection('eventos').getList<Evento>(1, 5, {
          filter: pb.filter('data >= {:d} && estado != "Cancelado"', { d: `${hoje()} 00:00:00.000Z` }),
          sort: 'data',
        }),
      ])
      const doAno = todos.filter((m) => m.ano_letivo === ano)
      const cats = new Map<string, { receita: number; despesa: number }>()
      for (const m of doAno) {
        const c = cats.get(m.categoria) ?? { receita: 0, despesa: 0 }
        c[m.tipo] += m.valor
        cats.set(m.categoria, c)
      }
      setR({
        saldo: config.saldo_inicial + somar(todos, 'receita') - somar(todos, 'despesa'),
        receitasAno: somar(doAno, 'receita'),
        despesasAno: somar(doAno, 'despesa'),
        socios: socios.totalItems,
        quotasPagas: quotas.totalItems,
        porCategoria: [...cats].map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => b.receita + b.despesa - a.receita - a.despesa),
        eventos: eventos.items,
      })
    })().catch(() => {})
  }, [config])

  if (!r) return <p className="ajuda">A carregar…</p>
  const max = Math.max(1, ...r.porCategoria.map((c) => Math.max(c.receita, c.despesa)))
  const emFalta = r.socios - r.quotasPagas
  const primeiroNome = nome.split(' ')[0]

  return (
    <>
      <PaginaTopo sobre={`Ano letivo ${config.ano_letivo}`} titulo={`Olá, ${primeiroNome}`} />

      <div className="contas">
        <div className="kpi saldo"><span>Saldo atual</span><b>{euro(r.saldo)}</b><small>caixa + banco</small></div>
        <div className="kpi"><span>Receitas</span><b className="receita">{euro(r.receitasAno)}</b><small>neste ano letivo</small></div>
        <div className="kpi"><span>Despesas</span><b className="despesa">{euro(r.despesasAno)}</b><small>neste ano letivo</small></div>
        <div className="kpi">
          <span>Quotas</span>
          <b>{r.quotasPagas}<small style={{ fontSize: '1rem' }}> / {r.socios}</small></b>
          <small>{r.socios === 0 ? 'sem sócios ativos' : emFalta > 0 ? <Link to="/socios?f=falta">{emFalta} por pagar →</Link> : 'todas pagas'}</small>
        </div>
      </div>

      <div className="duas-colunas">
        <section className="painel">
          <h2>Próximos eventos</h2>
          {r.eventos.length === 0 ? (
            <p className="ajuda">Sem eventos agendados. <Link to="/eventos">Criar um evento</Link></p>
          ) : (
            <ul className="lista-eventos">
              {r.eventos.map((e) => (
                <li key={e.id} className={corTipo(e.tipo)}>
                  <Link to={`/eventos/${e.id}`}>
                    <DataBloco data={e.data} />
                    <span>
                      <b>{e.nome}</b>
                      <span className="secundaria">{e.tipo}{e.local ? ` · ${e.local}` : ''}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="painel">
          <h2>Para onde vai o dinheiro</h2>
          {r.porCategoria.length === 0 && <p className="ajuda">Ainda não há movimentos este ano letivo.</p>}
          {r.porCategoria.map((c) => (
            <div key={c.categoria} className="categoria">
              <span>{c.categoria}</span>
              <div className="barras" aria-hidden>
                {c.receita > 0 && <div className="barra receita" style={{ width: `${(c.receita / max) * 100}%` }} />}
                {c.despesa > 0 && <div className="barra despesa" style={{ width: `${(c.despesa / max) * 100}%` }} />}
              </div>
              <span className="valor">
                {c.receita > 0 && <span className="receita">+{euro(c.receita)}</span>}
                {c.receita > 0 && c.despesa > 0 && <br />}
                {c.despesa > 0 && <span className="despesa">−{euro(c.despesa)}</span>}
              </span>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
