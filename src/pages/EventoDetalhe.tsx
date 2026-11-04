import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { ANOS_ESCOLARES, METODOS, type Educando, type Evento, type Inscricao, type Movimento, type Socio } from '../lib/types'
import { dataPT, euro, exportarCSV, hoje, num, plural, tentar } from '../lib/util'
import { anularPagamentoInscricao, pagarInscricao, somar } from '../lib/dados'
import Modal from '../components/Modal'
import FormMovimento from '../components/FormMovimento'
import { FormEvento } from './Eventos'
import { AnoEscolar, DataBloco, corTipo } from '../components/Visual'
import { IcClipe, IcLixo } from '../components/Icones'

type EducandoExp = Educando & { expand?: { socio?: Socio } }

export default function EventoDetalhe() {
  const { id = '' } = useParams()
  const { podeEditar } = useSessao()
  const navigate = useNavigate()
  const [ev, setEv] = useState<Evento | null>(null)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [movs, setMovs] = useState<Movimento[]>([])
  const [educandos, setEducandos] = useState<EducandoExp[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [editar, setEditar] = useState(false)
  const [inscrever, setInscrever] = useState(false)
  const [aPagar, setAPagar] = useState<Inscricao | null>(null)
  const [mov, setMov] = useState<Movimento | 'despesa' | 'receita' | null>(null)

  const carregar = useCallback(async () => {
    try {
      const f = pb.filter('evento = {:id}', { id })
      const [e, i, m, eds, evs] = await Promise.all([
        pb.collection('eventos').getOne<Evento>(id),
        pb.collection('inscricoes').getFullList<Inscricao>({ filter: f, sort: 'nome' }),
        pb.collection('movimentos').getFullList<Movimento>({ filter: f, sort: 'data' }),
        pb.collection('educandos').getFullList<EducandoExp>({ filter: 'ano_escolar != "Saiu"', expand: 'socio', sort: 'nome' }),
        pb.collection('eventos').getFullList<Evento>({ sort: '-data', fields: 'id,nome,ano_letivo' }),
      ])
      setEv(e)
      setInscricoes(i)
      setMovs(m)
      setEducandos(eds)
      setEventos(evs)
    } catch {
      navigate('/eventos')
    }
  }, [id, navigate])

  useEffect(() => {
    carregar()
  }, [carregar])

  const eduMap = useMemo(() => new Map(educandos.map((e) => [e.id, e])), [educandos])

  if (!ev) return <p>A carregar…</p>

  const rec = somar(movs, 'receita')
  const desp = somar(movs, 'despesa')
  const pagos = inscricoes.filter((i) => i.pago)
  const porReceber = inscricoes.filter((i) => !i.pago).reduce((s, i) => s + i.valor, 0)

  async function remover(i: Inscricao) {
    if (i.pago) return alert('Anule primeiro o pagamento desta inscrição.')
    if (!confirm(`Remover a inscrição de ${i.nome}?`)) return
    if (await tentar(() => pb.collection('inscricoes').delete(i.id))) carregar()
  }

  async function anularPag(i: Inscricao) {
    if (!confirm(`Anular o pagamento de ${i.nome}? A receita correspondente é apagada da tesouraria.`)) return
    if (await tentar(() => anularPagamentoInscricao(i))) carregar()
  }

  async function apagarEvento() {
    if (!ev) return
    if (!confirm(`Apagar o evento "${ev.nome}" e todas as inscrições?\nOs movimentos da tesouraria mantêm-se, mas deixam de estar ligados ao evento.`)) return
    if (await tentar(() => pb.collection('eventos').delete(ev.id))) navigate('/eventos')
  }

  function exportar() {
    exportarCSV(
      `inscritos-${ev!.nome}`,
      inscricoes.map((i) => {
        const e = eduMap.get(i.educando)
        return {
          Nome: i.nome,
          Ano: e?.ano_escolar ?? '',
          Turma: e?.turma ?? '',
          'Encarregado de educação': e?.expand?.socio?.nome ?? '',
          Contacto: i.contacto || e?.expand?.socio?.telefone || '',
          Valor: i.valor.toFixed(2).replace('.', ','),
          Pago: i.pago ? 'Sim' : 'Não',
          Notas: i.notas,
        }
      }),
    )
  }

  return (
    <>
      <Link to="/eventos" className="voltar">← Festas e passeios</Link>
      <div className={`pagina-topo ${corTipo(ev.tipo)}`}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <DataBloco data={ev.data} mostrarAno />
          <div>
            <span className="tipo"><span className="folha" aria-hidden />{ev.tipo}</span>
            <h1>{ev.nome}</h1>
            <p>{ev.local || 'Local por definir'} · <span className="estado">{ev.estado}</span></p>
          </div>
        </div>
        {podeEditar && (
          <div className="acoes">
            <button className="secundario" onClick={() => setEditar(true)}>Editar</button>
            <button className="perigo" onClick={apagarEvento}>Apagar</button>
          </div>
        )}
      </div>
      {ev.descricao && <p style={{ whiteSpace: 'pre-wrap', maxWidth: '70ch' }}>{ev.descricao}</p>}

      <div className="contas">
        <div className="kpi">
          <span>Inscritos</span>
          <b>{inscricoes.length}{ev.vagas ? <small style={{ fontSize: '1rem' }}> / {ev.vagas}</small> : ''}</b>
          <small>{pagos.length} {pagos.length === 1 ? 'pago' : 'pagos'}</small>
        </div>
        <div className="kpi"><span>Receitas</span><b className="receita">{euro(rec)}</b>{porReceber > 0 ? <small>+ {euro(porReceber)} por receber</small> : <small>tudo recebido</small>}</div>
        <div className="kpi"><span>Despesas</span><b className="despesa">{euro(desp)}</b><small>{plural(movs.filter((m) => m.tipo === 'despesa').length, 'movimento')}</small></div>
        <div className="kpi saldo"><span>Resultado</span><b>{euro(rec - desp)}</b><small>{rec - desp >= 0 ? 'lucro para a associação' : 'custo para a associação'}</small></div>
      </div>

      <div className="secao-topo">
        <h2>Inscrições</h2>
        <div className="acoes">
          <button className="secundario" onClick={exportar} disabled={!inscricoes.length}>Exportar lista</button>
          {podeEditar && <button onClick={() => setInscrever(true)}>Inscrever</button>}
        </div>
      </div>
      <div className="tabela">
        <table className="cartoes">
          <thead>
            <tr><th>Criança</th><th>Contacto</th><th className="num">Valor</th><th>Pagamento</th>{podeEditar && <th aria-label="Ações" />}</tr>
          </thead>
          <tbody>
            {inscricoes.map((i) => {
              const e = eduMap.get(i.educando)
              return (
                <tr key={i.id}>
                  <td>
                    <b>{i.nome}</b>{!i.educando && <span className="marcador">não sócio</span>}
                    <span className="secundaria">
                      {e ? <AnoEscolar ano={e.ano_escolar} turma={e.turma} /> : null}
                      {i.notas && <> {i.notas}</>}
                    </span>
                  </td>
                  <td className="secundaria">{i.contacto || e?.expand?.socio?.telefone || '—'}</td>
                  <td className="num m-lado">{euro(i.valor)}</td>
                  <td>
                    {i.pago ? (
                      <span className="estado pago">✓ Pago{podeEditar && <button className="ligacao" onClick={() => anularPag(i)} aria-label="Anular pagamento" title="Anular pagamento">✕</button>}</span>
                    ) : podeEditar ? (
                      <button className="secundario pequeno" onClick={() => setAPagar(i)}>Registar pagamento</button>
                    ) : (
                      <span className="estado falta">Por pagar</span>
                    )}
                  </td>
                  {podeEditar && <td className="num m-lado m-baixo"><button className="icone" onClick={() => remover(i)} aria-label={`Remover ${i.nome}`} title="Remover inscrição"><IcLixo /></button></td>}
                </tr>
              )
            })}
            {inscricoes.length === 0 && <tr><td colSpan={5} className="vazio">Ainda ninguém inscrito.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="secao-topo">
        <h2>Despesas e outras receitas</h2>
        {podeEditar && (
          <div className="acoes">
            <button className="secundario" onClick={() => setMov('receita')}>+ Receita</button>
            <button className="despesa-btn" onClick={() => setMov('despesa')}>+ Despesa</button>
          </div>
        )}
      </div>
      <div className="tabela">
        <table className="cartoes">
          <tbody>
            {movs.map((m) => (
              <tr key={m.id} className="clicavel" onClick={() => setMov(m)}>
                <td className="secundaria" style={{ whiteSpace: 'nowrap' }}>{dataPT(m.data)}</td>
                <td>{m.descricao}{m.comprovativo && <IcClipe />}<span className="secundaria">{m.categoria}</span></td>
                <td className={`num m-lado ${m.tipo}`}>{m.tipo === 'receita' ? '+' : '−'}{euro(m.valor)}</td>
              </tr>
            ))}
            {movs.length === 0 && <tr><td className="vazio">Sem despesas registadas — autocarro, bilhetes, lanches…</td></tr>}
          </tbody>
        </table>
      </div>

      {editar && (
        <FormEvento evento={ev} onFechar={() => setEditar(false)} onGuardado={() => { setEditar(false); carregar() }} />
      )}
      {inscrever && (
        <FormInscrever
          evento={ev}
          educandos={educandos}
          jaInscritos={new Set(inscricoes.map((i) => i.educando).filter(Boolean))}
          vagasLivres={ev.vagas ? ev.vagas - inscricoes.length : Infinity}
          onFechar={() => setInscrever(false)}
          onGuardado={() => { setInscrever(false); carregar() }}
        />
      )}
      {aPagar && (
        <FormPagar inscricao={aPagar} evento={ev} onFechar={() => setAPagar(null)} onGuardado={() => { setAPagar(null); carregar() }} />
      )}
      {mov && (
        <FormMovimento
          movimento={typeof mov === 'string' ? null : mov}
          tipo={typeof mov === 'string' ? mov : undefined}
          evento={ev}
          eventos={eventos}
          onFechar={() => setMov(null)}
          onGuardado={() => { setMov(null); carregar() }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------

function precoPara(ev: Evento, e?: EducandoExp) {
  const socioAtivo = e?.expand?.socio?.ativo
  return socioAtivo || !ev.preco_nao_socio ? ev.preco : ev.preco_nao_socio
}

function FormInscrever(props: {
  evento: Evento
  educandos: EducandoExp[]
  jaInscritos: Set<string>
  vagasLivres: number
  onFechar: () => void
  onGuardado: () => void
}) {
  const [modo, setModo] = useState<'educandos' | 'turma' | 'externo'>('educandos')
  const [pesquisa, setPesquisa] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [anoEsc, setAnoEsc] = useState('1.º')
  const [turma, setTurma] = useState('')
  const [nome, setNome] = useState('')
  const [contacto, setContacto] = useState('')
  const [valorExt, setValorExt] = useState(String(props.evento.preco_nao_socio || props.evento.preco).replace('.', ','))
  const [aGuardar, setAGuardar] = useState(false)

  const disponiveis = props.educandos.filter((e) => !props.jaInscritos.has(e.id))
  const filtrados = disponiveis.filter((e) =>
    `${e.nome} ${e.ano_escolar} ${e.turma} ${e.expand?.socio?.nome ?? ''}`.toLowerCase().includes(pesquisa.toLowerCase()),
  )
  const turmas = [...new Set(props.educandos.filter((e) => e.ano_escolar === anoEsc).map((e) => e.turma))].sort()
  const daTurma = disponiveis.filter((e) => e.ano_escolar === anoEsc && (!turma || e.turma === turma))

  const alternar = (id: string) => {
    const s = new Set(sel)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSel(s)
  }

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    const lista =
      modo === 'externo'
        ? [{ evento: props.evento.id, nome: nome.trim(), contacto, valor: num(valorExt) }]
        : (modo === 'turma' ? daTurma : disponiveis.filter((e) => sel.has(e.id))).map((e) => ({
            evento: props.evento.id,
            educando: e.id,
            nome: e.nome,
            valor: precoPara(props.evento, e),
          }))
    if (!lista.length || (modo === 'externo' && !nome.trim())) return alert('Nada para inscrever.')
    if (lista.length > props.vagasLivres && !confirm(`Só há ${props.vagasLivres} vaga(s) livre(s). Inscrever mesmo assim?`)) return
    setAGuardar(true)
    const ok = await tentar(async () => {
      for (const i of lista) await pb.collection('inscricoes').create(i)
    })
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  return (
    <Modal titulo="Inscrever" onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <div className="alternar">
          {(['educandos', 'turma', 'externo'] as const).map((m) => (
            <label key={m} className={modo === m ? 'ativo' : ''}>
              <input type="radio" checked={modo === m} onChange={() => setModo(m)} />
              {m === 'educandos' ? 'Educandos' : m === 'turma' ? 'Turma inteira' : 'Não sócio'}
            </label>
          ))}
        </div>

        {modo === 'educandos' && (
          <>
            <input type="search" placeholder="Pesquisar educando, turma ou encarregado…" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} autoFocus />
            <div className="lista-escolha">
              {filtrados.map((e) => (
                <label key={e.id} className="check">
                  <input type="checkbox" checked={sel.has(e.id)} onChange={() => alternar(e.id)} />
                  <span>{e.nome} <AnoEscolar ano={e.ano_escolar} turma={e.turma} /></span>
                  <span className="valor">{euro(precoPara(props.evento, e))}</span>
                </label>
              ))}
              {filtrados.length === 0 && <p className="ajuda" style={{ padding: '0.75rem' }}>Nenhum educando disponível.</p>}
            </div>
            <p className="ajuda">{plural(sel.size, 'selecionado')}</p>
          </>
        )}

        {modo === 'turma' && (
          <>
            <div className="linha-form">
              <label>Ano<select value={anoEsc} onChange={(e) => { setAnoEsc(e.target.value); setTurma('') }}>{ANOS_ESCOLARES.filter((a) => a !== 'Saiu').map((a) => <option key={a}>{a}</option>)}</select></label>
              <label>Turma<select value={turma} onChange={(e) => setTurma(e.target.value)}><option value="">Todas</option>{turmas.map((t) => <option key={t} value={t}>{t || '(sem turma)'}</option>)}</select></label>
            </div>
            <p>Serão inscritos <b>{daTurma.length}</b> educando(s) de sócios ainda não inscritos.</p>
          </>
        )}

        {modo === 'externo' && (
          <>
            <label>Nome da criança *<input value={nome} onChange={(e) => setNome(e.target.value)} required /></label>
            <div className="linha-form">
              <label>Contacto do encarregado<input value={contacto} onChange={(e) => setContacto(e.target.value)} /></label>
              <label className="estreito">Valor (€)<input inputMode="decimal" value={valorExt} onChange={(e) => setValorExt(e.target.value)} /></label>
            </div>
          </>
        )}

        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>{aGuardar ? 'A inscrever…' : 'Inscrever'}</button>
        </div>
      </form>
    </Modal>
  )
}

function FormPagar(props: { inscricao: Inscricao; evento: Evento; onFechar: () => void; onGuardado: () => void }) {
  const [valor, setValor] = useState(String(props.inscricao.valor).replace('.', ','))
  const [data, setData] = useState(hoje())
  const [metodo, setMetodo] = useState('Numerário')
  const [aGuardar, setAGuardar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setAGuardar(true)
    const ok = await tentar(async () => {
      let i = props.inscricao
      if (num(valor) !== i.valor) i = await pb.collection('inscricoes').update<Inscricao>(i.id, { valor: num(valor) })
      await pagarInscricao(i, props.evento, data, metodo)
    })
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  return (
    <Modal titulo="Registar pagamento" onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <p><b>{props.inscricao.nome}</b> — {props.evento.nome}</p>
        <div className="linha-form">
          <label>Valor (€)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
          <label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></label>
        </div>
        <label>Método<select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <p className="ajuda">É criada automaticamente uma receita na tesouraria ligada a este evento.</p>
        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>Confirmar</button>
        </div>
      </form>
    </Modal>
  )
}
