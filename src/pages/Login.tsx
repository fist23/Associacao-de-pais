import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [aEntrar, setAEntrar] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setAEntrar(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg('Email ou palavra-passe incorretos.')
    setAEntrar(false)
  }

  async function recuperar() {
    if (!email) return setMsg('Escreva primeiro o seu email.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] })
    setMsg(error ? error.message : 'Enviámos um email para redefinir a palavra-passe.')
  }

  return (
    <div className="centro">
      <form className="cartao login" onSubmit={entrar}>
        <img src="./icon.svg" alt="" width={56} height={56} />
        <h1>Associação de Pais</h1>
        <p className="subtil">Área de gestão da direção</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Palavra-passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        <button type="submit" disabled={aEntrar}>{aEntrar ? 'A entrar…' : 'Entrar'}</button>
        <button type="button" className="ligacao" onClick={recuperar}>Esqueci-me da palavra-passe</button>
        {msg && <p className="aviso">{msg}</p>}
      </form>
    </div>
  )
}
