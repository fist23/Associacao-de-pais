/// <reference path="../pb_data/types.d.ts" />
// Cria a primeira conta de administrador da direção durante a instalação automática.
// Só faz alguma coisa se as variáveis AP_ADMIN_EMAIL e AP_ADMIN_PASSWORD estiverem definidas
// e ainda não existir nenhum membro — caso contrário não altera nada.

migrate((app) => {
  const email = $os.getenv('AP_ADMIN_EMAIL')
  const password = $os.getenv('AP_ADMIN_PASSWORD')
  if (!email || !password) return

  const users = app.findCollectionByNameOrId('users')
  const existentes = app.countRecords(users)
  if (existentes > 0) return

  const r = new Record(users)
  r.set('email', email)
  r.set('emailVisibility', true)
  r.set('verified', true)
  r.set('name', $os.getenv('AP_ADMIN_NOME') || 'Administrador')
  r.set('papel', 'admin')
  r.setPassword(password)
  app.save(r)

  const nome = $os.getenv('AP_NOME_ASSOCIACAO')
  if (nome) {
    const cfg = app.findFirstRecordByFilter('configuracao', '')
    cfg.set('nome_associacao', nome)
    app.save(cfg)
  }
})
