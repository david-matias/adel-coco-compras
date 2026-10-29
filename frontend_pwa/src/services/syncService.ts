import { OfflineStore } from './offlineStore';
import { apiPost } from './api';

let sincronizando = false;

export class SyncService {
  static async sincronizarFila(onSynced?: () => void): Promise<void> {
    if (sincronizando || !navigator.onLine) return;
    sincronizando = true;

    try {
      const fila = OfflineStore.obterFila();
      let houveSucesso = false;

      for (const carga of fila) {
        try {
          // SAVE funciona como upsert idempotente no backend: uma repetição
          // usa o mesmo ID e não deve criar uma segunda carga.
          await apiPost({ ...carga, action: 'SAVE' });
          OfflineStore.removerDaFila(carga.id_carga);
          houveSucesso = true;
        } catch (error) {
          // Sem resposta confirmada, a carga permanece na fila.
          console.warn(`Carga ${carga.id_carga} continua pendente.`, error);
        }
      }

      if (houveSucesso) onSynced?.();
    } finally {
      sincronizando = false;
    }
  }

  static sincronizacaoEmBackground(onSynced?: () => void): Promise<void> {
    return this.sincronizarFila(onSynced);
  }

  static inicializarOuvintes(onSynced?: () => void): void {
    window.addEventListener('online', () => void this.sincronizarFila(onSynced));
    if (navigator.onLine) void this.sincronizarFila(onSynced);
  }
}
