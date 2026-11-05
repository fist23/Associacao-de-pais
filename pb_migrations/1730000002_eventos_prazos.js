/// <reference path="../pb_data/types.d.ts" />
// Eventos: data limite de inscrição e preço diferente a partir de uma data (ambos opcionais).
migrate(
  (app) => {
    const eventos = app.findCollectionByNameOrId('eventos')
    eventos.fields.add(new DateField({ name: 'inscricoes_ate' }))
    eventos.fields.add(new DateField({ name: 'preco_ate' }))
    eventos.fields.add(new NumberField({ name: 'preco_depois', min: 0 }))
    eventos.fields.add(new NumberField({ name: 'preco_nao_socio_depois', min: 0 }))
    app.save(eventos)
  },
  (app) => {
    const eventos = app.findCollectionByNameOrId('eventos')
    for (const n of ['inscricoes_ate', 'preco_ate', 'preco_depois', 'preco_nao_socio_depois']) eventos.fields.removeByName(n)
    app.save(eventos)
  },
)
