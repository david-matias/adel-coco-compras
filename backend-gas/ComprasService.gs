
/**
 * Serviço de compras.
 *
 * Nenhuma função deste arquivo é um endpoint HTTP.
 * As operações são chamadas pelo roteador e retornam objetos JavaScript.
 */

function createPurchase(payload, context) {
  validatePayload(payload);

  return withWriteLock(function () {
    const sheet = getDatabase();
    const requestedId = normalizeId(payload.id_carga);
    const id = requestedId || generatePurchaseId();

    if (findRowsById(sheet, id).length > 0) {
      throw apiError(
        'DUPLICATE_ID',
        'Já existe uma carga com o ID ' + id + '.'
      );
    }

    const now = new Date();
    const row = buildNewRecord(payload, id, now, context.user);

    const rowIndex = appendRecord(sheet, row);

    auditEvent({
      request_id: context.requestId,
      id_carga: id,
      action: 'CREATE',
      user: context.user,
      result: 'SUCCESS',
      details: { version: 1 }
    });

    return {
      action: 'CREATE',
      id_carga: id,
      version: 1,
      message: 'Carga criada com sucesso.',
      compra: recordToObject(row)
    };
  });
}

function updatePurchase(payload, context) {
  validatePayload(payload);

  const id = requireId(payload);

  return withWriteLock(function () {
    const sheet = getDatabase();
    const matches = findRowsById(sheet, id);

    if (matches.length === 0) {
      throw apiError(
        'NOT_FOUND',
        'Carga não encontrada. UPDATE nunca cria uma carga.'
      );
    }

    if (matches.length > 1) {
      throw apiError(
        'DUPLICATE_ID',
        'Há mais de uma linha com este ID. Corrija a planilha antes de editar.'
      );
    }

    const rowIndex = matches[0];
    const current = readRecord(sheet, rowIndex);
    const status = normalizeStatus(current[9]);

    if (status === APP.STATUS.CANCELLED) {
      throw apiError(
        'CANCELLED_RECORD',
        'Uma carga cancelada não pode ser editada.'
      );
    }

    verifyVersion(current, payload);

    const updated = mergeRecord(current, payload);
    updated[12] = new Date();                 // Data Atualização
    updated[15] = context.user;               // Atualizado Por
    updated[17] = Number(current[17] || 1) + 1; // Versão

    writeRecord(sheet, rowIndex, updated);

    auditEvent({
      request_id: context.requestId,
      id_carga: id,
      action: 'UPDATE',
      user: context.user,
      result: 'SUCCESS',
      details: {
        previous_version: Number(current[17] || 1),
        new_version: updated[17]
      }
    });

    return {
      action: 'UPDATE',
      id_carga: id,
      version: updated[17],
      message: 'Carga atualizada com sucesso.',
      compra: recordToObject(updated)
    };
  });
}

function savePurchase(payload, context) {
  // Compatibilidade com o frontend antigo.
  // Um ID explícito sempre significa intenção de editar.
  // Se não existir, a operação falha em vez de duplicar.
  if (normalizeId(payload.id_carga)) {
    return updatePurchase(payload, context);
  }

  return createPurchase(payload, context);
}

