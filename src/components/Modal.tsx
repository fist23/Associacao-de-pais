import type { ReactNode } from 'react'

export default function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fundo-modal" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="ligacao" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
