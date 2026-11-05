/// <reference path="../pb_data/types.d.ts" />
// Tesouraria: separação Caixa / Banco, transferências internas (depósitos e levantamentos)
// e vales de caixa (adiantamentos em dinheiro a regularizar com fatura e troco).

const LER = '@request.auth.collectionName = "users" && @request.auth.papel != ""'
const EDITAR =
  '@request.auth.collectionName = "users" && (@request.auth.papel = "admin" || @request.auth.papel = "tesoureiro" || @request.auth.papel = "direcao")'
const APAGAR = '@request.auth.collectionName = "users" && (@request.auth.papel = "admin" || @request.auth.papel = "tesoureiro")'

migrate(
  (app) => {
    // ---------- Movimentos: conta e transferências ----------
    const movimentos = app.findCollectionByNameOrId('movimentos')
    const tipo = movimentos.fields.getByName('tipo')
    tipo.values = ['receita', 'despesa', 'transferencia']
    movimentos.fields.add(new SelectField({ name: 'conta', maxSelect: 1, values: ['Caixa', 'Banco'] }))
    movimentos.fields.add(new SelectField({ name: 'conta_destino', maxSelect: 1, values: ['Caixa', 'Banco'] }))
    app.save(movimentos)

    // Movimentos existentes: numerário fica na Caixa, o resto no Banco
    app.db().newQuery("UPDATE movimentos SET conta = CASE WHEN metodo = 'Numerário' THEN 'Caixa' ELSE 'Banco' END WHERE conta = ''").execute()

    // ---------- Configuração: saldo inicial separado ----------
    const configuracao = app.findCollectionByNameOrId('configuracao')
    configuracao.fields.add(new NumberField({ name: 'saldo_inicial_caixa' }))
    configuracao.fields.add(new NumberField({ name: 'saldo_inicial_banco' }))
    app.save(configuracao)
    // O saldo inicial único que existia passa para o Banco (pode ser repartido em Definições)
    app.db().newQuery('UPDATE configuracao SET saldo_inicial_banco = saldo_inicial WHERE saldo_inicial_banco = 0 AND saldo_inicial_caixa = 0').execute()

    // ---------- Vales de caixa ----------
    const eventos = app.findCollectionByNameOrId('eventos')
    const users = app.findCollectionByNameOrId('users')
    const vales = new Collection({
      type: 'base',
      name: 'vales',
      listRule: LER,
      viewRule: LER,
      createRule: EDITAR,
      updateRule: EDITAR,
      deleteRule: APAGAR,
      fields: [
        { name: 'numero', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'ano_letivo', type: 'text', required: true },
        { name: 'data', type: 'date', required: true },
        { name: 'beneficiario', type: 'text', required: true },
        { name: 'motivo', type: 'text', required: true },
        { name: 'valor_entregue', type: 'number', required: true, min: 0.01 },
        { name: 'evento', type: 'relation', collectionId: eventos.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'estado', type: 'select', required: true, maxSelect: 1, values: ['Pendente', 'Regularizado', 'Anulado'] },
        { name: 'data_regularizacao', type: 'date' },
        { name: 'valor_gasto', type: 'number', min: 0 },
        { name: 'documento', type: 'text' },
        { name: 'movimento', type: 'relation', collectionId: app.findCollectionByNameOrId('movimentos').id, cascadeDelete: false, maxSelect: 1 },
        { name: 'notas', type: 'text' },
        { name: 'criado_por', type: 'relation', collectionId: users.id, cascadeDelete: false, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_vales_numero ON vales (ano_letivo, numero)'],
    })
    app.save(vales)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('vales'))
    } catch (_) {}
    const configuracao = app.findCollectionByNameOrId('configuracao')
    configuracao.fields.removeByName('saldo_inicial_caixa')
    configuracao.fields.removeByName('saldo_inicial_banco')
    app.save(configuracao)
    const movimentos = app.findCollectionByNameOrId('movimentos')
    movimentos.fields.removeByName('conta')
    movimentos.fields.removeByName('conta_destino')
    movimentos.fields.getByName('tipo').values = ['receita', 'despesa']
    app.save(movimentos)
  },
)
