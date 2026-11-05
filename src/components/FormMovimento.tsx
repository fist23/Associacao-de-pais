import { useState, type FormEvent } from 'react'
import { pb } from '../lib/pb'
import { useSessao } from '../lib/contexto'
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, CONTAS, METODOS, type Conta, type Evento, type Movimento } from '../lib/types'
import { contaDe, contaDoMetodo } from '../lib/tesouraria'
import { dia, hoje, num, paraPB, tentar } from '../lib/util'
import Modal from './Modal'

type Tipo = Movimento['tipo']

const TITULOS: Record<Tipo, string> = { receita: 'Nova receita', despesa: 'Nova despesa', transferencia: 'Depósito / levantamento' }

export default function FormMovimento(props: {
  movimento?: Movimento | null
  tipo?: Tipo
  evento?: Evento
  eventos: Evento[]
  onFechar: () => void
  onGuardado: () => void
}) {
  const { config, podeEditar, podeApagarMov } = useSessao()
  const m = props.movimento
  const metodoInicial = m?.metodo ?? 'Numerário'
  const [f, setF] = useState({
    data: dia(m?.data) || hoje(),
    tipo: (m?.tipo ?? props.tipo ?? 'despesa') as Tipo,
    categoria: m?.categoria ?? (props.evento ? 'Eventos' : ''),
    descricao: m?.descricao ?? (props.evento ? `${props.evento.nome} — ` : props.tipo === 'transferencia' ? 'Depósito no banco' : ''),
    valor: m ? String(m.valor).replace('.', ',') : '',
    metodo: metodoInicial,
    conta: (m ? contaDe(m) : contaDoMetodo(metodoInicial)) as Conta,
    conta_destino: (m?.conta_destino || 'Banco') as Conta,
    documento: m?.documento ?? '',
    evento: m?.evento ?? props.evento?.id ?? '',
    ano_letivo: m?.ano_letivo ?? props.evento?.ano_letivo ?? config.ano_letivo,
  })
  const [aGuardar, setAGuardar] = useState(false)
  const ro = !podeEditar
  const deQuota = Boolean(m && m.categoria === 'Quotas' && m.socio)
  const deVale = Boolean(m && m.descricao.startsWith('Vale de caixa'))
  const automatico = deQuota || deVale
  const transferencia = f.tipo === 'transferencia'

  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const categorias = f.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA

  function mudaTipo(tipo: Tipo) {
    if (tipo === 'transferencia') {
      const deCaixa = f.conta !== 'Banco'
      setF({
        ...f,
        tipo,
        conta: deCaixa ? 'Caixa' : 'Banco',
        conta_destino: deCaixa ? 'Banco' : 'Caixa',
        descricao: f.descricao || (deCaixa ? 'Depósito no banco' : 'Levantamento para a caixa'),
      })
    } else setF({ ...f, tipo })
  }

  function mudaOrigem(origem: Conta) {
    const destino: Conta = origem === 'Caixa' ? 'Banco' : 'Caixa'
    const automaticas = ['', 'Depósito no banco', 'Levantamento para a caixa']
    setF({
      ...f,
      conta: origem,
      conta_destino: destino,
      descricao: automaticas.includes(f.descricao) ? (origem === 'Caixa' ? 'Depósito no banco' : 'Levantamento para a caixa') : f.descricao,
    })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (num(f.valor) <= 0) return alert('O valor tem de ser maior que zero.')
    setAGuardar(true)
    const dados: Record<string, unknown> = transferencia
      ? {
          ...f,
          categoria: 'Transferência interna',
          metodo: f.conta === 'Caixa' ? 'Numerário' : 'Transferência',
          evento: '',
          valor: num(f.valor),
          data: paraPB(f.data),
        }
      : { ...f, conta_destino: '', valor: num(f.valor), data: paraPB(f.data) }
    const ok = await tentar(() =>
      m
        ? pb.collection('movimentos').update(m.id, dados)
        : pb.collection('movimentos').create({ ...dados, criado_por: pb.authStore.record?.id }),
    )
    setAGuardar(false)
    if (ok) props.onGuardado()
  }

  async function apagar() {
    if (!m || !confirm('Apagar este movimento?')) return
    if (await tentar(() => pb.collection('movimentos').delete(m.id))) props.onGuardado()
  }

  return (
    <Modal titulo={m ? 'Movimento' : TITULOS[f.tipo]} onFechar={props.onFechar}>
      <form onSubmit={guardar}>
        <fieldset disabled={ro || automatico}>
          <div className="alternar">
            <label className={f.tipo === 'receita' ? 'ativo receita' : ''}>
              <input type="radio" name="tipo" checked={f.tipo === 'receita'} onChange={() => mudaTipo('receita')} /> Receita
            </label>
            <label className={f.tipo === 'despesa' ? 'ativo despesa' : ''}>
              <input type="radio" name="tipo" checked={f.tipo === 'despesa'} onChange={() => mudaTipo('despesa')} /> Despesa
            </label>
            {!props.evento && (
              <label className={transferencia ? 'ativo' : ''}>
                <input type="radio" name="tipo" checked={transferencia} onChange={() => mudaTipo('transferencia')} /> Caixa ⇄ Banco
              </label>
            )}
          </div>

          <div className="linha-form">
            <label>Data *<input type="date" value={f.data} onChange={muda('data')} required /></label>
            <label>Valor (€) *<input inputMode="decimal" value={f.valor} onChange={muda('valor')} required placeholder="0,00" /></label>
          </div>

          {transferencia ? (
            <>
              <label>
                Operação
                <select value={f.conta} onChange={(e) => mudaOrigem(e.target.value as Conta)}>
                  <option value="Caixa">Depósito: dinheiro da Caixa entra no Banco</option>
                  <option value="Banco">Levantamento: dinheiro do Banco passa para a Caixa</option>
                </select>
              </label>
              <label>Descrição *<input value={f.descricao} onChange={muda('descricao')} required /></label>
              <label>N.º do talão (opcional)<input value={f.documento} onChange={muda('documento')} /></label>
              <p className="ajuda">Não conta como receita nem despesa: só muda o dinheiro de sítio.</p>
            </>
          ) : (
            <>
              <label>Descrição *<input value={f.descricao} onChange={muda('descricao')} required /></label>
              <div className="linha-form">
                <label>
                  Categoria *
                  <input list="categorias" value={f.categoria} onChange={muda('categoria')} required />
                  <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
                </label>
                <label>
                  Método
                  <select value={f.metodo} onChange={(e) => setF({ ...f, metodo: e.target.value, conta: contaDoMetodo(e.target.value) })}>
                    {METODOS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
                <label className="medio">
                  Conta
                  <select value={f.conta} onChange={muda('conta')}>
                    {CONTAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <div className="linha-form">
                <label>
                  Evento
                  <select value={f.evento} onChange={muda('evento')}>
                    <option value="">— nenhum —</option>
                    {props.eventos.map((ev) => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                  </select>
                </label>
                <label>N.º fatura / recibo<input value={f.documento} onChange={muda('documento')} /></label>
              </div>
            </>
          )}
          <label className="estreito">Ano letivo<input value={f.ano_letivo} onChange={muda('ano_letivo')} pattern="\d{4}/\d{4}" /></label>
        </fieldset>
        {deQuota && <p className="ajuda">Este movimento foi criado pelo pagamento de uma quota. Para o anular, use o ecrã Sócios.</p>}
        {deVale && <p className="ajuda">Este movimento foi criado ao regularizar um vale de caixa. Para o alterar, use Tesouraria → Vales de caixa.</p>}
        {!ro && (
          <div className="rodape-modal">
            {m && podeApagarMov && !automatico && <button type="button" className="perigo" onClick={apagar}>Apagar</button>}
            <span className="espaco" />
            <button type="button" className="secundario" onClick={props.onFechar}>{automatico ? 'Fechar' : 'Cancelar'}</button>
            {!automatico && <button type="submit" disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>}
          </div>
        )}
      </form>
    </Modal>
  )
}
