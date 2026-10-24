import type { CargaPayload } from '../types/compra';

const STORAGE_KEY = 'adel_compras_offline_queue';

export class OfflineStore {
  static salvarNaFila(compra: CargaPayload): void {
    const fila = this.obterFila();
    fila.push(compra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
  }

  static obterFila(): CargaPayload[] {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  static limparFila(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static quantidadePendente(): number {
    return this.obterFila().length;
  }
}