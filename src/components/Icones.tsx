// Ícones de traço simples para a navegação no telemóvel
const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IcPainel = () => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>
)
export const IcSocios = () => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.3" /><path d="M15.5 14.3c2.6-.4 4.6 1.2 5 4.2" /></svg>
)
export const IcEventos = () => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /><path d="m10 14.6 1.5 1.4 3-3" /></svg>
)
export const IcTesouraria = () => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}><ellipse cx="10" cy="7" rx="6" ry="2.5" /><path d="M4 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" /><path d="M8 15.8c.6.1 1.3.2 2 .2 3.3 0 6-1.1 6-2.5" /><path d="M4 11v4c0 1 1.2 1.8 3 2.2" /><circle cx="17" cy="17" r="3.2" /></svg>
)
export const IcDefinicoes = () => (
  <svg viewBox="0 0 24 24" aria-hidden {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></svg>
)
export const IcLixo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...p}><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
)
