import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { ANOS_ESCOLARES, type Educando, type Socio } from '../lib/types'
import { plural, tentar } from '../lib/util'
import { AnoEscolar, PaginaTopo, corAno } from '../components/Visual'

type EducandoExp = Educando & { expand?: { socio?: Socio } }
type Proposta = { ano: string; turma: string }

const SEGUINTE: Record<string, string> = {
  'Pré 3 anos': 'Pré 4 anos',
  'Pré 4 anos': 'Pré 5 anos',
  'Pré 5 anos': '1.º',
  '1.º': '2.º',
  '2.º': '3.º',
  '3.º': '4.º',
  '4.º': 'Saiu',
}

/**
 * Passagem de ano letivo com revisão: propõe o ano seguinte para cada educando,
 * mas permite marcar retenções, mudar o ano ou a turma antes de confirmar.
 */
export default function PassagemAno() {
  const { config, admin, recarregarConfig } = useSessao()
  const navigate = useNavigate()
  const [educandos, setEducandos] = useState<EducandoExp[] | null>(null)
  const [propostas, setPropostas] = useState<Record<string, Proposta>>({})
  const [aGuardar, setAGuardar] = useState(false)
  const [a] = config.ano_letivo.split('/').map(Number)
  const [novoAnoLetivo, setNovoAnoLetivo] = useState(`${a + 1}/${a + 2}`)

  useEffect(() => {
    pb.collection('educandos')
      .getFullList<EducandoExp>({ filter: 'ano_escolar != "Saiu"', expand: 'socio', sort: 'nome' })
      .then((lista) => {
        const ordem = (x: string) => ANOS_ESCOLARES.indexOf(x as (typeof ANOS_ESCOLARES)[number])
        lista.sort((x, y) => ordem(x.ano_escolar) - ordem(y.ano_escolar) || x.turma.localeCompare(y.turma) || x.nome.localeCompare(y.nome))
        setEducandos(lista)
        // Ao passar do pré-escolar para o 1.º ano a turma é nova, por isso começa vazia
        setPropostas(Object.fromEntries(lista.map((e) => [e.id, { ano: SEGUINTE[e.ano_escolar] ?? e.ano_escolar, turma: e.ano_escolar === 'Pré 5 anos' ? '' : e.turma }])))
      })
  }, [])

  const grupos = useMemo(() => {
    const m = new Map<string, EducandoExp[]>()
    for (const e of educandos ?? []) m.set(e.ano_escolar, [...(m.get(e.ano_escolar) ?? []), e])
    return [...m]
  }, [educandos])

  if (!admin) return <p>Apenas o administrador pode fazer a passagem de ano letivo.</p>
  if (!educandos) return <p className="ajuda">A carregar…</p>

  const muda = (id: string, p: Partial<Proposta>) => setPropostas({ ...propostas, [id]: { ...propostas[id], ...p } })
  const retidos = educandos.filter((e) => propostas[e.id]?.ano === e.ano_escolar).length
  const saem = educandos.filter((e) => propostas[e.id]?.ano === 'Saiu').length
  const sobem = educandos.length - retidos - saem
  const anoValido = /^\d{4}\/\d{4}$/.test(novoAnoLetivo) && novoAnoLetivo !== config.ano_letivo

  async function confirmar() {
    if (!anoValido) return alert('Indique o novo ano letivo, por exemplo 2027/2028.')
    if (!confirm(`Confirmar a passagem para ${novoAnoLetivo}?\n\n${sobem} ${sobem === 1 ? 'sobe' : 'sobem'} de ano, ${retidos} ${retidos === 1 ? 'fica retido' : 'ficam retidos'} e ${saem} ${saem === 1 ? 'sai' : 'saem'} da escola.`)) return
    setAGuardar(true)
    const ok = await tentar(async () => {
      for (const e of educandos!) {
        const p = propostas[e.id]
        if (p.ano !== e.ano_escolar || p.turma.trim() !== e.turma) {
          await pb.collection('educandos').update(e.id, { ano_escolar: p.ano, turma: p.turma.trim() })
        }
      }
      await pb.collection('configuracao').update(config.id, { ano_letivo: novoAnoLetivo })
    })
    setAGuardar(false)
    if (ok) {
      await recarregarConfig()
      alert(`Ano letivo ${novoAnoLetivo} iniciado.`)
      navigate('/socios')
    }
  }

  return (
    <>
      <Link to="/definicoes" className="voltar">← Definições</Link>
      <PaginaTopo
        sobre={`De ${config.ano_letivo} para…`}
        titulo="Passagem de ano letivo"
        descricao="Reveja o ano proposto para cada educando. Marque quem fica retido, ou mude o ano e a turma, antes de confirmar."
      />

      <div className="passagem-resumo painel">
        <label className="estreito-label">
          Novo ano letivo
          <input value={novoAnoLetivo} onChange={(e) => setNovoAnoLetivo(e.target.value)} pattern="\d{4}/\d{4}" />
        </label>
        <div><b>{sobem}</b><span>{sobem === 1 ? 'sobe' : 'sobem'} de ano</span></div>
        <div><b>{retidos}</b><span>{retidos === 1 ? 'fica retido' : 'ficam retidos'}</span></div>
        <div><b>{saem}</b><span>{saem === 1 ? 'sai' : 'saem'} da escola</span></div>
        <button onClick={confirmar} disabled={aGuardar || !anoValido}>{aGuardar ? 'A guardar…' : `Iniciar ${novoAnoLetivo}`}</button>
      </div>

      {grupos.map(([anoAtual, lista]) => (
        <section key={anoAtual}>
          <div className="secao-topo">
            <h2><span className={corAno(anoAtual)}><span className="folha" aria-hidden /></span> {anoAtual}</h2>
            <span className="contagem">{plural(lista.length, 'educando')}</span>
          </div>
          <div className="tabela">
            <table className="cartoes">
              <thead>
                <tr><th>Educando</th><th>Retido</th><th>Ano em {novoAnoLetivo}</th><th>Turma</th></tr>
              </thead>
              <tbody>
                {lista.map((e) => {
                  const p = propostas[e.id]
                  const retido = p.ano === e.ano_escolar
                  return (
                    <tr key={e.id} className={retido ? 'retido' : ''}>
                      <td>
                        <b>{e.nome}</b>
                        <span className="secundaria"><AnoEscolar ano={e.ano_escolar} turma={e.turma} /> · {e.expand?.socio?.nome}</span>
                      </td>
                      <td>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={retido}
                            onChange={(x) => muda(e.id, { ano: x.target.checked ? e.ano_escolar : SEGUINTE[e.ano_escolar] ?? e.ano_escolar })}
                          />
                          Fica no {e.ano_escolar}
                        </label>
                      </td>
                      <td>
                        <select value={p.ano} onChange={(x) => muda(e.id, { ano: x.target.value })} aria-label={`Ano de ${e.nome} em ${novoAnoLetivo}`}>
                          {ANOS_ESCOLARES.map((a) => <option key={a}>{a}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={p.turma} onChange={(x) => muda(e.id, { turma: x.target.value })} placeholder="Turma" aria-label={`Turma de ${e.nome}`} style={{ maxWidth: 140 }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {educandos.length === 0 && <p className="ajuda">Não há educandos registados.</p>}
    </>
  )
}
