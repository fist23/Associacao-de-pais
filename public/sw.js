// Service worker mínimo: permite instalar a app no telemóvel.
// Não guarda dados em cache (os dados vêm sempre do Supabase).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