function cancelPurchase(payload, context) {
  const id = requireId(payload);

  return withWriteLock(function () {
    const sheet = getDatabase();
    const matches = findRowsById(sheet, id);

    if (matches.length === 0) {
      throw apiError('NOT_FOUND', 'Carga não encontrada para cancelamento.');
    }

    if (matches.length > 1) {
      throw apiError(
        'DUPLICATE_ID',
        'Há IDs duplicados. Corrija a planilha antes de cancelar.'
      );
    }

    const rowIndex = matches[0];
    const row = readRecord(sheet, rowIndex);
    const status = normalizeStatus(row[9]);

    if (status === APP.STATUS.CANCELLED) {
      return {
        action: 'DELETE',
        id_carga: id,
        version: Number(row[17] || 1),
        message: 'A carga já estava cancelada.'
      };
    }

    if (payload.version !== undefined) {
      verifyVersion(row, payload);
    }

    const previousStatus = row[9];
    row[9] = APP.STATUS.CANCELLED;
    row[12] = new Date();
    row[13] = new Date();
    row[15] = context.user;
    row[16] = context.user;
    row[17] = Number(row[17] || 1) + 1;

    writeRecord(sheet, rowIndex, row);

    auditEvent({
      request_id: context.requestId,
      id_carga: id,
      action: 'DELETE',
      user: context.user,
      result: 'SUCCESS',
      details: {
        previous_status: previousStatus,
        new_status: APP.STATUS.CANCELLED,
        version: row[17]
      }
    });

    return {
      action: 'DELETE',
      id_carga: id,
      version: row[17],
      message: 'Carga cancelada. O histórico foi preservado.'
    };
  });
}

function getPurchase(id) {
  const sheet = getDatabase();
  const matches = findRowsById(sheet, id);

  if (matches.length === 0) {
    throw apiError('NOT_FOUND', 'Carga não encontrada.');
  }

  if (matches.length > 1) {
    throw apiError('DUPLICATE_ID', 'Existem IDs duplicados na planilha.');
  }

  return recordToObject(readRecord(sheet, matches[0]));
}

function listPurchases(params) {
  const sheet = getDatabase();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return { total: 0, compras: [] };
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, APP.COLUMNS.length)
    .getValues();

  let purchases = values
    .filter(function (row) {
      return normalizeId(row[0]) !== '';
    })
    .map(recordToObject);

  if (params.status) {
    const wantedStatus = normalizeStatus(params.status);

    purchases = purchases.filter(function (purchase) {
      return normalizeStatus(purchase.status) === wantedStatus;
    });
  }

  if (params.id_carga) {
    const wantedId = normalizeId(params.id_carga);

    purchases = purchases.filter(function (purchase) {
      return purchase.id_carga === wantedId;
    });
  }

  // Mantém o comportamento de listar canceladas, exceto quando
  // o consumidor solicita explicitamente include_cancelled=false.
  if (String(params.include_cancelled).toLowerCase() === 'false') {
    purchases = purchases.filter(function (purchase) {
      return normalizeStatus(purchase.status) !== APP.STATUS.CANCELLED;
    });
  }

  const total = purchases.length;
  const limit = Math.min(
    Math.max(Number(params.limit) || 100, 1),
    APP.MAX_LIST_RESULTS
  );
  const offset = Math.max(Number(params.offset) || 0, 0);

  purchases = purchases.slice(offset, offset + limit);

  return {
    total: total,
    limit: limit,
    offset: offset,
    compras: purchases
  };
}

// ============================================================================
// CONSTRUÇÃO E CONVERSÃO DE REGISTROS
// ============================================================================


function buildNewRecord(payload, id, now, user) {
  const buyer = payload.comprador || {};

  const quantity = buyer.quantidade_prevista === undefined
    ? 0
    : parseNonNegativeNumber(
        buyer.quantidade_prevista,
        'quantidade_prevista'
      );

  const unitPrice = buyer.valor_unitario === undefined
    ? 0
    : parseNonNegativeNumber(
        buyer.valor_unitario,
        'valor_unitario'
      );

  const total = buyer.valor_total === undefined
    ? roundCurrency(quantity * unitPrice)
    : parseNonNegativeNumber(buyer.valor_total, 'valor_total');

  const status = normalizeStatus(
    payload.status || APP.DEFAULT_STATUS
  );

  if (status === APP.STATUS.CANCELLED) {
    throw apiError(
      'USE_DELETE',
      'Crie a carga em estado operacional e utilize DELETE para cancelar.'
    );
  }

  validateOperationalStatus(status);

  return [
    id,
    now,
    payload.tipo_coco || APP.DEFAULT_COCONUT_TYPE,
    buyer.fornecedor || '',
    buyer.previsao_entrega || '',
    quantity,
    unitPrice,
    total,
    buyer.logistica || APP.DEFAULT_LOGISTICS,
    status,
    buyer.observacao || '',
    normalizeEmail(buyer.email),
    now,
    '',
    user,
    user,
    '',
    1
  ];
}


