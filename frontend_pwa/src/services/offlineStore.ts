import { CargaPayload } from '../types/compra';

const STORAGE_KEY = 'adel_compras_offline_queue';

export class OfflineStore {
  // Salva uma compra na fila local do dispositivo
  static salvarNaFila(compra: CargaPayload): void {
    const fila = this.obterFila();
    fila.push(compra);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fila));
  }

  // Retorna todas as compras pendentes de envio
  static obterFila(): CargaPayload[] {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  // Limpa a fila após sincronização bem-sucedida
  static limparFila(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Retorna a quantidade de itens aguardando sincronização
  static quantidadePendente(): number {
    return this.obterFila().length;
  }
}