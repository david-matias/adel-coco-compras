
/**
 * Padroniza todas as respostas da API.
 *
 * O código HTTP não pode ser configurado livremente com ContentService.
 * Consumidores devem avaliar o campo JSON "status".
 */

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data) {
  return jsonResponse(Object.assign({
    status: 'success',
    api_version: APP.VERSION,
    request_id: getCurrentRequestId()
  }, data || {}));
}

function errorResponse(error, requestId) {
  const message = error && error.message
    ? error.message
    : 'Erro interno inesperado.';

  console.error(JSON.stringify({
    request_id: requestId || getCurrentRequestId(),
    message: message,
    stack: error && error.stack ? error.stack : ''
  }));

  return jsonResponse({
    status: 'error',
    api_version: APP.VERSION,
    request_id: requestId || getCurrentRequestId(),
    error: {
      code: error && error.code
        ? error.code
        : 'INTERNAL_ERROR',
      message: message
    }
  });
}

function apiError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getCurrentRequestId() {
  return typeof CURRENT_REQUEST_ID !== 'undefined'
    ? CURRENT_REQUEST_ID
    : Utilities.getUuid();
}
