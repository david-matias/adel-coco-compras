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
                  <option value="FROTA">Frota Adel Coco</option>
                </select>
              </div>
            </div>

            <!-- Quantidade (Frutos/KG) e Preço Unitário -->
            <div class="row g-2 mb-2">
              <div class="col-6">
                <label id="labelQuantidade" for="quantidade" class="form-label fw-bold small text-muted">QUANTIDADE (FRUTOS)</label>
                <input type="number" id="quantidade" class="form-control form-control-lg" placeholder="Ex: 10000" min="1" step="any" required />
              </div>
              <div class="col-6">
                <label id="labelValorUnitario" for="valorUnitario" class="form-label fw-bold small text-muted">PREÇO UN. (R$/LITRO)</label>
                <input type="number" id="valorUnitario" class="form-control form-control-lg" placeholder="0.00" min="0.01" step="0.01" required />
              </div>
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
    const labelQuantidade = document.getElementById('labelQuantidade') as HTMLLabelElement;
    const labelValorUnitario = document.getElementById('labelValorUnitario') as HTMLLabelElement;
    const inputQuantidade = document.getElementById('quantidade') as HTMLInputElement;
    const inputValorUnitario = document.getElementById('valorUnitario') as HTMLInputElement;
    const displayValorTotal = document.getElementById('displayValorTotal') as HTMLSpanElement;
    const painelConversaoVerde = document.getElementById('painelConversaoVerde') as HTMLDivElement;
    const displayLitrosEstimados = document.getElementById('displayLitrosEstimados') as HTMLElement;

    if (!formCompra) return;

    const atualizarUnidades = () => {
      if (radioVerde.checked) {
        labelQuantidade.textContent = 'QUANTIDADE (FRUTOS)';
        labelValorUnitario.textContent = 'PREÇO UN. (R$/LITRO)';
        inputQuantidade.placeholder = 'Ex: 10000';
        painelConversaoVerde.classList.remove('d-none');
      } else {
        labelQuantidade.textContent = 'PESO PREVISTO (KG)';
        labelValorUnitario.textContent = 'PREÇO UN. (R$/KG)';
        inputQuantidade.placeholder = 'Ex: 15000';
        painelConversaoVerde.classList.add('d-none');
      }
      calcularTotais();
    };

    const calcularTotais = () => {
      const qtd = parseFloat(inputQuantidade.value) || 0;
      const precoUn = parseFloat(inputValorUnitario.value) || 0;
      let valorTotal = 0;

      if (radioVerde.checked) {
        // Coco Verde: Frutos * 0.4L = Litros de água, pagos pelo R$/Litro
        const litrosEstimados = qtd * LITROS_POR_FRUTO_VERDE;
        displayLitrosEstimados.textContent = `${litrosEstimados.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Litros`;
        valorTotal = litrosEstimados * precoUn;
      } else {
        // Coco Seco: KG * R$/KG
        valorTotal = qtd * precoUn;
      }

      displayValorTotal.textContent = valorTotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    radioVerde.addEventListener('change', atualizarUnidades);
    radioSeco.addEventListener('change', atualizarUnidades);
    inputQuantidade.addEventListener('input', calcularTotais);
    inputValorUnitario.addEventListener('input', calcularTotais);

    formCompra.addEventListener('submit', (e: Event) => {
      e.preventDefault();

      const tipoCoco: TipoCoco = radioVerde.checked ? 'Coco Verde' : 'Coco Seco';
      const fornecedor = (document.getElementById('fornecedor') as HTMLInputElement).value;
      const previsaoEntrega = (document.getElementById('previsaoEntrega') as HTMLInputElement).value;
      const logistica = (document.getElementById('logistica') as HTMLSelectElement).value as ModalidadeLogistica;
      const quantidade = parseFloat(inputQuantidade.value);
      const valorUnitario = parseFloat(inputValorUnitario.value);

      // Cálculo final do total baseado na regra de negócio correta
      const valorTotal = radioVerde.checked
        ? (quantidade * LITROS_POR_FRUTO_VERDE) * valorUnitario
        : quantidade * valorUnitario;

      const observacao = (document.getElementById('observacao') as HTMLTextAreaElement).value;

      const emailComprador = (localStorage.getItem('@adel_coco:user_email') || '').trim().toLowerCase();
      if (!emailComprador) {
        alert('Sua sessão não tem um e-mail informado. Entre novamente antes de cadastrar.');
        return;
      }

      const novaCarga: CargaPayload = {
        id_carga: `CARGA-${crypto.randomUUID().toUpperCase()}`,
        tipo_coco: tipoCoco,
        comprador: {
          email: emailComprador,
          fornecedor,
          previsao_entrega: previsaoEntrega,
          quantidade_prevista: quantidade, // Frutos para verde, KG para seco
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

      // A carga continua salva mesmo se o WhatsApp não abrir ou o usuário não enviar.
      const mensagemWhatsApp = gerarMensagemCompraWhatsApp(novaCarga);
      document.getElementById('painelWhatsAppCompartilhamento')?.remove();
      const painelWhatsApp = document.createElement('div');
      painelWhatsApp.id = 'painelWhatsAppCompartilhamento';
      painelWhatsApp.className = 'alert alert-success mt-3 mb-0';
      painelWhatsApp.innerHTML = `
        <div class="fw-bold mb-1"><i class="bi bi-check-circle-fill me-1"></i>Compra salva neste aparelho</div>
        <p class="small mb-2">Prepare a mensagem e escolha o grupo no WhatsApp. O envio só acontece quando você confirmar no aplicativo.</p>
        <button type="button" id="btnCompartilharWhatsApp" class="btn btn-success w-100">
          <i class="bi bi-whatsapp me-2"></i>Preparar mensagem no WhatsApp
        </button>
      `;
      formCompra.insertAdjacentElement('afterend', painelWhatsApp);
      document.getElementById('btnCompartilharWhatsApp')?.addEventListener('click', () => {
        abrirWhatsAppComMensagem(mensagemWhatsApp);
      });

      formCompra.reset();
      atualizarUnidades();

      if (onSavedCallback) {
        onSavedCallback();
      }
    });

    atualizarUnidades();
  }
}