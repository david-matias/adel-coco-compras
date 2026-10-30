import type { CargaPayload, TipoCoco, ModalidadeLogistica } from '../types/compra';
import { OfflineStore } from '../services/offlineStore';
import { abrirWhatsAppComMensagem, gerarMensagemCompraWhatsApp } from '../services/whatsapp';

// Constante padrão de rendimento industrial para o Coco Verde
const LITROS_POR_FRUTO_VERDE = 0.4; // 400ml por fruto

export class FormView {
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

            <!-- Seleção do Tipo de Coco -->
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

            <!-- Condições comuns a todas as entregas -->
            <div class="mb-3">
              <label for="logistica" class="form-label fw-bold small text-muted">LOGÍSTICA</label>
              <select id="logistica" class="form-select form-select-lg" required>
                <option value="TERCEIRO">Terceiro</option>
                <option value="FROTA">Frota Adel Coco</option>
              </select>
            </div>

            <!-- Entregas independentes sob as mesmas condições de compra -->
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-bold small text-muted mb-0">ENTREGAS PROGRAMADAS</label>
              <span class="badge bg-secondary" id="contadorEntregas">1 entrega</span>
            </div>
            <p class="small text-muted mb-2">Cada data e quantidade gera uma carga independente. Se preço ou condições mudarem, faça outro lançamento.</p>
            <div id="deliveryRows" class="d-flex flex-column gap-2 mb-2">
              <div class="delivery-row border rounded p-2" data-index="0">
                <div class="row g-2 align-items-end">
                  <div class="col-6">
                    <label class="form-label small fw-bold text-muted labelQuantidadeEntrega">QUANTIDADE (FRUTOS)</label>
                    <input type="number" class="form-control form-control-lg delivery-quantity" placeholder="Ex: 10000" min="1" step="any" required />
                  </div>
                  <div class="col-6">
                    <label class="form-label small fw-bold text-muted">PREVISÃO ENTREGA</label>
                    <input type="date" class="form-control form-control-lg delivery-date" required />
                  </div>
                </div>
                <div class="text-end mt-2 delivery-remove-container"></div>
              </div>
            </div>
            <button type="button" id="btnAdicionarEntrega" class="btn btn-outline-secondary w-100 mb-3">
              <i class="bi bi-plus-circle me-1"></i>Adicionar outra entrega
            </button>

            <!-- Preço unitário comum a todas as entregas -->
            <div class="mb-3">
              <label id="labelValorUnitario" for="valorUnitario" class="form-label fw-bold small text-muted">PREÇO UN. (R$/LITRO)</label>
              <input type="number" id="valorUnitario" class="form-control form-control-lg" placeholder="0.00" min="0.01" step="0.01" required />
            </div>

            <!-- Painel Informativo de Conversão para Coco Verde -->
            <div id="painelConversaoVerde" class="alert alert-light border small py-2 mb-3">
              <div class="d-flex justify-content-between">
                <span>Volume de Água Estimado:</span>
                <strong id="displayLitrosEstimados" class="text-success">0 Litros</strong>
              </div>
            </div>

            <!-- Valor Total Calculado -->
            <div class="p-3 bg-light rounded mb-3 border">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold text-muted small">VALOR TOTAL A PAGAR:</span>
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

