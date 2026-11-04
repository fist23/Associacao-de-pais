import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { ESTADOS_EVENTO, TIPOS_EVENTO, type Evento, type Inscricao, type Movimento } from '../lib/types'
import { dataPT, dia, euro, num, paraPB, tentar } from '../lib/util'
import { somar } from '../lib/dados'
import Modal from '../components/Modal'

export default function Eventos() {
  const { config, podeEditar } = useSessao()
  const [ano, setAno] = useState(config.ano_letivo)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [movs, setMovs] = useState<Movimento[]>([])
  const [anos, setAnos] = useState<string[]>([config.ano_letivo])
  const [novo, setNovo] = useState(false)
  const navigate = useNavigate()

  const carregar = useCallback(async () => {
    const f = pb.filter('ano_letivo = {:ano}', { ano })
    const [e, i, m, todosAnos] = await Promise.all([
      pb.collection('eventos').getFullList<Evento>({ filter: f, sort: '-data' }),
      pb.collection('inscricoes').getFullList<Inscricao>({ filter: pb.filter('evento.ano_letivo = {:ano}', { ano }), fields: 'evento,pago' }),
      pb.collection('movimentos').getFullList<Movimento>({ filter: 'evento != ""', fields: 'evento,tipo,valor' }),
      pb.collection('eventos').getFullList<Evento>({ fields: 'ano_letivo' }),
    ])
    setEventos(e)
    setInscricoes(i)
    setMovs(m)
    setAnos([...new Set([config.ano_letivo, ...todosAnos.map((x) => x.ano_letivo)])].sort().reverse())
  }, [ano, config.ano_letivo])

  useEffect(() => {
    carregar()
  }, [carregar])

  const porEvento = useMemo(() => {
    const r = new Map<string, { inscritos: number; pagos: number; rec: number; desp: number }>()
    for (const e of eventos) {
      const ins = inscricoes.filter((i) => i.evento === e.id)
      const ms = movs.filter((m) => m.evento === e.id)
      r.set(e.id, { inscritos: ins.length, pagos: ins.filter((i) => i.pago).length, rec: somar(ms, 'receita'), desp: somar(ms, 'despesa') })
    }
    return r
  }, [eventos, inscricoes, movs])

  return (
    <>
      <div className="cabecalho">
        <h1>Festas e passeios</h1>
        <div className="acoes">
          <select value={ano} onChange={(e) => setAno(e.target.value)}>
            {anos.map((a) => <option key={a}>{a}</option>)}
          </select>
          {podeEditar && <button onClick={() => setNovo(true)}>+ Novo evento</button>}
        </div>
      </div>

      {eventos.length === 0 && <p className="subtil">Ainda não há eventos em {ano}.</p>}
      <div className="grelha-eventos">
        {eventos.map((e) => {
          const r = porEvento.get(e.id)!
          return (
            <Link to={`/eventos/${e.id}`} key={e.id} className={`cartao evento estado-${e.estado.toLowerCase()}`}>
              <div className="evento-topo">
                <span className="etiqueta">{e.tipo}</span>
                <span className="etiqueta estado">{e.estado}</span>
              </div>
              <h3>{e.nome}</h3>
              <p className="subtil">{dataPT(e.data)}{e.local ? ` · ${e.local}` : ''}</p>
              <div className="evento-numeros">
                <div><span>Inscritos</span><b>{r.inscritos}{e.vagas ? ` / ${e.vagas}` : ''}</b></div>
                <div><span>Pagos</span><b>{r.pagos}</b></div>
                <div><span>Resultado</span><b className={r.rec - r.desp >= 0 ? 'pos' : 'neg'}>{euro(r.rec - r.desp)}</b></div>
              </div>
            </Link>
          )
        })}
      </div>

      {novo && (
        <FormEvento
          evento={null}
          onFechar={() => setNovo(false)}
          onGuardado={(id) => navigate(`/eventos/${id}`)}
        />
      )}
    </>
  )
}

export function FormEvento(props: { evento: Evento | null; onFechar: () => void; onGuardado: (id: string) => void }) {
  const { config } = useSessao()
  const e = props.evento
  const [f, setF] = useState({
    nome: e?.nome ?? '',
    tipo: e?.tipo ?? 'Festa',
    data: dia(e?.data),
    local: e?.local ?? '',
    preco: e ? String(e.preco).replace('.', ',') : '0',
    preco_nao_socio: e?.preco_nao_socio ? String(e.preco_nao_socio).replace('.', ',') : '',
    vagas: e?.vagas ? String(e.vagas) : '',
    descricao: e?.descricao ?? '',
    estado: e?.estado ?? 'Aberto',
    ano_letivo: e?.ano_letivo ?? config.ano_letivo,
  })
  const [aGuardar, setAGuardar] = useState(false)
  const muda = (k: keyof typeof f) => (x: { target: { value: string } }) => setF({ ...f, [k]: x.target.value })

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    setAGuardar(true)
    const dados = {
      ...f,
      data: paraPB(f.data),
      preco: num(f.preco),
      preco_nao_socio: num(f.preco_nao_socio),
      vagas: Math.round(num(f.vagas)),
    }
    let id = e?.id ?? ''
    const ok = await tentar(async () => {
      const r = e ? await pb.collection('eventos').update<Evento>(e.id, dados) : await pb.collection('eventos').create<Evento>(dados)
      id = r.id
    })
    setAGuardar(false)
    if (ok) props.onGuardado(id)
  }

  return (
    <Modal titulo={e ? 'Editar evento' : 'Novo evento'} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <label>Nome *<input value={f.nome} onChange={muda('nome')} required placeholder="Ex.: Festa de Natal, Visita ao Oceanário" /></label>
        <div className="linha-form">
          <label>
            Tipo
            <select value={f.tipo} onChange={muda('tipo')}>{TIPOS_EVENTO.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label>Data<input type="date" value={f.data} onChange={muda('data')} /></label>
        </div>
        <label>Local<input value={f.local} onChange={muda('local')} /></label>
        <div className="linha-form">
          <label>Preço sócio (€)<input inputMode="decimal" value={f.preco} onChange={muda('preco')} /></label>
          <label>Preço não sócio (€)<input inputMode="decimal" value={f.preco_nao_socio} onChange={muda('preco_nao_socio')} placeholder="igual" /></label>
          <label className="estreito">Vagas<input inputMode="numeric" value={f.vagas} onChange={muda('vagas')} placeholder="∞" /></label>
        </div>
        <label>Descrição / notas<textarea rows={3} value={f.descricao} onChange={muda('descricao')} /></label>
        <div className="linha-form">
          <label>
            Estado
            <select value={f.estado} onChange={muda('estado')}>{ESTADOS_EVENTO.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <label>Ano letivo<input value={f.ano_letivo} onChange={muda('ano_letivo')} pattern="\d{4}/\d{4}" required /></label>
        </div>
        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}
