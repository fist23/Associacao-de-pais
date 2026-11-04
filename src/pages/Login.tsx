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
      setMsg(status === 0 ? 'Sem ligação ao servidor.' : 'Email ou palavra-passe incorretos.')
    }
    setAEntrar(false)
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
        <p className="subtil pequeno">Esqueceu-se da palavra-passe? Peça ao administrador da associação para a redefinir.</p>
        {msg && <p className="aviso">{msg}</p>}
      </form>
    </div>
  )
}
