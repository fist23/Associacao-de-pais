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
        <div className="cartao">
          <p>{falha}</p>
          <button onClick={carregar}>Tentar novamente</button>
        </div>
      </div>
    )
  if (!sessao) return <div className="centro">A carregar…</div>

  return (
    <SessaoCtx.Provider value={sessao}>
      <HashRouter>
        <header className="topo">
          <div className="marca">
            <img src="./icon.svg" alt="" width={28} height={28} />
            <span>{sessao.config.nome_associacao}</span>
          </div>
          <nav>
            <NavLink to="/" end>Painel</NavLink>
            <NavLink to="/socios">Sócios</NavLink>
            <NavLink to="/eventos">Eventos</NavLink>
            <NavLink to="/tesouraria">Tesouraria</NavLink>
            <NavLink to="/definicoes">Definições</NavLink>
          </nav>
          <div className="utilizador">
            <span>{sessao.nome} · {sessao.config.ano_letivo}</span>
            <button className="ligacao" onClick={() => pb.authStore.clear()}>Sair</button>
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </HashRouter>
    </SessaoCtx.Provider>
  )
}
