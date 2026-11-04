/// <reference path="../pb_data/types.d.ts" />
// Esquema inicial da Associação de Pais.
// O PocketBase aplica esta migração automaticamente ao arrancar.

// ---------- Regras de acesso ----------
const PAPEIS_EDITAR = '(@request.auth.papel = "admin" || @request.auth.papel = "tesoureiro" || @request.auth.papel = "direcao")'
const LER = '@request.auth.collectionName = "users" && @request.auth.papel != ""'
const EDITAR = '@request.auth.collectionName = "users" && ' + PAPEIS_EDITAR
const TESOURARIA_APAGAR = '@request.auth.collectionName = "users" && (@request.auth.papel = "admin" || @request.auth.papel = "tesoureiro")'
const ADMIN = '@request.auth.collectionName = "users" && @request.auth.papel = "admin"'

const regras = (escrever, apagar) => ({
  listRule: LER,
  viewRule: LER,
  createRule: escrever,
  updateRule: escrever,
  deleteRule: apagar || escrever,
})

const criado = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

const METODOS = ['Numerário', 'MB WAY', 'Transferência', 'Multibanco', 'Cheque', 'Outro']

migrate(
  (app) => {
    // ---------- Utilizadores (membros da direção) ----------
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new SelectField({ name: 'papel', required: true, maxSelect: 1, values: ['admin', 'tesoureiro', 'direcao', 'leitura'] }),
    )
    // Ninguém se regista sozinho: só o administrador cria contas.
    users.listRule = 'id = @request.auth.id || @request.auth.papel = "admin"'
    users.viewRule = users.listRule
    users.createRule = ADMIN
    // Cada pessoa pode mudar os seus dados/palavra-passe, mas não o próprio papel.
    users.updateRule = '(id = @request.auth.id && @request.body.papel:isset = false) || @request.auth.papel = "admin"'
    users.deleteRule = ADMIN
    // O administrador pode redefinir palavras-passe de outros membros sem saber a antiga
    users.manageRule = ADMIN
    app.save(users)

    // ---------- Configuração (um único registo) ----------
    const configuracao = new Collection({
      type: 'base',
      name: 'configuracao',
      listRule: LER,
      viewRule: LER,
      createRule: null,
      updateRule: ADMIN,
      deleteRule: null,
      fields: [
        { name: 'nome_associacao', type: 'text', required: true },
        { name: 'ano_letivo', type: 'text', required: true, pattern: '^\\d{4}/\\d{4}$' },
        { name: 'valor_quota', type: 'number', min: 0 },
        { name: 'saldo_inicial', type: 'number' },
        ...criado(),
      ],
    })
    app.save(configuracao)
    const cfg = new Record(configuracao)
    cfg.set('nome_associacao', 'Associação de Pais')
    cfg.set('ano_letivo', '2026/2027')
    cfg.set('valor_quota', 10)
    cfg.set('saldo_inicial', 0)
    app.save(cfg)

    // ---------- Sócios (uma família = um sócio) ----------
    const socios = new Collection({
      type: 'base',
      name: 'socios',
      ...regras(EDITAR),
      fields: [
        { name: 'numero', type: 'number', onlyInt: true, min: 1 },
        { name: 'nome', type: 'text', required: true }, // encarregado(a) de educação
        { name: 'email', type: 'email' },
        { name: 'telefone', type: 'text' },
        { name: 'nif', type: 'text', pattern: '^$|^\\d{9}$' },
        { name: 'data_adesao', type: 'date' },
        { name: 'ativo', type: 'bool' },
        { name: 'consentimento_rgpd', type: 'bool' },
        { name: 'notas', type: 'text' },
        ...criado(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_socios_numero ON socios (numero) WHERE numero > 0'],
    })
    app.save(socios)

    // ---------- Educandos ----------
    const educandos = new Collection({
      type: 'base',
      name: 'educandos',
      ...regras(EDITAR),
      fields: [
        { name: 'socio', type: 'relation', required: true, collectionId: socios.id, cascadeDelete: true, maxSelect: 1 },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'ano_escolar',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['Pré 3 anos', 'Pré 4 anos', 'Pré 5 anos', '1.º', '2.º', '3.º', '4.º', 'Saiu'],
        },
        { name: 'turma', type: 'text' },
        ...criado(),
      ],
      indexes: ['CREATE INDEX idx_educandos_socio ON educandos (socio)'],
    })
    app.save(educandos)

    // ---------- Eventos (festas, passeios, ...) ----------
    const eventos = new Collection({
      type: 'base',
      name: 'eventos',
      ...regras(EDITAR),
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'tipo', type: 'select', required: true, maxSelect: 1, values: ['Festa', 'Passeio', 'Atividade', 'Angariação', 'Outro'] },
        { name: 'data', type: 'date' },
        { name: 'local', type: 'text' },
        { name: 'preco', type: 'number', min: 0 },
        { name: 'preco_nao_socio', type: 'number', min: 0 },
        { name: 'vagas', type: 'number', onlyInt: true, min: 0 },
        { name: 'descricao', type: 'text' },
        { name: 'ano_letivo', type: 'text', required: true },
        { name: 'estado', type: 'select', required: true, maxSelect: 1, values: ['Planeado', 'Aberto', 'Fechado', 'Concluído', 'Cancelado'] },
        ...criado(),
      ],
    })
    app.save(eventos)

    // ---------- Tesouraria: movimentos ----------
    const movimentos = new Collection({
      type: 'base',
      name: 'movimentos',
      ...regras(EDITAR, TESOURARIA_APAGAR),
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'tipo', type: 'select', required: true, maxSelect: 1, values: ['receita', 'despesa'] },
        { name: 'categoria', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true, min: 0.01 },
        { name: 'metodo', type: 'select', required: true, maxSelect: 1, values: METODOS },
        { name: 'documento', type: 'text' }, // nº fatura / recibo
        { name: 'comprovativo', type: 'file', maxSelect: 1, maxSize: 5242880, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
        { name: 'ano_letivo', type: 'text', required: true },
        { name: 'evento', type: 'relation', collectionId: eventos.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'socio', type: 'relation', collectionId: socios.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'criado_por', type: 'relation', collectionId: users.id, cascadeDelete: false, maxSelect: 1 },
        ...criado(),
      ],
      indexes: ['CREATE INDEX idx_mov_ano ON movimentos (ano_letivo, data)'],
    })
    app.save(movimentos)

    // ---------- Quotas ----------
    const quotas = new Collection({
      type: 'base',
      name: 'quotas',
      ...regras(EDITAR),
      fields: [
        { name: 'socio', type: 'relation', required: true, collectionId: socios.id, cascadeDelete: true, maxSelect: 1 },
        { name: 'ano_letivo', type: 'text', required: true },
        { name: 'valor', type: 'number', min: 0 },
        { name: 'data_pagamento', type: 'date' },
        { name: 'metodo', type: 'select', maxSelect: 1, values: METODOS },
        { name: 'movimento', type: 'relation', collectionId: movimentos.id, cascadeDelete: false, maxSelect: 1 },
        ...criado(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_quotas_socio_ano ON quotas (socio, ano_letivo)'],
    })
    app.save(quotas)

    // ---------- Inscrições em eventos ----------
    const inscricoes = new Collection({
      type: 'base',
      name: 'inscricoes',
      ...regras(EDITAR),
      fields: [
        { name: 'evento', type: 'relation', required: true, collectionId: eventos.id, cascadeDelete: true, maxSelect: 1 },
        { name: 'educando', type: 'relation', collectionId: educandos.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'nome', type: 'text', required: true }, // permite inscrever não sócios
        { name: 'contacto', type: 'text' },
        { name: 'valor', type: 'number', min: 0 },
        { name: 'pago', type: 'bool' },
        { name: 'movimento', type: 'relation', collectionId: movimentos.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'notas', type: 'text' },
        ...criado(),
      ],
      indexes: ['CREATE INDEX idx_insc_evento ON inscricoes (evento)'],
    })
    app.save(inscricoes)
  },
  (app) => {
    for (const nome of ['inscricoes', 'quotas', 'movimentos', 'eventos', 'educandos', 'socios', 'configuracao']) {
      try {
        app.delete(app.findCollectionByNameOrId(nome))
      } catch (_) {}
    }
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('papel')
    app.save(users)
  },
)
