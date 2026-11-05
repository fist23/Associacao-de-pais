import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { CATEGORIAS_DESPESA, type Evento, type Vale } from '../lib/types'
import { dataPT, dia, euro, hoje, num, paraPB, plural, tentar } from '../lib/util'
import { criarMovimento } from '../lib/dados'
import { numeroVale, porExtenso } from '../lib/tesouraria'
import Modal from '../components/Modal'
import { PaginaTopo } from '../components/Visual'
import { SeparadoresTesouraria } from './Tesouraria'

type Filtro = 'Pendente' | 'Regularizado' | 'Anulado' | ''

/**
 * Vales de caixa: dinheiro entregue da caixa a alguém (ex.: para compras de um evento),
 * que depois é regularizado com a fatura e o troco.
 */
export default function Vales() {
  const { config, podeEditar, podeApagarMov } = useSessao()
  const [vales, setVales] = useState<Vale[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [ano, setAno] = useState(config.ano_letivo)
  const [filtro, setFiltro] = useState<Filtro>('')
  const [emitir, setEmitir] = useState(false)
  const [regularizar, setRegularizar] = useState<Vale | null>(null)
  const [imprimir, setImprimir] = useState<Vale | null>(null)

  const carregar = useCallback(async () => {
    const [v, e] = await Promise.all([
      pb.collection('vales').getFullList<Vale>({ sort: '-ano_letivo,-numero' }),
      pb.collection('eventos').getFullList<Evento>({ sort: '-data', fields: 'id,nome,ano_letivo' }),
    ])
    setVales(v)
    setEventos(e)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const anos = useMemo(() => [...new Set([config.ano_letivo, ...vales.map((v) => v.ano_letivo)])].sort().reverse(), [vales, config])
  const nomeEvento = new Map(eventos.map((e) => [e.id, e.nome]))
  const doAno = vales.filter((v) => v.ano_letivo === ano)
  const visiveis = doAno.filter((v) => !filtro || v.estado === filtro)
  const pendentes = vales.filter((v) => v.estado === 'Pendente')
  const totalPendente = pendentes.reduce((t, v) => t + v.valor_entregue, 0)
  const regularizados = doAno.filter((v) => v.estado === 'Regularizado')

  async function anular(v: Vale) {
    if (!confirm(`Anular o vale n.º ${numeroVale(v)}?\nUse quando o dinheiro foi devolvido na totalidade sem ser gasto.`)) return
    if (await tentar(() => pb.collection('vales').update(v.id, { estado: 'Anulado', data_regularizacao: paraPB(hoje()) }))) carregar()
  }

  async function reabrir(v: Vale) {
    if (!confirm(`Reabrir o vale n.º ${numeroVale(v)}?\nA despesa criada na regularização é apagada da tesouraria.`)) return
    const ok = await tentar(async () => {
      if (v.movimento) await pb.collection('movimentos').delete(v.movimento)
      await pb.collection('vales').update(v.id, { estado: 'Pendente', valor_gasto: 0, documento: '', data_regularizacao: '', movimento: '' })
    })
    if (ok) carregar()
  }

  if (imprimir) return <ImprimirVale vale={imprimir} nomeAssociacao={config.nome_associacao} evento={nomeEvento.get(imprimir.evento)} onFechar={() => setImprimir(null)} />

  return (
    <>
      <PaginaTopo sobre={`Ano letivo ${ano}`} titulo="Tesouraria">
        {podeEditar && <button onClick={() => setEmitir(true)}>Emitir vale de caixa</button>}
      </PaginaTopo>
      <SeparadoresTesouraria />

      <div className="contas contas-3">
        <div className="kpi">
          <span>Por regularizar</span>
          <b className={totalPendente > 0 ? 'alerta-texto' : ''}>{euro(totalPendente)}</b>
          <small>{plural(pendentes.length, 'vale')} em aberto</small>
        </div>
        <div className="kpi">
          <span>Regularizados em {ano}</span>
          <b>{regularizados.length}</b>
          <small>{euro(regularizados.reduce((t, v) => t + v.valor_gasto, 0))} gastos</small>
        </div>
        <div className="kpi">
          <span>Troco devolvido em {ano}</span>
          <b>{euro(regularizados.reduce((t, v) => t + Math.max(0, v.valor_entregue - v.valor_gasto), 0))}</b>
          <small>voltou para a caixa</small>
        </div>
      </div>

      <p className="ajuda" style={{ maxWidth: '75ch' }}>
        Um vale regista dinheiro que sai da caixa para alguém fazer compras. Enquanto está <b>pendente</b>, o dinheiro não conta como
        despesa. Ao <b>regularizar</b>, indica quanto foi gasto (com a fatura) e quanto foi devolvido: a despesa entra na tesouraria
        e o troco volta à caixa.
      </p>

      <div className="filtros">
        <select value={ano} onChange={(e) => setAno(e.target.value)} aria-label="Ano letivo">
          {anos.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Estado">
          <option value="">Todos os estados</option>
          <option value="Pendente">Pendentes</option>
          <option value="Regularizado">Regularizados</option>
          <option value="Anulado">Anulados</option>
        </select>
        <span className="contagem">{plural(visiveis.length, 'vale')}</span>
      </div>

      <div className="tabela">
        <table className="cartoes">
          <thead>
            <tr><th>N.º</th><th>Entregue a</th><th className="num">Valor</th><th>Estado</th><th aria-label="Ações" /></tr>
          </thead>
          <tbody>
            {visiveis.map((v) => (
              <tr key={v.id}>
                <td className="secundaria" style={{ whiteSpace: 'nowrap' }}>
                  <b style={{ color: 'var(--tinta)' }}>{numeroVale(v)}</b>
                  <span className="secundaria">{dataPT(v.data)}</span>
                </td>
                <td>
                  <b>{v.beneficiario}</b>
                  <span className="secundaria">{v.motivo}{v.evento && nomeEvento.get(v.evento) ? ` · ${nomeEvento.get(v.evento)}` : ''}</span>
                </td>
                <td className="num m-lado">
                  {euro(v.valor_entregue)}
                  {v.estado === 'Regularizado' && (
                    <span className="secundaria">
                      gasto {euro(v.valor_gasto)}
                      {v.valor_entregue - v.valor_gasto > 0.004 && <><br />troco {euro(v.valor_entregue - v.valor_gasto)}</>}
                      {v.valor_gasto - v.valor_entregue > 0.004 && <><br />reposto {euro(v.valor_gasto - v.valor_entregue)}</>}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`estado ${v.estado === 'Pendente' ? 'alerta' : v.estado === 'Regularizado' ? 'pago' : ''}`}>{v.estado}</span>
                  {v.estado !== 'Pendente' && v.data_regularizacao && <span className="secundaria">{dataPT(v.data_regularizacao)}</span>}
                </td>
                <td>
                  <div className="acoes" style={{ justifyContent: 'flex-end' }}>
                    {podeEditar && v.estado === 'Pendente' && <button className="pequeno" onClick={() => setRegularizar(v)}>Regularizar</button>}
                    {podeEditar && v.estado === 'Pendente' && <button className="secundario pequeno" onClick={() => anular(v)}>Anular</button>}
                    {podeApagarMov && v.estado === 'Regularizado' && <button className="secundario pequeno" onClick={() => reabrir(v)}>Reabrir</button>}
                    <button className="secundario pequeno" onClick={() => setImprimir(v)}>Imprimir</button>
                  </div>
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr><td colSpan={5} className="vazio">{doAno.length ? 'Nenhum vale com este estado.' : `Ainda não há vales em ${ano}.`}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {emitir && (
        <FormEmitir
          eventos={eventos.filter((e) => e.ano_letivo === config.ano_letivo)}
          onFechar={() => setEmitir(false)}
          onGuardado={async (v) => {
            setEmitir(false)
            await carregar()
            if (confirm(`Vale n.º ${numeroVale(v)} emitido. Imprimir agora para assinar?`)) setImprimir(v)
          }}
        />
      )}
      {regularizar && (
        <FormRegularizar
          vale={regularizar}
          evento={eventos.find((e) => e.id === regularizar.evento)}
          onFechar={() => setRegularizar(null)}
          onGuardado={() => {
            setRegularizar(null)
            carregar()
          }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------

function FormEmitir(props: { eventos: Evento[]; onFechar: () => void; onGuardado: (v: Vale) => void }) {
  const { config } = useSessao()
  const [f, setF] = useState({ data: hoje(), beneficiario: '', motivo: '', valor: '', evento: '', notas: '' })
  const [aGuardar, setAGuardar] = useState(false)
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (num(f.valor) <= 0) return alert('O valor tem de ser maior que zero.')
    setAGuardar(true)
    let criado: Vale | null = null
    const ok = await tentar(async () => {
      // Número sequencial por ano letivo (tenta de novo se outra pessoa emitiu um vale ao mesmo tempo)
      for (let tentativa = 0; tentativa < 3 && !criado; tentativa++) {
        const ultimo = await pb.collection('vales').getList<Vale>(1, 1, {
          filter: pb.filter('ano_letivo = {:a}', { a: config.ano_letivo }),
          sort: '-numero',
          fields: 'numero',
        })
        try {
          criado = await pb.collection('vales').create<Vale>({
            ...f,
            numero: (ultimo.items[0]?.numero ?? 0) + 1,
            ano_letivo: config.ano_letivo,
            data: paraPB(f.data),
            valor_entregue: num(f.valor),
            estado: 'Pendente',
            criado_por: pb.authStore.record?.id,
          })
        } catch (err) {
          if (tentativa === 2) throw err
        }
      }
    })
    setAGuardar(false)
    if (ok && criado) props.onGuardado(criado)
  }

  return (
    <Modal titulo="Emitir vale de caixa" onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <div className="linha-form">
          <label>Data *<input type="date" value={f.data} onChange={muda('data')} required /></label>
          <label>Valor entregue (€) *<input inputMode="decimal" value={f.valor} onChange={muda('valor')} required placeholder="0,00" /></label>
        </div>
        {num(f.valor) > 0 && <p className="ajuda" style={{ marginTop: '-0.4rem' }}>{porExtenso(num(f.valor))}</p>}
        <label>Entregue a *<input value={f.beneficiario} onChange={muda('beneficiario')} required placeholder="Nome de quem recebe o dinheiro" /></label>
        <label>Para *<input value={f.motivo} onChange={muda('motivo')} required placeholder="Ex.: compra de castanhas para o Magusto" /></label>
        <label>
          Evento (opcional)
          <select value={f.evento} onChange={muda('evento')}>
            <option value="">— nenhum —</option>
            {props.eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
          </select>
        </label>
        <label>Notas<textarea rows={2} value={f.notas} onChange={muda('notas')} /></label>
        <p className="ajuda">O dinheiro sai da caixa mas só passa a despesa quando o vale for regularizado com a fatura.</p>
        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>{aGuardar ? 'A emitir…' : 'Emitir vale'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FormRegularizar(props: { vale: Vale; evento?: Evento; onFechar: () => void; onGuardado: () => void }) {
  const v = props.vale
  const [f, setF] = useState({
    data: hoje(),
    gasto: String(v.valor_entregue).replace('.', ','),
    documento: '',
    categoria: v.evento ? 'Eventos' : '',
    descricao: v.motivo,
  })
  const [aGuardar, setAGuardar] = useState(false)
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const gasto = num(f.gasto)
  const diferenca = v.valor_entregue - gasto

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (gasto < 0) return alert('O valor gasto não pode ser negativo.')
    if (gasto > 0 && !f.categoria.trim()) return alert('Indique a categoria da despesa.')
    setAGuardar(true)
    const ok = await tentar(async () => {
      let movimento = ''
      if (gasto > 0) {
        const mov = await criarMovimento({
          data: f.data,
          tipo: 'despesa',
          categoria: f.categoria.trim(),
          descricao: `Vale de caixa n.º ${numeroVale(v)} — ${f.descricao.trim()}`,
          valor: gasto,
          metodo: 'Numerário',
          conta: 'Caixa',
          documento: f.documento.trim(),
          ano_letivo: v.ano_letivo,
          evento: v.evento,
        })
        movimento = mov.id
      }
      try {
        await pb.collection('vales').update(v.id, {
          estado: 'Regularizado',
          valor_gasto: gasto,
          documento: f.documento.trim(),
          data_regularizacao: paraPB(f.data),
          movimento,
        })
      } catch (err) {
        if (movimento) await pb.collection('movimentos').delete(movimento).catch(() => {})
        throw err
      }
    })
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  return (
    <Modal titulo={`Regularizar vale n.º ${numeroVale(v)}`} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <p>
          <b>{v.beneficiario}</b> recebeu <b>{euro(v.valor_entregue)}</b> em {dataPT(v.data)} para: {v.motivo}
        </p>
        <div className="linha-form">
          <label>Data *<input type="date" value={f.data} onChange={muda('data')} required /></label>
          <label>Valor gasto (€) *<input inputMode="decimal" value={f.gasto} onChange={muda('gasto')} required /></label>
          <label>N.º fatura / talão<input value={f.documento} onChange={muda('documento')} /></label>
        </div>
        <div className={`aviso-caixa ${diferenca < -0.004 ? '' : 'neutro'}`}>
          {Math.abs(diferenca) < 0.005
            ? 'Gastou exatamente o valor entregue: não há troco.'
            : diferenca > 0
              ? `Troco a devolver à caixa: ${euro(diferenca)}`
              : `Gastou mais ${euro(-diferenca)} do que recebeu: esse valor deve ser-lhe reembolsado da caixa.`}
        </div>
        {gasto > 0 && (
          <>
            <label>Descrição da despesa *<input value={f.descricao} onChange={muda('descricao')} required /></label>
            <label>
              Categoria *
              <input list="categorias-despesa" value={f.categoria} onChange={muda('categoria')} required />
              <datalist id="categorias-despesa">{CATEGORIAS_DESPESA.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <p className="ajuda">
              É criada uma despesa de {euro(gasto)} na Caixa{props.evento ? `, ligada ao evento ${props.evento.nome}` : ''}.
            </p>
          </>
        )}
        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Regularizar'}</button>
        </div>
      </form>
    </Modal>
  )
}

/** Vale de caixa para imprimir e assinar (duas vias na mesma folha: associação e beneficiário) */
function ImprimirVale(p: { vale: Vale; nomeAssociacao: string; evento?: string; onFechar: () => void }) {
  const v = p.vale
  const via = (titulo: string) => (
    <div className="vale-folha">
      <div className="vale-cabecalho">
        <img src="./emblema.png" alt="" />
        <div>
          <b>{p.nomeAssociacao}</b>
          <span>Vale de caixa · {titulo}</span>
        </div>
        <div className="vale-numero">
          <span>N.º</span>
          <b>{numeroVale(v)}</b>
        </div>
      </div>
      <div className="vale-valor">
        <b>{euro(v.valor_entregue)}</b>
        <span>{porExtenso(v.valor_entregue)}</span>
      </div>
      <dl className="vale-dados">
        <dt>Data</dt><dd>{dataPT(v.data)}</dd>
        <dt>Entregue a</dt><dd>{v.beneficiario}</dd>
        <dt>Destino</dt><dd>{v.motivo}{p.evento ? ` (${p.evento})` : ''}</dd>
        {v.notas && <><dt>Notas</dt><dd>{v.notas}</dd></>}
        {v.estado === 'Regularizado' && (
          <>
            <dt>Regularizado</dt>
            <dd>
              {dataPT(v.data_regularizacao)} · gasto {euro(v.valor_gasto)}
              {v.documento ? ` (doc. ${v.documento})` : ''}
              {v.valor_entregue - v.valor_gasto > 0.004 ? ` · troco devolvido ${euro(v.valor_entregue - v.valor_gasto)}` : ''}
            </dd>
          </>
        )}
        {v.estado === 'Anulado' && (<><dt>Estado</dt><dd>Anulado em {dataPT(v.data_regularizacao)}</dd></>)}
      </dl>
      <p className="vale-declaracao">
        Declaro que recebi a quantia acima indicada, que me comprometo a justificar com fatura ou recibo e a devolver o valor não utilizado.
      </p>
      <div className="assinaturas">
        <span>Entregou (Tesouraria)</span>
        <span>Recebeu</span>
      </div>
    </div>
  )

  return (
    <div className="relatorio">
      <div className="acoes nao-imprimir">
        <button className="secundario" onClick={p.onFechar}>← Voltar</button>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      {via('Via da associação')}
      <div className="vale-corte" aria-hidden>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
      {via('Via de quem recebe')}
      <p className="ajuda nao-imprimir">Emitido em {dataPT(dia(v.created) || hoje())}.</p>
    </div>
  )
}
