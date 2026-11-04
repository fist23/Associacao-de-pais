import { useState, type FormEvent } from 'react'
import { pb } from '../lib/pb'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [aEntrar, setAEntrar] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setAEntrar(true)
    setMsg('')
    try {
      await pb.collection('users').authWithPassword(email, password)
    } catch (err) {
      const status = (err as { status?: number }).status
      setMsg(status === 0 ? 'Sem ligação ao servidor. Verifique a internet.' : 'Email ou palavra-passe incorretos.')
    }
    setAEntrar(false)
  }

  return (
    <div className="entrada">
      <div className="entrada-logo">
        <picture>
          <source srcSet="./logo.webp" type="image/webp" />
          <img src="./logo.jpg" alt="Associação de Pais EB JI da Serpente" width={640} height={647} />
        </picture>
      </div>
      <div className="entrada-form">
        <form onSubmit={entrar}>
          <span className="sobre">Área da direção</span>
          <h1>Bem-vindo(a)</h1>
          <p>Entre com a conta que o administrador da associação lhe atribuiu.</p>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Palavra-passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <button type="submit" disabled={aEntrar}>{aEntrar ? 'A entrar…' : 'Entrar'}</button>
          {msg && <p className="erro-form" role="alert">{msg}</p>}
          <p className="ajuda" style={{ marginTop: '1.5rem' }}>Esqueceu-se da palavra-passe? Peça ao administrador para a redefinir.</p>
        </form>
      </div>
    </div>
  )
}
