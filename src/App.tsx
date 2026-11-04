import { useCallback, useEffect, useState } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configurado, supabase } from './lib/supabase'
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
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [semAcesso, setSemAcesso] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      if (evento === 'PASSWORD_RECOVERY') {
        setTimeout(async () => {
          const nova = prompt('Escreva a nova palavra-passe (mínimo 8 caracteres):')
          if (nova && nova.length >= 8) {
            const { error } = await supabase.auth.updateUser({ password: nova })
            alert(error ? 'Erro: ' + error.message : 'Palavra-passe alterada.')
          }
        }, 0)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const carregar = useCallback(async () => {
    if (!session) return
    const [{ data: u }, { data: c }] = await Promise.all([
      supabase.from('utilizadores').select('nome,papel').eq('id', session.user.id).maybeSingle(),
      supabase.from('configuracao').select('*').eq('id', 1).maybeSingle(),
    ])
    if (!u || !c) {
      setSemAcesso(true)
      return
    }
    setSemAcesso(false)
    setSessao({ nome: u.nome, papel: u.papel as Papel, config: c as Configuracao, recarregarConfig: carregar })
  }, [session])

  useEffect(() => {
    setSessao(null)
    carregar()
  }, [carregar])

  if (!configurado)
    return (
      <div className="centro">
        <div className="cartao">
          <h1>Configuração em falta</h1>
          <p>
            Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (ver README).
          </p>
        </div>
      </div>
    )
  if (session === undefined) return <div className="centro">A carregar…</div>
  if (!session) return <Login />
  if (semAcesso)
    return (
      <div className="centro">
        <div className="cartao">
          <h1>Sem acesso</h1>
          <p>
            A conta <b>{session.user.email}</b> ainda não foi autorizada. Peça ao administrador para a adicionar à
            tabela <code>utilizadores</code>.
          </p>
          <button onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </div>
    )
  if (!sessao) return <div className="centro">A carregar…</div>

  return (
    <SessaoCtx.Provider value={sessao}>
      <HashRouter>
        <header className="topo">
          <div className="marca">{sessao.config.nome_associacao}</div>
          <nav>
            <NavLink to="/" end>Painel</NavLink>
            <NavLink to="/socios">Sócios</NavLink>
            <NavLink to="/eventos">Eventos</NavLink>
            <NavLink to="/tesouraria">Tesouraria</NavLink>
            <NavLink to="/definicoes">Definições</NavLink>
          </nav>
          <div className="utilizador">
            <span>{sessao.nome} · {sessao.config.ano_letivo}</span>
            <button className="ligacao" onClick={() => supabase.auth.signOut()}>Sair</button>
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