  static attachEvents(onSavedCallback?: () => void): void {
    const formCompra = document.getElementById('formCompra') as HTMLFormElement;
    const radioVerde = document.getElementById('tipoVerde') as HTMLInputElement;
    const radioSeco = document.getElementById('tipoSeco') as HTMLInputElement;
    const labelValorUnitario = document.getElementById('labelValorUnitario') as HTMLLabelElement;
    const inputValorUnitario = document.getElementById('valorUnitario') as HTMLInputElement;
    const displayValorTotal = document.getElementById('displayValorTotal') as HTMLSpanElement;
    const painelConversaoVerde = document.getElementById('painelConversaoVerde') as HTMLDivElement;
    const displayLitrosEstimados = document.getElementById('displayLitrosEstimados') as HTMLElement;
    const deliveryRows = document.getElementById('deliveryRows') as HTMLDivElement;
    const contadorEntregas = document.getElementById('contadorEntregas') as HTMLSpanElement;
    const btnAdicionarEntrega = document.getElementById('btnAdicionarEntrega') as HTMLButtonElement;

    if (!formCompra || !deliveryRows) return;

    const atualizarContadorEntregas = () => {
      const total = deliveryRows.querySelectorAll('.delivery-row').length;
      contadorEntregas.textContent = total === 1 ? '1 entrega' : `${total} entregas`;
      deliveryRows.querySelectorAll('.delivery-row').forEach(row => {
        const container = row.querySelector('.delivery-remove-container') as HTMLDivElement;
        container.innerHTML = total > 1
          ? '<button type="button" class="btn btn-sm btn-outline-danger btn-remover-entrega"><i class="bi bi-trash me-1"></i>Remover entrega</button>'
          : '';
      });
    };

    const adicionarLinhaEntrega = () => {
      const row = document.createElement('div');
      row.className = 'delivery-row border rounded p-2';
      row.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-6">
            <label class="form-label small fw-bold text-muted labelQuantidadeEntrega">QUANTIDADE (FRUTOS)</label>
            <input type="number" class="form-control form-control-lg delivery-quantity" placeholder="Ex: 10000" min="1" step="any" required />
          </div>
          <div class="col-6">
            <label class="form-label small fw-bold text-muted">PREVISÃO ENTREGA</label>
            <input type="date" class="form-control form-control-lg delivery-date" required />
          </div>
        </div>
        <div class="text-end mt-2 delivery-remove-container"></div>
      `;
      deliveryRows.appendChild(row);
      atualizarContadorEntregas();
      atualizarUnidades();
      calcularTotais();
    };

    const calcularTotais = () => {
      const quantities = Array.from(deliveryRows.querySelectorAll<HTMLInputElement>('.delivery-quantity'));
      const totalQuantidade = quantities.reduce((sum, input) => sum + (Number(input.value) || 0), 0);
      const precoUn = Number(inputValorUnitario.value) || 0;
      const litrosEstimados = radioVerde.checked ? totalQuantidade * LITROS_POR_FRUTO_VERDE : 0;
      const valorTotal = radioVerde.checked
        ? litrosEstimados * precoUn
        : totalQuantidade * precoUn;

      displayLitrosEstimados.textContent = `${litrosEstimados.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Litros`;
      displayValorTotal.textContent = valorTotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    const atualizarUnidades = () => {
      const verde = radioVerde.checked;
      labelValorUnitario.textContent = verde ? 'PREÇO UN. (R$/LITRO)' : 'PREÇO UN. (R$/KG)';
      painelConversaoVerde.classList.toggle('d-none', !verde);
      deliveryRows.querySelectorAll<HTMLInputElement>('.delivery-quantity').forEach(input => {
        input.placeholder = verde ? 'Ex: 10000' : 'Ex: 15000';
        const label = input.closest('.delivery-row')?.querySelector('.labelQuantidadeEntrega');
        if (label) label.textContent = verde ? 'QUANTIDADE (FRUTOS)' : 'PESO PREVISTO (KG)';
      });
      calcularTotais();
    };

    radioVerde.addEventListener('change', atualizarUnidades);
    radioSeco.addEventListener('change', atualizarUnidades);
    inputValorUnitario.addEventListener('input', calcularTotais);
    deliveryRows.addEventListener('input', calcularTotais);
    deliveryRows.addEventListener('change', calcularTotais);
    deliveryRows.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('.btn-remover-entrega');
      if (!button) return;
      button.closest('.delivery-row')?.remove();
      atualizarContadorEntregas();
      calcularTotais();
    });
    btnAdicionarEntrega.addEventListener('click', adicionarLinhaEntrega);

    formCompra.addEventListener('submit', (e: Event) => {
      e.preventDefault();

      if (!formCompra.reportValidity()) return;

      const tipoCoco: TipoCoco = radioVerde.checked ? 'Coco Verde' : 'Coco Seco';
      const fornecedor = (document.getElementById('fornecedor') as HTMLInputElement).value.trim();
      const logistica = (document.getElementById('logistica') as HTMLSelectElement).value as ModalidadeLogistica;
      const valorUnitario = parseFloat(inputValorUnitario.value);
      const observacao = (document.getElementById('observacao') as HTMLTextAreaElement).value;
      const emailComprador = (localStorage.getItem('@adel_coco:user_email') || '').trim().toLowerCase();

      if (!emailComprador) {
        alert('Sua sessão não tem um e-mail informado. Entre novamente antes de cadastrar.');
        return;
      }

      const linhas = Array.from(deliveryRows.querySelectorAll<HTMLDivElement>('.delivery-row'));
      const entregas = linhas.map(row => ({
        quantidade: Number((row.querySelector('.delivery-quantity') as HTMLInputElement).value),
        previsaoEntrega: (row.querySelector('.delivery-date') as HTMLInputElement).value
      }));

      if (entregas.length === 0 || entregas.some(item => !item.previsaoEntrega || !Number.isFinite(item.quantidade) || item.quantidade <= 0)) {
        alert('Informe uma data e uma quantidade válida para cada entrega.');
        return;
      }

      const cargas: CargaPayload[] = entregas.map(entrega => {
        const valorTotal = radioVerde.checked
          ? (entrega.quantidade * LITROS_POR_FRUTO_VERDE) * valorUnitario
          : entrega.quantidade * valorUnitario;

        return {
          id_carga: `CARGA-${crypto.randomUUID().toUpperCase()}`,
          tipo_coco: tipoCoco,
          comprador: {
            email: emailComprador,
            fornecedor,
            previsao_entrega: entrega.previsaoEntrega,
            quantidade_prevista: entrega.quantidade,
            valor_unitario: valorUnitario,
            valor_total: valorTotal,
            logistica,
            observacao
          },
          status: 'PREVISTO',
          timestamps: { criacao: new Date().toISOString() }
        };
      });

      cargas.forEach(carga => OfflineStore.salvarNaFila(carga));

      const mensagemWhatsApp = cargas.map(gerarMensagemCompraWhatsApp).join('\n\n--------------------\n\n');
      document.getElementById('painelWhatsAppCompartilhamento')?.remove();
      const painelWhatsApp = document.createElement('div');
      painelWhatsApp.id = 'painelWhatsAppCompartilhamento';
      painelWhatsApp.className = 'alert alert-success mt-3 mb-0';
      painelWhatsApp.innerHTML = `
        <div class="fw-bold mb-1"><i class="bi bi-check-circle-fill me-1"></i>${cargas.length} carga(s) salva(s) neste aparelho</div>
        <p class="small mb-2">Cada entrega foi registrada como uma carga independente. Prepare a mensagem e escolha o grupo no WhatsApp; o envio só acontece quando você confirmar no aplicativo.</p>
        <button type="button" id="btnCompartilharWhatsApp" class="btn btn-success w-100">
          <i class="bi bi-whatsapp me-2"></i>Preparar mensagem no WhatsApp
        </button>
      `;
      formCompra.insertAdjacentElement('afterend', painelWhatsApp);
      document.getElementById('btnCompartilharWhatsApp')?.addEventListener('click', () => {
        abrirWhatsAppComMensagem(mensagemWhatsApp);
      });

      formCompra.reset();
      deliveryRows.innerHTML = `
        <div class="delivery-row border rounded p-2" data-index="0">
          <div class="row g-2 align-items-end">
            <div class="col-6">
              <label class="form-label small fw-bold text-muted labelQuantidadeEntrega">QUANTIDADE (FRUTOS)</label>
              <input type="number" class="form-control form-control-lg delivery-quantity" placeholder="Ex: 10000" min="1" step="any" required />
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold text-muted">PREVISÃO ENTREGA</label>
              <input type="date" class="form-control form-control-lg delivery-date" required />
            </div>
          </div>
          <div class="text-end mt-2 delivery-remove-container"></div>
        </div>
      `;
      atualizarContadorEntregas();
      atualizarUnidades();

      if (onSavedCallback) onSavedCallback();
    });

    atualizarContadorEntregas();
    atualizarUnidades();
  }
}