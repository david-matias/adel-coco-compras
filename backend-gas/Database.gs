
/**
 * Camada de persistência.
 *
 * Responsável por:
 * - inicializar e validar o esquema;
 * - localizar registros;
 * - ler e gravar linhas;
 * - registrar auditoria;
 * - controlar a concorrência de escrita.
 */

function getDatabase() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw apiError(
      'DATABASE_NOT_CONFIGURED',
      'Não foi possível acessar a planilha vinculada ao projeto.'
    );
  }

  let sheet = spreadsheet.getSheetByName(APP.SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP.SHEET_NAME);
    sheet.getRange(1, 1, 1, APP.COLUMNS.length)
      .setValues([Array.from(APP.COLUMNS)]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, APP.COLUMNS.length).setFontWeight('bold');
  } else {
    ensureSchema(sheet);
  }

  return sheet;
}

function ensureSchema(sheet) {
  const expected = Array.from(APP.COLUMNS);
  const legacy = expected.slice(0, 12);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    sheet.setFrozenRows(1);
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 12);
  const actual = sheet
    .getRange(1, 1, 1, Math.min(lastColumn, expected.length))
    .getDisplayValues()[0];

  for (let i = 0; i < legacy.length; i++) {
    if (String(actual[i] || '').trim() !== legacy[i]) {
      throw apiError(
        'SCHEMA_MISMATCH',
        'Cabeçalho incompatível na coluna ' + (i + 1) +
        '. Esperado: "' + legacy[i] + '". Verifique a planilha.'
      );
    }
  }

  // Acrescenta somente as novas colunas de auditoria.
  // Não sobrescreve dados existentes.
  for (let i = 12; i < expected.length; i++) {
    const current = sheet.getRange(1, i + 1).getDisplayValue().trim();

    if (current && current !== expected[i]) {
      throw apiError(
        'SCHEMA_MISMATCH',
        'A coluna ' + (i + 1) +
        ' está ocupada por "' + current +
        '", mas deveria ser "' + expected[i] + '".'
      );
    }

    if (!current) {
      sheet.getRange(1, i + 1).setValue(expected[i]);
    }
  }

  sheet.setFrozenRows(1);
}

function getAuditSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(APP.AUDIT_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP.AUDIT_SHEET_NAME);
    sheet.getRange(1, 1, 1, APP.AUDIT_COLUMNS.length)
      .setValues([Array.from(APP.AUDIT_COLUMNS)]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, APP.AUDIT_COLUMNS.length)
      .setFontWeight('bold');
  }

  return sheet;
}

function findRowsById(sheet, id) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  const target = normalizeId(id);
  const matches = [];

  for (let i = 0; i < ids.length; i++) {
    if (normalizeId(ids[i][0]) === target) {
      matches.push(i + 2);
    }
  }

  return matches;
}

function readRecord(sheet, rowIndex) {
  return sheet
    .getRange(rowIndex, 1, 1, APP.COLUMNS.length)
    .getValues()[0];
}

function appendRecord(sheet, row) {
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function writeRecord(sheet, rowIndex, row) {
  sheet
    .getRange(rowIndex, 1, 1, APP.COLUMNS.length)
    .setValues([row]);
}

function auditEvent(event) {
  const sheet = getAuditSheet();

  sheet.appendRow([
    new Date(),
    event.request_id || getCurrentRequestId(),
    event.id_carga || '',
    event.action || '',
    event.user || 'NAO_IDENTIFICADO',
    event.result || 'SUCCESS',
    JSON.stringify(event.details || {})
  ]);
}

function withWriteLock(callback) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(APP.LOCK_TIMEOUT_MS);
  } catch (error) {
    throw apiError(
      'LOCK_TIMEOUT',
      'O sistema está processando outras operações. Tente novamente.'
    );
  }

  try {
    const result = callback();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}
