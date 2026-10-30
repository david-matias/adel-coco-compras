
/**
 * Testes de integração executados no editor do Apps Script.
 *
 * Execute executarTestesAPI() em uma planilha de homologação.
 * O teste cria um registro exclusivo, verifica as operações e remove
 * somente o registro criado pelo próprio teste.
 *
 * Os eventos de auditoria dos testes são preservados.
 */

function executarTestesAPI() {
  const id = generatePurchaseId();
  const context = {
    requestId: Utilities.getUuid(),
    user: 'TESTE_AUTOMATIZADO'
  };

  let rowCreated = false;
  const results = [];

  function check(name, callback) {
    try {
      callback();
      results.push({ teste: name, resultado: 'PASSOU' });
    } catch (error) {
      results.push({
        teste: name,
        resultado: 'FALHOU',
        erro: error.message
      });
      throw error;
    }
  }

  try {
    check('CREATE cria exatamente uma carga', function () {
      createPurchase({
        id_carga: id,
        tipo_coco: 'Coco Verde',
        comprador: {
          fornecedor: 'Fornecedor de Teste',
          quantidade_prevista: 100,
          valor_unitario: 2,
          email: 'teste@example.com'
        }
      }, context);

      rowCreated = true;

      const sheet = getDatabase();

      if (findRowsById(sheet, id).length !== 1) {
        throw new Error('A carga não foi criada exatamente uma vez.');
      }
    });

    check('UPDATE parcial preserva campos não enviados', function () {
      const before = getPurchase(id);

      const result = updatePurchase({
        id_carga: id,
        version: before.version,
        comprador: {
          fornecedor: 'Fornecedor Editado'
        }
      }, context);

      const after = getPurchase(id);

      if (after.comprador.fornecedor !== 'Fornecedor Editado') {
        throw new Error('O fornecedor não foi atualizado.');
      }

      if (after.comprador.quantidade_prevista !== 100) {
        throw new Error('A quantidade foi perdida durante a edição.');
      }

      if (after.version !== result.version) {
        throw new Error('A versão retornada está incorreta.');
      }
    });

    check('UPDATE com ID inexistente não cria carga', function () {
      let failed = false;

      try {
        updatePurchase({
          id_carga: 'CARGA-INEXISTENTE-' + Utilities.getUuid()
        }, context);
      } catch (error) {
        failed = error.code === 'NOT_FOUND';
      }

      if (!failed) {
        throw new Error('A edição deveria falhar com NOT_FOUND.');
      }

      if (findRowsById(getDatabase(), id).length !== 1) {
        throw new Error('A carga original foi afetada.');
      }
    });

    check('CREATE rejeita ID duplicado', function () {
      let failed = false;

      try {
        createPurchase({ id_carga: id }, context);
      } catch (error) {
        failed = error.code === 'DUPLICATE_ID';
      }

      if (!failed) {
        throw new Error('O sistema aceitou um ID duplicado.');
      }

      if (findRowsById(getDatabase(), id).length !== 1) {
        throw new Error('Foi encontrada duplicidade na planilha.');
      }
    });

    check('Versão antiga é rejeitada', function () {
      let failed = false;

      try {
        updatePurchase({
          id_carga: id,
          version: 1,
          comprador: { fornecedor: 'Alteração concorrente' }
        }, context);
      } catch (error) {
        failed = error.code === 'VERSION_CONFLICT';
      }

      if (!failed) {
        throw new Error('A versão desatualizada deveria ser rejeitada.');
      }
    });

    check('DELETE cancela sem excluir o histórico', function () {
      const before = getPurchase(id);

      cancelPurchase({
        id_carga: id,
        version: before.version
      }, context);

      const after = getPurchase(id);

      if (after.status !== APP.STATUS.CANCELLED) {
        throw new Error('A carga não foi cancelada.');
      }

      if (findRowsById(getDatabase(), id).length !== 1) {
        throw new Error('O registro histórico foi apagado.');
      }
    });

    check('Carga cancelada não pode ser editada', function () {
      let failed = false;

      try {
        updatePurchase({
          id_carga: id,
          comprador: { fornecedor: 'Tentativa de edição' }
        }, context);
      } catch (error) {
        failed = error.code === 'CANCELLED_RECORD';
      }

      if (!failed) {
        throw new Error('A carga cancelada foi aceita para edição.');
      }
    });

    Logger.log(JSON.stringify(results, null, 2));
    Logger.log('Todos os testes foram concluídos.');

  } finally {
    if (rowCreated) {
      const sheet = getDatabase();
      const matches = findRowsById(sheet, id);

      if (matches.length === 1) {
        sheet.deleteRow(matches[0]);
      } else if (matches.length > 1) {
        console.error(
          'Limpeza interrompida: IDs de teste duplicados. ID=' + id
        );
      }
    }
  }
}
