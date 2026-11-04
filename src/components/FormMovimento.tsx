import { useState, type FormEvent } from 'react'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, METODOS, type Evento, type Movimento } from '../lib/types'
import { dia, hoje, num, paraPB, tentar } from '../lib/util'
import Modal from './Modal'

export default function FormMovimento(props: {
  movimento?: Movimento | null
  tipo?: 'receita' | 'despesa'
  evento?: Evento
  eventos: Evento[]
  onFechar: () => void
  onGuardado: () => void
}) {
  const { config, podeEditar, podeApagarMov } = useSessao()
  const m = props.movimento
  const [f, setF] = useState({
    data: dia(m?.data) || hoje(),
    tipo: m?.tipo ?? props.tipo ?? 'despesa',
    categoria: m?.categoria ?? (props.evento ? 'Eventos' : ''),
    descricao: m?.descricao ?? (props.evento ? `${props.evento.nome} — ` : ''),
    valor: m ? String(m.valor).replace('.', ',') : '',
    metodo: m?.metodo ?? 'Numerário',
    documento: m?.documento ?? '',
    evento: m?.evento ?? props.evento?.id ?? '',
    ano_letivo: m?.ano_letivo ?? props.evento?.ano_letivo ?? config.ano_letivo,
  })
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [aGuardar, setAGuardar] = useState(false)
  const ro = !podeEditar
  const automatico = Boolean(m && (m.categoria === 'Quotas' && m.socio))

  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const categorias = f.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (num(f.valor) <= 0) return alert('O valor tem de ser maior que zero.')
    setAGuardar(true)
    const dados: Record<string, unknown> = { ...f, valor: num(f.valor), data: paraPB(f.data) }
    if (ficheiro) dados.comprovativo = ficheiro
    const ok = await tentar(() =>
      m
        ? pb.collection('movimentos').update(m.id, dados)
        : pb.collection('movimentos').create({ ...dados, criado_por: pb.authStore.record?.id }),
    )
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  async function apagar() {
    if (!m || !confirm('Apagar este movimento?')) return
    if (await tentar(() => pb.collection('movimentos').delete(m.id))) props.onGuardado()
  }

  return (
    <Modal titulo={m ? 'Movimento' : f.tipo === 'receita' ? 'Nova receita' : 'Nova despesa'} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <fieldset disabled={ro}>
          <div className="alternar">
            <label className={f.tipo === 'receita' ? 'ativo pos' : ''}>
              <input type="radio" name="tipo" checked={f.tipo === 'receita'} onChange={() => setF({ ...f, tipo: 'receita' })} /> Receita
            </label>
            <label className={f.tipo === 'despesa' ? 'ativo neg' : ''}>
              <input type="radio" name="tipo" checked={f.tipo === 'despesa'} onChange={() => setF({ ...f, tipo: 'despesa' })} /> Despesa
            </label>
          </div>
          <div className="linha-form">
            <label>Data *<input type="date" value={f.data} onChange={muda('data')} required /></label>
            <label>Valor (€) *<input inputMode="decimal" value={f.valor} onChange={muda('valor')} required placeholder="0,00" /></label>
          </div>
          <label>Descrição *<input value={f.descricao} onChange={muda('descricao')} required /></label>
          <div className="linha-form">
            <label>
              Categoria *
              <input list="categorias" value={f.categoria} onChange={muda('categoria')} required />
              <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label>
              Método
              <select value={f.metodo} onChange={muda('metodo')}>
                {METODOS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <div className="linha-form">
            <label>
              Evento
              <select value={f.evento} onChange={muda('evento')}>
                <option value="">— nenhum —</option>
                {props.eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            </label>
            <label>N.º fatura / recibo<input value={f.documento} onChange={muda('documento')} /></label>
          </div>
          <label>
            Comprovativo (foto ou PDF, até 5 MB)
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} />
          </label>
          {m?.comprovativo && (
            <p className="pequeno">
              Atual: <a href={pb.files.getURL(m, m.comprovativo)} target="_blank" rel="noreferrer">{m.comprovativo}</a>
            </p>
          )}
          <label className="estreito">Ano letivo<input value={f.ano_letivo} onChange={muda('ano_letivo')} pattern="\d{4}/\d{4}" /></label>
          {automatico && <p className="subtil pequeno">Este movimento foi criado pelo pagamento de uma quota. Para o anular, use o ecrã Sócios.</p>}
        </fieldset>
        {!ro && (
          <div className="rodape-modal">
            {m && podeApagarMov && !automatico && <button type="button" className="perigo" onClick={apagar}>Apagar</button>}
            <span className="espaco" />
            <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
            <button type="submit" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>
          </div>
        )}
      </form>
    </Modal>
  )
}
