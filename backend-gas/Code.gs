
/**
 * API HTTP da Adel Coco.
 *
 * Endpoints:
 * GET  ?action=PING
 * GET  ?action=LIST
 * GET  ?action=GET&id_carga=CARGA-...
 *
 * POST JSON:
 * {"action":"CREATE", ...}
 * {"action":"UPDATE","id_carga":"CARGA-...", ...}
 * {"action":"SAVE", ...}
 * {"action":"DELETE","id_carga":"CARGA-..."}
 * {"action":"CANCEL","id_carga":"CARGA-..."}
 *
 * DELETE e CANCEL são equivalentes e executam cancelamento lógico.
 */

var CURRENT_REQUEST_ID = '';

function doGet(e) {
  CURRENT_REQUEST_ID = Utilities.getUuid();

  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || 'LIST').trim().toUpperCase();

    if (action === ACTIONS.PING) {
      return successResponse({
        message: 'API operacional.',
        service: APP.NAME,
        version: APP.VERSION
      });
    }

    // Em implantação pública, GET também precisa de proteção.
    // Veja a seção de autenticação e implantação abaixo.
    authorizeRequest(null, params);

    if (action === ACTIONS.LIST) {
      return successResponse(listPurchases(params));
    }

    if (action === ACTIONS.GET) {
      const id = normalizeId(params.id_carga);

      if (!id) {
        throw apiError('ID_REQUIRED', 'Informe id_carga.');
      }

      return successResponse({
        compra: getPurchase(id)
      });
    }

    throw apiError('INVALID_ACTION', 'Ação GET não permitida: ' + action);

  } catch (error) {
    return errorResponse(error, CURRENT_REQUEST_ID);
  }
}

function doPost(e) {
  CURRENT_REQUEST_ID = Utilities.getUuid();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw apiError('EMPTY_BODY', 'O corpo da requisição está vazio.');
    }

    let payload;

    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      throw apiError('INVALID_JSON', 'O corpo da requisição não contém JSON válido.');
    }

    validatePayload(payload);

    const action = String(
      payload.action ||
      (e.parameter && e.parameter.action) ||
      ACTIONS.SAVE
    ).trim().toUpperCase();

    const context = {
      requestId: CURRENT_REQUEST_ID,
      user: getAuthenticatedActor()
    };

    authorizeRequest(payload, e.parameter || {});

    let result;

    switch (action) {
      case ACTIONS.CREATE:
        result = createPurchase(payload, context);
        break;

      case ACTIONS.UPDATE:
        result = updatePurchase(payload, context);
        break;

      case ACTIONS.SAVE:
        result = savePurchase(payload, context);
        break;

      case ACTIONS.DELETE:
      case ACTIONS.CANCEL:
        result = cancelPurchase(payload, context);
        break;

      default:
        throw apiError('INVALID_ACTION', 'Ação POST não permitida: ' + action);
    }

    return successResponse(result);

  } catch (error) {
    return errorResponse(error, CURRENT_REQUEST_ID);
  }
}

/**
 * Resolve o ator a partir da identidade disponibilizada pelo Google.
 *
 * IMPORTANTE:
 * Session.getActiveUser().getEmail() pode retornar vazio dependendo
 * da implantação e da política de identidade do Google Workspace.
 *
 * Nunca considere payload.email como prova de identidade.
 */
function getAuthenticatedActor() {
  try {
    const email = Session.getActiveUser().getEmail();

    if (email) {
      return normalizeEmail(email);
    }
  } catch (error) {
    console.warn('Não foi possível resolver o usuário autenticado.');
  }

  return 'NAO_IDENTIFICADO';
}

/**
 * Controle básico por token para integrações servidor-servidor.
 *
 * Script Properties:
 * AUTH_MODE = OFF ou TOKEN
 * API_TOKEN = segredo forte, quando AUTH_MODE=TOKEN
 *
 * Limitação de segurança:
 * um token incluído no JavaScript do PWA pode ser extraído pelo usuário.
 * Portanto, TOKEN não torna segura uma aplicação web pública quando o
 * segredo é distribuído ao navegador. Use um backend intermediário ou
 * autenticação Google adequada para produção.
 */
function authorizeRequest(payload, params) {
  const properties = PropertiesService.getScriptProperties();
  const mode = String(
    properties.getProperty('AUTH_MODE') || 'OFF'
  ).trim().toUpperCase();

  if (mode === 'OFF') {
    return;
  }

  if (mode !== 'TOKEN') {
    throw apiError(
      'AUTH_CONFIGURATION_ERROR',
      'AUTH_MODE deve ser OFF ou TOKEN.'
    );
  }

  const expected = properties.getProperty('API_TOKEN');

  if (!expected) {
    throw apiError(
      'AUTH_CONFIGURATION_ERROR',
      'API_TOKEN não está configurado nas Script Properties.'
    );
  }

  // Apps Script Web Apps não expõem genericamente todos os cabeçalhos
  // HTTP do cliente em doGet/doPost. Para este modo, o token é enviado
  // no corpo JSON ou na query string.
  const supplied = payload && payload.api_token
    ? String(payload.api_token)
    : (params && params.api_token ? String(params.api_token) : '');

  if (!constantTimeEquals(supplied, expected)) {
    throw apiError('UNAUTHORIZED', 'Credencial inválida ou ausente.');
  }
}

function constantTimeEquals(a, b) {
  a = String(a);
  b = String(b);

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}
