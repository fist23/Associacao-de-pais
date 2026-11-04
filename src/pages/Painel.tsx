import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import type { Evento, Movimento } from '../lib/types'
import { dataPT, euro, hoje } from '../lib/util'
import { somar } from '../lib/dados'

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
  const { config } = useSessao()
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

  if (!r) return <p>A carregar…</p>
  const max = Math.max(1, ...r.porCategoria.map((c) => Math.max(c.receita, c.despesa)))

  return (
    <>
      <h1>Painel · {config.ano_letivo}</h1>
      <div className="grelha-kpi">
        <div className="kpi destaque"><span>Saldo atual</span><b>{euro(r.saldo)}</b></div>
        <div className="kpi"><span>Receitas do ano</span><b className="pos">{euro(r.receitasAno)}</b></div>
        <div className="kpi"><span>Despesas do ano</span><b className="neg">{euro(r.despesasAno)}</b></div>
        <div className="kpi">
          <span>Quotas pagas</span>
          <b>{r.quotasPagas} / {r.socios}</b>
          <small>{r.socios - r.quotasPagas > 0 ? `${r.socios - r.quotasPagas} em falta` : 'Todas pagas'}</small>
        </div>
      </div>

      <div className="duas-colunas">
        <section className="cartao">
          <h2>Próximos eventos</h2>
          {r.eventos.length === 0 && <p className="subtil">Sem eventos agendados.</p>}
          <ul className="lista-simples">
            {r.eventos.map((e) => (
              <li key={e.id}>
                <Link to={`/eventos/${e.id}`}>{e.nome}</Link>
                <span className="subtil">{dataPT(e.data)} · {e.tipo}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao">
          <h2>Por categoria ({config.ano_letivo})</h2>
          {r.porCategoria.length === 0 && <p className="subtil">Ainda não há movimentos este ano.</p>}
          {r.porCategoria.map((c) => (
            <div key={c.categoria} className="barra-linha">
              <span>{c.categoria}</span>
              <div className="barras">
                {c.receita > 0 && <div className="barra pos" style={{ width: `${(c.receita / max) * 100}%` }} title={euro(c.receita)} />}
                {c.despesa > 0 && <div className="barra neg" style={{ width: `${(c.despesa / max) * 100}%` }} title={euro(c.despesa)} />}
              </div>
              <span className="valor">{c.receita > 0 && <span className="pos">+{euro(c.receita)}</span>} {c.despesa > 0 && <span className="neg">−{euro(c.despesa)}</span>}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}
