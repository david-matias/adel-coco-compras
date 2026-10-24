import { OfflineStore } from '../services/offlineStore';

export class AppViews {
  
  /**
   * Renderiza a tela "Minhas Compras" com base na fila offline local
   */
  static renderMinhasCompras(): string {
    const fila = OfflineStore.obterFila();

    if (fila.length === 0) {
      return `
        <div class="card card-adel border-0 shadow-sm p-4 text-center">
          <i class="bi bi-inbox text-muted display-4 mb-2"></i>
          <h6 class="fw-bold text-secondary">Nenhuma carga recente no dispositivo</h6>
          <p class="text-muted small mb-0">Os lançamentos realizados aparecerão aqui para acompanhamento de status.</p>
        </div>
      `;
    }

    let htmlCards = fila.map(item => {
      const unidadeText = item.tipo_coco === 'Coco Verde' ? 'litros' : 'kg';
      return `
        <div class="card card-adel border-0 shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <span class="badge ${item.tipo_coco === 'Coco Verde' ? 'bg-success' : 'bg-warning text-dark'} mb-1">${item.tipo_coco}</span>
                <h6 class="fw-bold mb-0 text-dark">${item.comprador.fornecedor}</h6>
              </div>
              <span class="badge bg-warning text-dark"><i class="bi bi-clock-history me-1"></i>Pendente / Salvo</span>
            </div>
            <hr class="my-2 text-muted opacity-25">
            <div class="row g-2 small text-muted">
              <div class="col-6">
                <strong>Volume/Peso:</strong> ${item.comprador.quantidade_prevista.toLocaleString('pt-BR')} ${unidadeText}
              </div>
              <div class="col-6">
                <strong>Valor Total:</strong> ${item.comprador.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div class="col-12">
                <strong>Previsão de Entrega:</strong> ${item.comprador.previsao_entrega}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold text-secondary mb-0"><i class="bi bi-list-check me-2"></i>Minhas Compras</h5>
        <span class="badge bg-adel">${fila.length} na fila</span>
      </div>
      ${htmlCards}
    `;
  }

  /**
   * Renderiza a tela "Projeção de Estoque"
   */
  static renderProjecaoEstoque(): string {
    return `
      <div class="card card-adel border-0 shadow-sm p-3 mb-3">
        <h5 class="fw-bold text-secondary mb-2"><i class="bi bi-graph-up-arrow me-2 text-success"></i>Projeção de Estoque</h5>
        <p class="text-muted small">Necessidade de descarga da fábrica alinhada com a produção.</p>
        
        <div class="table-responsive">
          <table class="table table-sm table-bordered text-center align-middle small">
            <thead class="table-light">
              <tr>
                <th>Dia</th>
                <th>Necessidade</th>
                <th>Cargas</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Seg 20/10</td><td>48.000 L</td><td>2 caminhões</td></tr>
              <tr><td>Ter 21/10</td><td>36.000 L</td><td>1 caminhão</td></tr>
              <tr><td>Qua 22/10</td><td>48.000 L</td><td>2 caminhões</td></tr>
              <tr><td>Qui 23/10</td><td>48.000 L</td><td>2 caminhões</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza a tela "Teto de Preço"
   */
  static renderTetoPreco(): string {
    return `
      <div class="card card-adel border-0 shadow-sm p-4 text-center mb-3">
        <span class="badge bg-success mb-2 p-2">Faixa de Preço Permitida</span>
        <h6 class="text-muted small">Preço máximo recomendado pela diretoria</h6>
        <h2 class="fw-bold text-danger mb-3">R$ 1,40 <small class="fs-6 text-muted">/ litro ou kg</small></h2>
        <hr class="text-muted opacity-25">
        <div class="text-start small text-muted">
          <p class="mb-1"><strong>Média praticada:</strong> R$ 1,18</p>
          <p class="mb-0"><strong>Menor preço:</strong> R$ 1,05</p>
        </div>
      </div>
    `;
  }
}