import type { CargaPayload } from '../types/compra';

const STORAGE_KEY = 'adel_compras_offline_queue';

export class OfflineStore {
  static salvarNaFila(compra: CargaPayload): void {
    const fila = this.obterFila();
    const index = fila.findIndex(item => item.id_carga === compra.id_carga);
    if (index >= 0) fila[index] = compra;
    else fila.push(compra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
  }

  static obterFila(): CargaPayload[] {
    const dados = localStorage.getItem(STORAGE_KEY);
    if (!dados) return [];
    try {
      const parsed: unknown = JSON.parse(dados);
      return Array.isArray(parsed) ? parsed as CargaPayload[] : [];
    } catch (error) {
      localStorage.setItem(`${STORAGE_KEY}_corrupt_backup`, dados);
      console.error('A fila local está corrompida; uma cópia bruta foi preservada para recuperação.', error);
      return [];
    }
  }

  static removerDaFila(idCarga: string): void {
    const fila = this.obterFila().filter(item => item.id_carga !== idCarga);
    if (fila.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
  }

  static substituirFila(fila: CargaPayload[]): void {
    if (fila.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
  }

  static limparFila(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static quantidadePendente(): number {
    return this.obterFila().length;
  }
}
