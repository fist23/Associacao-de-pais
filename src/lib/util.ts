export const euro = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(v ?? 0))

export const dataPT = (d: string | null | undefined) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '—'

export const hoje = () => new Date().toISOString().slice(0, 10)

/** Converte texto de input ("12,50") em número */
export const num = (s: string) => Number(String(s).replace(',', '.')) || 0

/** Descarrega uma lista de objetos como CSV (abre no Excel) */
export function exportarCSV(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return
  const cols = Object.keys(linhas[0])
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(';'), ...linhas.map((l) => cols.map((c) => esc(l[c])).join(';'))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function erro(e: { message: string } | null) {
  if (e) {
    alert('Erro: ' + e.message)
    return true
  }
  return false
}
