export const euro = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(v ?? 0))

/** Data do PocketBase ("2026-11-04 12:00:00.000Z") -> "2026-11-04" */
export const dia = (d: string | null | undefined) => (d ? d.slice(0, 10) : '')

/** "2026-11-04" -> formato aceite pelo PocketBase (meio-dia UTC evita trocas de dia por fuso horário) */
export const paraPB = (d: string) => (d ? `${d.slice(0, 10)} 12:00:00.000Z` : '')

export const dataPT = (d: string | null | undefined) => {
  const x = dia(d)
  return x ? x.split('-').reverse().join('/') : '—'
}

export const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

/** Mostra um erro do PocketBase de forma legível */
export function mostrarErro(e: unknown) {
  const err = e as { message?: string; response?: { data?: Record<string, { message: string }> } }
  const campos = err.response?.data ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v.message}`) : []
  alert('Erro: ' + (campos.length ? campos.join('\n') : err.message ?? String(e)))
}

/** Executa uma ação assíncrona e mostra o erro, se houver. Devolve true se correu bem. */
export async function tentar(f: () => Promise<unknown>) {
  try {
    await f()
    return true
  } catch (e) {
    mostrarErro(e)
    return false
  }
}
