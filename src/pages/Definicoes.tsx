import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import type { Papel } from '../lib/types'
import { num, tentar } from '../lib/util'
import Modal from '../components/Modal'
import { PaginaTopo } from '../components/Visual'

interface Utilizador {
  id: string
  name: string
  email: string
  papel: Papel
}

const NOMES_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  tesoureiro: 'Tesoureiro(a)',
  direcao: 'Direção',
  leitura: 'Só consulta',
}

export default function Definicoes() {
  const { config, admin, recarregarConfig, id: meuId } = useSessao()
  const [f, setF] = useState({
    nome_associacao: config.nome_associacao,
    valor_quota: String(config.valor_quota).replace('.', ','),
    saldo_inicial_caixa: String(config.saldo_inicial_caixa ?? 0).replace('.', ','),
    saldo_inicial_banco: String(config.saldo_inicial_banco ?? 0).replace('.', ','),
  })
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([])
  const [aEditarU, setAEditarU] = useState<Utilizador | 'novo' | null>(null)

  const carregarU = useCallback(async () => {
    if (admin) setUtilizadores(await pb.collection('users').getFullList<Utilizador>({ sort: 'name' }))
  }, [admin])
  useEffect(() => {
    carregarU()
  }, [carregarU])

  async function guardarConfig(e: FormEvent) {
    e.preventDefault()
    const ok = await tentar(() =>
      pb.collection('configuracao').update(config.id, {
        ...f,
        valor_quota: num(f.valor_quota),
        saldo_inicial_caixa: num(f.saldo_inicial_caixa),
        saldo_inicial_banco: num(f.saldo_inicial_banco),
        saldo_inicial: num(f.saldo_inicial_caixa) + num(f.saldo_inicial_banco),
      }),
    )
    if (ok) {
      await recarregarConfig()
      alert('Guardado.')
    }
  }

  return (
    <>
      <PaginaTopo sobre="Associação" titulo="Definições" />

      <div className="duas-colunas">
        <section className="painel">
          <h2>Associação</h2>
          <form onSubmit={guardarConfig}>
            <fieldset disabled={!admin}>
              <label>Nome<input value={f.nome_associacao} onChange={(e) => setF({ ...f, nome_associacao: e.target.value })} required /></label>
              <label className="estreito-label" style={{ maxWidth: 200 }}>Quota anual (€)<input inputMode="decimal" value={f.valor_quota} onChange={(e) => setF({ ...f, valor_quota: e.target.value })} /></label>
              <div className="linha-form">
                <label>
                  Saldo inicial na Caixa (€)
                  <input inputMode="decimal" value={f.saldo_inicial_caixa} onChange={(e) => setF({ ...f, saldo_inicial_caixa: e.target.value })} />
                </label>
                <label>
                  Saldo inicial no Banco (€)
                  <input inputMode="decimal" value={f.saldo_inicial_banco} onChange={(e) => setF({ ...f, saldo_inicial_banco: e.target.value })} />
                </label>
              </div>
              <p className="ajuda">Quanto dinheiro a associação tinha em numerário e no banco quando começou a usar a app.</p>
              <p>Ano letivo atual: <b>{config.ano_letivo}</b></p>
            </fieldset>
            {admin && (
              <div className="rodape-modal">
                <Link to="/passagem-ano" className="botao secundario">Passar para o ano letivo seguinte…</Link>
                <span className="espaco" />
                <button type="submit">Guardar</button>
              </div>
            )}
          </form>
        </section>

        <MudarPassword />
      </div>

      {admin && (
        <>
          <div className="secao-topo">
            <h2>Membros da direção com acesso</h2>
            <button onClick={() => setAEditarU('novo')}>Adicionar membro</button>
          </div>
          <div className="tabela">
          <table className="cartoes">
            <thead><tr><th>Nome</th><th>Email</th><th>Papel</th></tr></thead>
            <tbody>
              {utilizadores.map((u) => (
                <tr key={u.id} className="clicavel" onClick={() => setAEditarU(u)}>
                  <td><b>{u.name}</b>{u.id === meuId && <span className="marcador">eu</span>}</td>
                  <td className="secundaria">{u.email}</td>
                  <td className="m-lado"><span className="estado">{NOMES_PAPEL[u.papel]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="ajuda" style={{ marginTop: '0.75rem' }}>
            Administrador: tudo. Tesoureiro(a): tudo exceto gerir membros e definições. Direção: registar e editar, sem apagar movimentos da tesouraria. Só consulta: ver.
          </p>
        </>
      )}

      {aEditarU && (
        <FormUtilizador
          utilizador={aEditarU === 'novo' ? null : aEditarU}
          eu={aEditarU !== 'novo' && aEditarU.id === meuId}
          onFechar={() => setAEditarU(null)}
          onGuardado={() => {
            setAEditarU(null)
            carregarU()
          }}
        />
      )}
    </>
  )
}

function MudarPassword() {
  const [f, setF] = useState({ oldPassword: '', password: '', passwordConfirm: '' })
  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (f.password !== f.passwordConfirm) return alert('As palavras-passe não coincidem.')
    const u = pb.authStore.record!
    const ok = await tentar(async () => {
      await pb.collection('users').update(u.id, f)
      await pb.collection('users').authWithPassword(u.email, f.password)
    })
    if (ok) {
      setF({ oldPassword: '', password: '', passwordConfirm: '' })
      alert('Palavra-passe alterada.')
    }
  }
  return (
    <section className="painel">
      <h2>A minha palavra-passe</h2>
      <form onSubmit={guardar}>
        <label>Atual<input type="password" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} required autoComplete="current-password" /></label>
        <label>Nova (mínimo 8 caracteres)<input type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="new-password" /></label>
        <label>Repetir nova<input type="password" minLength={8} value={f.passwordConfirm} onChange={(e) => setF({ ...f, passwordConfirm: e.target.value })} required autoComplete="new-password" /></label>
        <div className="rodape-modal"><span className="espaco" /><button type="submit">Alterar</button></div>
      </form>
    </section>
  )
}

function FormUtilizador(props: { utilizador: Utilizador | null; eu: boolean; onFechar: () => void; onGuardado: () => void }) {
  const u = props.utilizador
  const [f, setF] = useState({ name: u?.name ?? '', email: u?.email ?? '', papel: u?.papel ?? 'direcao', password: '' })

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const dados: Record<string, unknown> = { name: f.name, email: f.email, emailVisibility: true, verified: true }
    if (!props.eu) dados.papel = f.papel
    if (f.password) Object.assign(dados, { password: f.password, passwordConfirm: f.password })
    const ok = await tentar(() => (u ? pb.collection('users').update(u.id, dados) : pb.collection('users').create(dados)))
    if (ok) props.onGuardado()
  }

  async function remover() {
    if (!u || !confirm(`Retirar o acesso a ${u.name}?`)) return
    if (await tentar(() => pb.collection('users').delete(u.id))) props.onGuardado()
  }

  return (
    <Modal titulo={u ? 'Editar membro' : 'Novo membro'} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <label>Nome *<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Email *<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
        <label>
          Papel
          <select value={f.papel} disabled={props.eu} onChange={(e) => setF({ ...f, papel: e.target.value as Papel })}>
            {(Object.keys(NOMES_PAPEL) as Papel[]).map((p) => <option key={p} value={p}>{NOMES_PAPEL[p]}</option>)}
          </select>
        </label>
        <label>
          {u ? 'Nova palavra-passe (deixe vazio para manter)' : 'Palavra-passe inicial *'}
          <input type="text" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required={!u} autoComplete="off" />
        </label>
        <p className="ajuda">Comunique a palavra-passe à pessoa e peça-lhe para a alterar em Definições.</p>
        <div className="rodape-modal">
          {u && !props.eu && <button type="button" className="perigo" onClick={remover}>Retirar acesso</button>}
          <span className="espaco" />
          <button type="button" className="secundario" onClick={props.onFechar}>Cancelar</button>
          <button type="submit">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
