import { useCallback, useEffect, useState } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { pb } from './lib/pb'
import { SessaoCtx, type Sessao } from './lib/contexto'
import type { Configuracao, Papel } from './lib/types'
import Login from './pages/Login'
import Painel from './pages/Painel'
import Socios from './pages/Socios'
import Eventos from './pages/Eventos'
import EventoDetalhe from './pages/EventoDetalhe'
import Tesouraria from './pages/Tesouraria'
import Definicoes from './pages/Definicoes'
import PassagemAno from './pages/PassagemAno'
import { IcDefinicoes, IcEventos, IcPainel, IcSocios, IcTesouraria } from './components/Icones'

export default function App() {
  const [autenticado, setAutenticado] = useState(pb.authStore.isValid)
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [falha, setFalha] = useState('')

  useEffect(() => pb.authStore.onChange(() => setAutenticado(pb.authStore.isValid)), [])

  const carregar = useCallback(async () => {
    if (!pb.authStore.isValid) return setSessao(null)
    try {
      await pb.collection('users').authRefresh()
      const u = pb.authStore.record!
      const config = await pb.collection('configuracao').getFirstListItem<Configuracao>('')
      setFalha('')
      setSessao({
        id: u.id,
        nome: u.name || u.email,
        papel: u.papel as Papel,
        config,
        recarregarConfig: carregar,
      })
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 401 || status === 403 || status === 404) pb.authStore.clear()
      else setFalha('Não foi possível ligar ao servidor. Verifique a ligação à internet.')
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [autenticado, carregar])

  if (!autenticado) return <Login />
  if (falha)
    return (
      <div className="centro">
        <div className="painel">
          <p>{falha}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      </div>
    )
  if (!sessao) return <div className="centro">A carregar…</div>

  // "Associação de Pais EB JI da Serpente" -> título + nome da escola
  const m = sessao.config.nome_associacao.match(/^(associa[çc][ãa]o de pais( e encarregados de educa[çc][ãa]o)?)\s*(d[aoe]s?\s+)?(.*)$/i)
  const titulo = m ? m[1] : sessao.config.nome_associacao
  const escola = m ? m[4] : ''
  const iniciais = sessao.nome.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()

  const links = [
    { to: '/', nome: 'Painel', Icone: IcPainel },
    { to: '/socios', nome: 'Sócios', Icone: IcSocios },
    { to: '/eventos', nome: 'Eventos', Icone: IcEventos },
    { to: '/tesouraria', nome: 'Tesouraria', Icone: IcTesouraria },
    { to: '/definicoes', nome: 'Definições', Icone: IcDefinicoes },
  ]

  return (
    <SessaoCtx.Provider value={sessao}>
      <HashRouter>
        <header className="topo">
          <div className="topo-dentro">
            <NavLink to="/" className="marca">
              <img className="emblema" src="./emblema.png" alt="" />
              <span className="marca-texto">
                <b>{titulo}</b>
                {escola && <small>{escola}</small>}
              </span>
            </NavLink>
            <nav className="nav-topo" aria-label="Principal">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === '/'}>{l.nome}</NavLink>
              ))}
            </nav>
            <div className="conta">
              <span className="quem">
                <b>{sessao.nome}</b>
                {sessao.config.ano_letivo}
              </span>
              <button className="secundario pequeno" onClick={() => pb.authStore.clear()} title={`Sair (${sessao.nome})`}>
                <span aria-hidden>{iniciais}</span> Sair
              </button>
            </div>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Painel />} />
            <Route path="/socios" element={<Socios />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/eventos/:id" element={<EventoDetalhe />} />
            <Route path="/tesouraria" element={<Tesouraria />} />
            <Route path="/definicoes" element={<Definicoes />} />
            <Route path="/passagem-ano" element={<PassagemAno />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <nav className="nav-baixo" aria-label="Principal">
          {links.map(({ to, nome, Icone }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icone />
              {nome}
            </NavLink>
          ))}
        </nav>
      </HashRouter>
    </SessaoCtx.Provider>
  )
}
