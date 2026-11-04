import PocketBase from 'pocketbase'

// Em produção a app é servida pelo PocketBase (pasta pb_public), por isso usa o mesmo endereço.
const url = (import.meta.env.VITE_PB_URL as string | undefined) || window.location.origin

export const pb = new PocketBase(url)
pb.autoCancellation(false)
