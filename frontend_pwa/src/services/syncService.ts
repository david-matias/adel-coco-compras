import type { CargaPayload } from '../types/compra';
import { OfflineStore } from './offlineStore';

// URL do Web App implantado no Google Apps Script
const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbz--1Y7hNTJDORisst5Uo4LHVoF7RWUz-1ixJPHE52gTNE3ySYhTAZJu_whF03ynHQ/exec';  

export class SyncService {
  /**
   * Alias para compatibilidade com chamadas no main.ts
   */
  static async sincronizarFila(onSynced?: () => void): Promise<void> {
    return this.sincronizacaoEmBackground(onSynced);
  }

  /**
   * Envia os itens pendentes da fila para o Google Apps Script (Stage)
   */
  static async sincronizacaoEmBackground(onSynced?: () => void): Promise<void> {
    const fila = OfflineStore.obterFila();
    if (fila.length === 0) return;

    const novaFila: CargaPayload[] = [];

    for (const carga of fila) {
      const enviado = await this.enviarParaGAS(carga);
      if (!enviado) {
        novaFila.push(carga); // Mantém na fila se falhar a rede
      }
    }

    // Atualiza o localStorage apenas com o que restou na fila
    localStorage.setItem('adel_compras_offline_queue', JSON.stringify(novaFila));

    if (onSynced && fila.length !== novaFila.length) {
      onSynced();
    }
  }

  /**
   * Dispara o POST para o Web App do GAS contornando o bloqueio de CORS com 'no-cors'
   */
  private static async enviarParaGAS(payload: CargaPayload): Promise<boolean> {
    try {
      await fetch(GAS_ENDPOINT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      return true;
    } catch (error) {
      console.error('Falha de conexão ao enviar carga para o GAS:', error);
      return false;
    }
  }

  /**
   * Inicializa os ouvintes de rede para sincronizar automaticamente
   */
  static inicializarOuvintes(onSynced?: () => void): void {
    window.addEventListener('online', () => {
      this.sincronizacaoEmBackground(onSynced);
    });

    if (navigator.onLine) {
      this.sincronizacaoEmBackground(onSynced);
    }
  }
}