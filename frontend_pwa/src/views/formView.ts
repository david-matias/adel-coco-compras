import { CargaPayload, TipoCoco, ModalidadeLogistica } from '../types/compra';
import { OfflineStore } from '../services/offlineStore';

export class FormView {
  /**
   * Retorna o HTML estruturado do formulário de lançamento
   */
  static render(): string {
    return `
      <div class="card card-adel border-0 shadow-sm">
        <div class="card-header card-header-adel py-3">
          <h5 class="card-title mb-0 fw-bold text-secondary">
            <i class="bi bi-cart-plus me-2 text-danger"></i>Novo Lançamento de Carga
          </h5>
        </div>
        <div class="card-body">
          <form id="formCompra">
            
            <!-- Seleção do Tipo de Coco (Toggle) -->
            <label class="form-label fw-bold small text-muted">TIPO DE MATÉRIA-PRIMA</label>
            <div class="btn-group w-100 mb-3" role="group">
              <input type="radio" class="btn-check" name="tipo_coco" id="tipoVerde" value="Coco Verde" checked />
              <label class="btn btn-outline-success py-2 fw-bold" for="tipoVerde">
                <i class="bi bi-circle-fill me-1 text-success"></i>Coco Verde
              </label>

              <input type="radio" class="btn-check" name="tipo_coco" id="tipoSeco" value="Coco Seco" />
              <label class="btn btn-outline-warning py-2 fw-bold" for="tipoSeco">
                <i class="bi bi-circle-fill me-1 text-warning"></i>Coco Seco
              </label>
            </div>

            <!-- Dados do Fornecedor -->
            <div class="mb-3">
              <label for="fornecedor" class="form-label fw-bold small text-muted">FORNECEDOR / FAZENDA</label>
              <input type="text" id="fornecedor" class="form-control form-control-lg" placeholder="Nome do fornecedor ou fazenda" required />
            </div>

            <!-- Previsão e Logística -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label for="previsaoEntrega" class="form-label fw-bold small text-muted">PREVISÃO ENTREGA</label>
                <input type="date" id="previsaoEntrega" class="form-control form-control-lg" required />
              </div>
              <div class="col-6">
                <label for="logistica" class="form-label fw-bold small text-muted">LOGÍSTICA</label>
                <select id="logistica" class="form-select form-select-lg" required>
                  <option value="TERCEIRO">Terceiro</option>
                  <option value="FROTA">Frota Própria</option>
                </select>
              </div>
            </div>

            <!-- Quantidade e Preço Unitário -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label id="labelQuantidade" for="quantidade" class="form-label fw-bold small text-muted">QUANTIDADE (FRUTOS)</label>
                <input type="number" id="quantidade" class="form-control form-control-lg" placeholder="0" min="1" step="any" required />
              </div>
              <div class="col-6">
                <label id="labelValorUnitario" for="valorUnitario" class="form-label fw-bold small text-muted">PREÇO UN. (R$/FRUTO)</label>
                <input type="number" id="valorUnitario" class="form-control form-control-lg" placeholder="0.00" min="0.01" step="0.01" required />
              </div>
            </div>

            <!-- Valor Total Calculado -->
            <div class="p-3 bg-light rounded mb-3 border">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold text-muted small">VALOR TOTAL ESTIMADO:</span>
                <span id="displayValorTotal" class="h4 mb-0 fw-bold text-danger">R$ 0,00</span>
              </div>
            </div>

            <!-- Observações -->
            <div class="mb-3">
              <label for="observacao" class="form-label fw-bold small text-muted">OBSERVAÇÕES (OPCIONAL)</label>
              <textarea id="observacao" class="form-control" rows="2" placeholder="Qualidade, padrão, rota..."></textarea>
            </div>

            <!-- Botão de Ação -->
            <button type="submit" id="btnSalvar" class="btn btn-adel btn-lg w-100 py-3 fw-bold shadow-sm">
              <i class="bi bi-check-circle-fill me-2"></i>Salvar Compra
            </button>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Atribui os eventos de interatividade do formulário (cálculos e salvamento)
   */
  static attachEvents(onSavedCallback?: () => void): void {
    const formCompra = document.getElementById('formCompra') as HTMLFormElement;
    const radioVerde = document.getElementById('tipoVerde') as HTMLInputElement;
    const radioSeco = document.getElementById('tipoSeco') as HTMLInputElement;
    const labelQuantidade = document.getElementById('labelQuantidade') as HTMLLabelElement;
    const labelValorUnitario = document.getElementById('labelValorUnitario') as HTMLLabelElement;
    const inputQuantidade = document.getElementById('quantidade') as HTMLInputElement;
    const inputValorUnitario = document.getElementById('valorUnitario') as HTMLInputElement;
    const displayValorTotal = document.getElementById('displayValorTotal') as HTMLSpanElement;

    if (!formCompra) return;

    // Alternância dinâmica de unidades
    const atualizarUnidades = () => {
      if (radioVerde.checked) {
        labelQuantidade.textContent = 'QUANTIDADE (FRUTOS)';
        labelValorUnitario.textContent = 'PREÇO UN. (R$/FRUTO)';
        inputQuantidade.placeholder = 'Ex: 10000';
      } else {
        labelQuantidade.textContent = 'PESO PREVISTO (KG)';
        labelValorUnitario.textContent = 'PREÇO UN. (R$/KG)';
        inputQuantidade.placeholder = 'Ex: 15000';
      }
      calcularValorTotal();
    };

    // Cálculo automático do total
    const calcularValorTotal = () => {
      const qtd = parseFloat(inputQuantidade.value) || 0;
      const preco = parseFloat(inputValorUnitario.value) || 0;
      const total = qtd * preco;

      displayValorTotal.textContent = total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    radioVerde.addEventListener('change', atualizarUnidades);
    radioSeco.addEventListener('change', atualizarUnidades);
    inputQuantidade.addEventListener('input', calcularValorTotal);
    inputValorUnitario.addEventListener('input', calcularValorTotal);

    // Submissão do formulário
    formCompra.addEventListener('submit', (e: Event) => {
      e.preventDefault();

      const tipoCoco: TipoCoco = radioVerde.checked ? 'Coco Verde' : 'Coco Seco';
      const fornecedor = (document.getElementById('fornecedor') as HTMLInputElement).value;
      const previsaoEntrega = (document.getElementById('previsaoEntrega') as HTMLInputElement).value;
      const logistica = (document.getElementById('logistica') as HTMLSelectElement).value as ModalidadeLogistica;
      const quantidade = parseFloat(inputQuantidade.value);
      const valorUnitario = parseFloat(inputValorUnitario.value);
      const valorTotal = quantidade * valorUnitario;
      const observacao = (document.getElementById('observacao') as HTMLTextAreaElement).value;

      const novaCarga: CargaPayload = {
        id_carga: `CARGA-${Date.now()}`,
        tipo_coco: tipoCoco,
        comprador: {
          email: 'comprador@adelcoco.com',
          fornecedor,
          previsao_entrega: previsaoEntrega,
          quantidade_prevista: quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          logistica,
          observacao
        },
        status: 'PREVISTO',
        timestamps: {
          criacao: new Date().toISOString()
        }
      };

      OfflineStore.salvarNaFila(novaCarga);
      alert('Carga registrada com sucesso no aparelho!');
      formCompra.reset();
      atualizarUnidades();

      if (onSavedCallback) {
        onSavedCallback();
      }
    });

    atualizarUnidades();
  }
}