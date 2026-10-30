
/**
 * Configuração central da API de compras da Adel Coco.
 *
 * Não armazene senhas ou tokens diretamente neste arquivo.
 * Segredos operacionais devem ficar em Script Properties ou em
 * um serviço de segredos apropriado.
 */

const APP = Object.freeze({
  NAME: 'Adel Coco - API Stage Compras',
  VERSION: '3.0.0',

  SHEET_NAME: 'Stage_Compras',
  AUDIT_SHEET_NAME: 'Audit_Compras',

  LOCK_TIMEOUT_MS: 30000,
  MAX_LIST_RESULTS: 500,
  MAX_TEXT_LENGTH: 2000,

  DEFAULT_COCONUT_TYPE: 'Coco Seco',
  DEFAULT_LOGISTICS: 'TERCEIRO',
  DEFAULT_STATUS: 'PREVISTO',

  STATUS: Object.freeze({
    PLANNED: 'PREVISTO',
    CONFIRMED: 'CONFIRMADO',
    IN_TRANSIT: 'EM_TRANSITO',
    RECEIVED: 'RECEBIDO',
    CANCELLED: 'CANCELADA'
  }),

  // As primeiras 12 colunas mantêm compatibilidade com a planilha atual.
  COLUMNS: Object.freeze([
    'ID Carga',
    'Data Criação',
    'Tipo Coco',
    'Fornecedor',
    'Previsão Entrega',
    'Quantidade / Volume',
    'Valor Unitário',
    'Valor Total',
    'Logística',
    'Status',
    'Observação',
    'Email Comprador',
    'Data Atualização',
    'Data Cancelamento',
    'Criado Por',
    'Atualizado Por',
    'Cancelado Por',
    'Versão'
  ]),

  AUDIT_COLUMNS: Object.freeze([
    'Data/Hora',
    'Request ID',
    'ID Carga',
    'Ação',
    'Usuário',
    'Resultado',
    'Detalhes'
  ])
});

const ACTIONS = Object.freeze({
  LIST: 'LIST',
  GET: 'GET',
  PING: 'PING',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  SAVE: 'SAVE',
  DELETE: 'DELETE',
  CANCEL: 'CANCEL'
});
