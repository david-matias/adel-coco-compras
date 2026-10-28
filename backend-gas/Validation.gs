
/**
 * Funções puras de validação e normalização.
 * Não executam operações de leitura ou escrita na planilha.
 */

function normalizeId(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function requireId(payload) {
  const id = normalizeId(payload && payload.id_carga);

  if (!id) {
    throw apiError(
      'ID_REQUIRED',
      'O campo id_carga é obrigatório para esta operação.'
    );
  }

  if (id.length > 100) {
    throw apiError('INVALID_ID', 'O ID da carga é muito longo.');
  }

  return id;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw apiError('INVALID_PAYLOAD', 'O payload deve ser um objeto JSON.');
  }

  if (payload.comprador !== undefined &&
      (!payload.comprador ||
       typeof payload.comprador !== 'object' ||
       Array.isArray(payload.comprador))) {
    throw apiError(
      'INVALID_BUYER',
      'O campo comprador deve ser um objeto JSON.'
    );
  }

  const comprador = payload.comprador || {};

  const numericFields = [
    'quantidade_prevista',
    'valor_unitario',
    'valor_total'
  ];

  numericFields.forEach(function (field) {
    if (hasOwn(comprador, field)) {
      parseNonNegativeNumber(comprador[field], field);
    }
  });

  [
    'tipo_coco',
    'status'
  ].forEach(function (field) {
    if (hasOwn(payload, field)) {
      validateText(payload[field], field);
    }
  });

  [
    'fornecedor',
    'previsao_entrega',
    'logistica',
    'observacao',
    'email'
  ].forEach(function (field) {
    if (hasOwn(comprador, field)) {
      validateText(comprador[field], field);
    }
  });
}

function parseNonNegativeNumber(value, fieldName) {
  if (value === '' || value === null || value === undefined) {
    throw apiError(
      'INVALID_NUMBER',
      'O campo ' + fieldName + ' deve conter um número.'
    );
  }

  if (typeof value === 'string' && value.trim() === '') {
    throw apiError(
      'INVALID_NUMBER',
      'O campo ' + fieldName + ' deve conter um número.'
    );
  }

  // A API aceita números JSON e strings numéricas com ponto decimal.
  // Não converte automaticamente "1.234,56", pois isso pode gerar
  // interpretações financeiras incorretas.
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw apiError(
      'INVALID_NUMBER',
      'O campo ' + fieldName + ' deve ser um número não negativo.'
    );
  }

  return number;
}

function validateText(value, fieldName) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean') {
    throw apiError(
      'INVALID_FIELD',
      'O campo ' + fieldName + ' possui um tipo inválido.'
    );
  }

  if (String(value).length > APP.MAX_TEXT_LENGTH) {
    throw apiError(
      'FIELD_TOO_LONG',
      'O campo ' + fieldName + ' excede o tamanho permitido.'
    );
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
