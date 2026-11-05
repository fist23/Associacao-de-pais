import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { ANOS_ESCOLARES, METODOS, type Educando, type Quota, type Socio } from '../lib/types'
import { dataPT, dia, euro, exportarCSV, hoje, num, paraPB, tentar } from '../lib/util'
import { anularQuota, pagarQuota } from '../lib/dados'
import Modal from '../components/Modal'
import { AnoEscolar, PaginaTopo } from '../components/Visual'
import { useSearchParams } from 'react-router-dom'

type Filtro = 'todos' | 'pagas' | 'falta' | 'inativos'

export default function Socios() {
  const { config, podeEditar } = useSessao()
  const ano = config.ano_letivo
  const [socios, setSocios] = useState<Socio[]>([])
  const [educandos, setEducandos] = useState<Educando[]>([])
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [pesquisa, setPesquisa] = useState('')
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState<Filtro>((params.get('f') as Filtro) || 'todos')
  const [aEditar, setAEditar] = useState<Socio | 'novo' | null>(null)
  const [aPagar, setAPagar] = useState<Socio | null>(null)

  const carregar = useCallback(async () => {
    const [s, e, q] = await Promise.all([
      pb.collection('socios').getFullList<Socio>({ sort: 'numero,nome' }),
      pb.collection('educandos').getFullList<Educando>({ sort: 'nome' }),
      pb.collection('quotas').getFullList<Quota>({ filter: pb.filter('ano_letivo = {:ano}', { ano }) }),
    ])
    setSocios(s)
    setEducandos(e)
    setQuotas(q)
  }, [ano])

  useEffect(() => {
    carregar()
  }, [carregar])

  const eduPorSocio = useMemo(() => {
    const m = new Map<string, Educando[]>()
    for (const e of educandos) m.set(e.socio, [...(m.get(e.socio) ?? []), e])
    return m
  }, [educandos])
  const quotaPorSocio = useMemo(() => new Map(quotas.map((q) => [q.socio, q])), [quotas])

  const visiveis = socios.filter((s) => {
    const q = quotaPorSocio.get(s.id)
    if (filtro === 'inativos' ? s.ativo : !s.ativo) return false
    if (filtro === 'pagas' && !q) return false
    if (filtro === 'falta' && q) return false
    if (!pesquisa) return true
    const t = pesquisa.toLowerCase()
    const eds = (eduPorSocio.get(s.id) ?? []).map((e) => `${e.nome} ${e.ano_escolar} ${e.turma}`).join(' ')
    return `${s.numero} ${s.nome} ${s.email} ${s.telefone} ${eds}`.toLowerCase().includes(t)
  })

  async function anular(q: Quota) {
    if (!confirm('Anular o pagamento desta quota? A receita correspondente é apagada da tesouraria.')) return
    if (await tentar(() => anularQuota(q))) carregar()
  }

  function exportar() {
    exportarCSV(
      `socios-${ano.replace('/', '-')}`,
      visiveis.map((s) => ({
        'N.º': s.numero || '',
        'Encarregado de educação': s.nome,
        Email: s.email,
        Telefone: s.telefone,
        NIF: s.nif,
        Educandos: (eduPorSocio.get(s.id) ?? []).map((e) => `${e.nome} (${e.ano_escolar}${e.turma ? ' ' + e.turma : ''})`).join(', '),
        [`Quota ${ano}`]: quotaPorSocio.get(s.id) ? 'Paga' : 'Em falta',
        'Data adesão': dataPT(s.data_adesao),
        'Consentimento RGPD': s.consentimento_rgpd ? 'Sim' : 'Não',
      })),
    )
  }

  const turmasExistentes = [...new Set(educandos.map((e) => e.turma.trim()).filter(Boolean))].sort()
  const proximoNumero = Math.max(0, ...socios.map((s) => s.numero || 0)) + 1

  const totalAtivos = socios.filter((x) => x.ativo).length
  const pagas = socios.filter((x) => x.ativo && quotaPorSocio.has(x.id)).length

  return (
    <>
      <PaginaTopo
        sobre="Famílias associadas"
        titulo="Sócios"
        descricao={`${totalAtivos} sócios ativos · ${pagas} com a quota de ${ano} paga`}
      >
        <button className="secundario" onClick={exportar}>Exportar para Excel</button>
        {podeEditar && <button onClick={() => setAEditar('novo')}>Novo sócio</button>}
      </PaginaTopo>

      <div className="filtros">
        <input type="search" placeholder="Procurar por nome, educando ou turma" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} aria-label="Procurar" />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtro">
          <option value="todos">Todos os ativos</option>
          <option value="pagas">Quota paga</option>
          <option value="falta">Quota por pagar</option>
          <option value="inativos">Inativos</option>
        </select>
        <span className="contagem">{visiveis.length} {visiveis.length === 1 ? 'resultado' : 'resultados'}</span>
      </div>

      <div className="tabela">
        <table className="cartoes">
          <thead>
            <tr>
              <th className="num">N.º</th>
              <th>Encarregado(a) de educação</th>
              <th>Educandos</th>
              <th>Quota {ano}</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((s) => {
              const q = quotaPorSocio.get(s.id)
              return (
                <tr key={s.id}>
                  <td className="num secundaria m-esconder">{s.numero || '—'}</td>
                  <td>
                    <button className="nome" onClick={() => setAEditar(s)}>{s.nome}</button>
                    {!s.consentimento_rgpd && <span className="marcador" title="Falta registar o consentimento RGPD">sem RGPD</span>}
                    <span className="secundaria">
                      {s.telefone && <a href={`tel:${s.telefone.replace(/\s/g, '')}`}>{s.telefone}</a>}
                      {s.telefone && s.email && ' · '}
                      {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
                    </span>
                  </td>
                  <td>
                    {(eduPorSocio.get(s.id) ?? []).map((e) => (
                      <div key={e.id}>
                        {e.nome} <AnoEscolar ano={e.ano_escolar} turma={e.turma} />
                      </div>
                    ))}
                  </td>
                  <td className="m-lado">
                    {q ? (
                      <span className="estado pago" title={`${dataPT(q.data_pagamento)} · ${q.metodo}`}>
                        ✓ {euro(q.valor)}
                        {podeEditar && <button className="ligacao" onClick={() => anular(q)} aria-label="Anular pagamento" title="Anular pagamento">✕</button>}
                      </span>
                    ) : podeEditar && s.ativo ? (
                      <button className="secundario pequeno" onClick={() => setAPagar(s)}>Registar pagamento</button>
                    ) : (
                      <span className="estado falta">Por pagar</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {visiveis.length === 0 && (
              <tr><td colSpan={4} className="vazio">{socios.length === 0 ? 'Ainda não há sócios. Comece por registar a primeira família.' : 'Nenhum sócio corresponde à pesquisa.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {aEditar && (
        <FormSocio
          socio={aEditar === 'novo' ? null : aEditar}
          educandos={aEditar === 'novo' ? [] : eduPorSocio.get(aEditar.id) ?? []}
          proximoNumero={proximoNumero}
          turmas={turmasExistentes}
          podeEditar={podeEditar}
          onFechar={() => setAEditar(null)}
          onGuardado={async () => {
            await carregar()
            setAEditar(null)
          }}
        />
      )}
      {aPagar && (
        <FormQuota
          socio={aPagar}
          ano={ano}
          valor={config.valor_quota}
          onFechar={() => setAPagar(null)}
          onGuardado={() => {
            setAPagar(null)
            carregar()
          }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------

type EduForm = { id?: string; nome: string; ano_escolar: string; turma: string }

function FormSocio(props: {
  socio: Socio | null
  educandos: Educando[]
  turmas: string[]
  proximoNumero: number
  podeEditar: boolean
  onFechar: () => void
  onGuardado: () => void
}) {
  const s = props.socio
  const [f, setF] = useState({
    numero: String(s?.numero || props.proximoNumero),
    nome: s?.nome ?? '',
    email: s?.email ?? '',
    telefone: s?.telefone ?? '',
    nif: s?.nif ?? '',
    data_adesao: dia(s?.data_adesao) || hoje(),
    ativo: s?.ativo ?? true,
    consentimento_rgpd: s?.consentimento_rgpd ?? false,
    notas: s?.notas ?? '',
  })
  const [eds, setEds] = useState<EduForm[]>(
    props.educandos.length
      ? props.educandos.map((e) => ({ id: e.id, nome: e.nome, ano_escolar: e.ano_escolar, turma: e.turma }))
      : [{ nome: '', ano_escolar: '1.º', turma: '' }],
  )
  const [aGuardar, setAGuardar] = useState(false)
  const ro = !props.podeEditar

  const muda = (k: keyof typeof f) => (e: { target: { value: string; checked?: boolean; type?: string } }) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const mudaEdu = (i: number, k: keyof EduForm, v: string) => setEds(eds.map((e, j) => (j === i ? { ...e, [k]: v } : e)))

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    setAGuardar(true)
    const ok = await tentar(async () => {
      let numero = num(f.numero)
      if (!s && f.numero === String(props.proximoNumero)) {
        // Número sugerido: confirma no servidor (outra pessoa pode ter criado um sócio entretanto)
        const ultimo = await pb.collection('socios').getList<Socio>(1, 1, { sort: '-numero', fields: 'numero' })
        numero = Math.max(numero, (ultimo.items[0]?.numero ?? 0) + 1)
      }
      const dados = { ...f, numero, data_adesao: paraPB(f.data_adesao) }
      const socio = s ? await pb.collection('socios').update<Socio>(s.id, dados) : await pb.collection('socios').create<Socio>(dados)
      const validos = eds.filter((e) => e.nome.trim())
      const manter = new Set(validos.map((e) => e.id).filter(Boolean))
      for (const antigo of props.educandos) if (!manter.has(antigo.id)) await pb.collection('educandos').delete(antigo.id)
      for (const e of validos) {
        const d = { socio: socio.id, nome: e.nome.trim(), ano_escolar: e.ano_escolar, turma: e.turma.trim() }
        if (e.id) await pb.collection('educandos').update(e.id, d)
        else await pb.collection('educandos').create(d)
      }
    })
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  async function apagar() {
    if (!s) return
    if (!confirm(`Apagar o sócio ${s.nome}, os seus educandos e o histórico de quotas?\nAs receitas já registadas na tesouraria mantêm-se.\n\nSe a família apenas saiu da escola, é preferível marcá-la como inativa.`)) return
    if (await tentar(() => pb.collection('socios').delete(s.id))) props.onGuardado()
  }

  return (
    <Modal titulo={s ? `Sócio ${s.numero ? 'n.º ' + s.numero : ''}` : 'Novo sócio'} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <fieldset disabled={ro}>
          <div className="linha-form">
            <label className="estreito">N.º<input inputMode="numeric" value={f.numero} onChange={muda('numero')} /></label>
            <label>Encarregado(a) de educação *<input value={f.nome} onChange={muda('nome')} required /></label>
          </div>
          <div className="linha-form">
            <label>Telefone<input type="tel" value={f.telefone} onChange={muda('telefone')} /></label>
            <label>Email<input type="email" value={f.email} onChange={muda('email')} /></label>
          </div>
          <div className="linha-form">
            <label>NIF (para recibos)<input inputMode="numeric" value={f.nif} onChange={muda('nif')} pattern="\d{9}" title="9 dígitos" /></label>
            <label>Data de adesão<input type="date" value={f.data_adesao} onChange={muda('data_adesao')} /></label>
          </div>

          <h3>Educandos</h3>
          <div className="educandos-form">
          {eds.map((e, i) => (
            <div className="linha-form" key={e.id ?? `n${i}`}>
              <label>Nome<input value={e.nome} onChange={(x) => mudaEdu(i, 'nome', x.target.value)} /></label>
              <label className="medio">
                Ano
                <select value={e.ano_escolar} onChange={(x) => mudaEdu(i, 'ano_escolar', x.target.value)}>
                  {ANOS_ESCOLARES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label className="medio">Turma<input value={e.turma} onChange={(x) => mudaEdu(i, 'turma', x.target.value)} placeholder="A, Mista…" list="turmas-existentes" /></label>
              {!ro && <button type="button" onClick={() => setEds(eds.filter((_, j) => j !== i))} aria-label="Remover educando" className="icone">✕</button>}
            </div>
          ))}
          <datalist id="turmas-existentes">{props.turmas.map((t) => <option key={t} value={t} />)}</datalist>
          {!ro && (
            <button type="button" className="secundario pequeno" onClick={() => setEds([...eds, { nome: '', ano_escolar: '1.º', turma: '' }])}>
              + Adicionar educando
            </button>
          )}
          </div>

          <label>Notas<textarea rows={2} value={f.notas} onChange={muda('notas')} /></label>
          <label className="check"><input type="checkbox" checked={f.consentimento_rgpd} onChange={muda('consentimento_rgpd')} /> Autorizou o tratamento dos dados pessoais (RGPD)</label>
          <label className="check"><input type="checkbox" checked={f.ativo} onChange={muda('ativo')} /> Sócio ativo</label>
        </fieldset>
        {!ro && (
          <div className="rodape-modal">
            {s && <button type="button" className="perigo" onClick={apagar}>Apagar</button>}
            <span className="espaco" />
            <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
            <button type="submit" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>
          </div>
        )}
      </form>
    </Modal>
  )
}

function FormQuota(props: { socio: Socio; ano: string; valor: number; onFechar: () => void; onGuardado: () => void }) {
  const [valor, setValor] = useState(String(props.valor))
  const [data, setData] = useState(hoje())
  const [metodo, setMetodo] = useState<string>('Numerário')
  const [aGuardar, setAGuardar] = useState(false)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setAGuardar(true)
    const ok = await tentar(() => pagarQuota(props.socio, props.ano, num(valor), data, metodo))
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  return (
    <Modal titulo={`Quota ${props.ano}`} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <p><b>{props.socio.nome}</b></p>
        <div className="linha-form">
          <label>Valor (€)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required /></label>
          <label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} required /></label>
        </div>
        <label>
          Método de pagamento
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            {METODOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <p className="ajuda">É criada automaticamente uma receita na tesouraria (categoria "Quotas").</p>
        <div className="rodape-modal">
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit" disabled={aGuardar}>Registar pagamento</button>
        </div>
      </form>
    </Modal>
  )
}