function mergeRecord(current, payload) {
  const row = current.slice();
  const buyer = payload.comprador || {};

  if (hasOwn(payload, 'tipo_coco')) {
    row[2] = payload.tipo_coco;
  }

  const fields = {
    fornecedor: 3,
    previsao_entrega: 4,
    quantidade_prevista: 5,
    valor_unitario: 6,
    valor_total: 7,
    logistica: 8,
    observacao: 10,
    email: 11
  };

  Object.keys(fields).forEach(function (field) {
    if (hasOwn(buyer, field)) {
      const index = fields[field];

      if (field === 'quantidade_prevista' ||
          field === 'valor_unitario' ||
          field === 'valor_total') {
        row[index] = parseNonNegativeNumber(buyer[field], field);
      } else if (field === 'email') {
        row[index] = normalizeEmail(buyer[field]);
      } else {
        row[index] = buyer[field] === null ? '' : buyer[field];
      }
    }
  });

  if (hasOwn(payload, 'status')) {
    const nextStatus = normalizeStatus(payload.status);

    if (nextStatus === APP.STATUS.CANCELLED) {
      throw apiError(
        'USE_DELETE',
        'Use a ação DELETE para cancelar uma carga.'
      );
    }

    validateOperationalStatus(nextStatus);
    row[9] = nextStatus;
  }

  // Se quantidade ou preço mudou sem um total explícito,
  // recalcula o total para evitar valores desatualizados.
  const quantityChanged = hasOwn(buyer, 'quantidade_prevista');
  const priceChanged = hasOwn(buyer, 'valor_unitario');

  if ((quantityChanged || priceChanged) &&
      !hasOwn(buyer, 'valor_total')) {
    row[7] = roundCurrency(Number(row[5]) * Number(row[6]));
  }

  return row;
}

function validateOperationalStatus(status) {
  const allowed = [
    APP.STATUS.PLANNED,
    APP.STATUS.CONFIRMED,
    APP.STATUS.IN_TRANSIT,
    APP.STATUS.RECEIVED
  ];

  if (allowed.indexOf(status) === -1) {
    throw apiError(
      'INVALID_STATUS',
      'Status operacional inválido: ' + status
    );
  }
}

function verifyVersion(row, payload) {
  if (payload.version === undefined || payload.version === null) {
    // Compatibilidade com clientes antigos.
    // Para concorrência otimista completa, o PWA deve enviar version.
    return;
  }

  const currentVersion = Number(row[17] || 1);
  const suppliedVersion = Number(payload.version);

  if (!Number.isInteger(suppliedVersion) ||
      suppliedVersion !== currentVersion) {
    throw apiError(
      'VERSION_CONFLICT',
      'A carga foi modificada por outro usuário. Atualize os dados antes de salvar.'
    );
  }
}

function recordToObject(row) {
  return {
    id_carga: String(row[0]),
    timestamps: {
      criacao: serializeDate(row[1]),
      atualizacao: serializeDate(row[12]),
      cancelamento: serializeDate(row[13])
    },
    tipo_coco: row[2],
    comprador: {
      fornecedor: row[3],
      previsao_entrega: serializeDate(row[4]),
      quantidade_prevista: row[5],
      valor_unitario: row[6],
      valor_total: row[7],
      logistica: row[8],
      observacao: row[10],
      email: row[11]
    },
    status: row[9],
    auditoria: {
      criado_por: row[14],
      atualizado_por: row[15],
      cancelado_por: row[16]
    },
    version: Number(row[17] || 1)
  };
}

function serializeDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value === null || value === undefined ? '' : value;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generatePurchaseId() {
  return 'CARGA-' + Utilities.getUuid().toUpperCase();
}
