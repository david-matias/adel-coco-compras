import { OfflineStore } from './offlineStore';
import { CargaPayload } from '../types/compra';

// URL do Web App do Google Apps Script (Será substituída pela URL real após o deploy do GAS)
const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/SUA_URL_AQUI/exec';

export class SyncService {
  private static sincronizando = false;

  /**
   * Dispara o processo de sincronização dos itens armazenados na fila local
   */
  static async sincronizarFila(onSuccessCallback?: () => void): Promise<void> {
    if (this.sincronizando) return;

    const fila = OfflineStore.obterFila();
    if (fila.length === 0) return;

    if (!navigator.onLine) {
      console.log('Dispositivo offline. Sincronização adiada.');
      return;
    }

    this.sincronizando = true;
    console.log(`Iniciando sincronização de ${fila.length} registro(s)...`);

    const itensParaManter: CargaPayload[] = [];

    for (const item of fila) {
      try {
        const sucesso = await this.enviarParaGAS(item);
        if (!sucesso) {
          // Se falhou no envio, mantém o item na fila para tentar novamente depois
          itensParaManter.push(item);
        }
      } catch (error) {
        console.error('Erro ao enviar item:', error);
        itensParaManter.push(item);
      }
    }

    // Atualiza a fila mantendo apenas o que não pôde ser enviado
    if (itensParaManter.length === 0) {
      OfflineStore.limparFila();
    } else {
      localStorage.setItem('adel_compras_offline_queue', JSON.stringify(itensParaManter));
    }

    this.sincronizando = false;

    if (onSuccessCallback) {
      onSuccessCallback();
    }
  }

  /**
   * Realiza a requisição HTTP POST para o endpoint do Google Apps Script
   */
  private static async enviarParaGAS(payload: CargaPayload): Promise<boolean> {
    try {
      const response = await fetch(GAS_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // GAS exige text/plain para evitar erro de CORS em chamadas simples
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resultado = await response.json();
        return resultado.status === 'success';
      }
      return false;
    } catch (error) {
      console.error('Falha na comunicação com o servidor GAS:', error);
      return false;
    }
  }

  /**
   * Registra os ouvintes globais para sincronização automática
   */
  static inicializarOuvintes(onUpdateUI: () => void): void {
    // Tenta sincronizar imediatamente assim que o sinal de internet voltar
    window.addEventListener('online', () => {
      console.log('Conexão restabelecida. Disparando sincronização...');
      this.sincronizarFila(onUpdateUI);
    });

    // Tenta sincronizar na inicialização do app caso já esteja online
    if (navigator.onLine) {
      this.sincronizarFila(onUpdateUI);
    }
  }
}