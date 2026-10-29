import { apiGet, apiPost } from '../services/api';
export class MinhasComprasView {
  static render(): string {
    return `
      <div class="container py-3 position-relative" style="max-width: 600px;">
        <!-- Cabeçalho -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="m-0 fw-bold text-danger">
            <i class="bi bi-list-check me-2"></i>Minhas Compras
          </h4>
          <button id="btnAtualizarCompras" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-clockwise"></i> Atualizar
          </button>
        </div>

        <!-- Barra de Filtros Avançados -->
        <div class="card border-0 shadow-sm p-3 mb-3 bg-light rounded-3">
          <div class="row g-2">
            <div class="col-12">
              <input type="text" id="filtroFornecedor" class="form-control form-control-sm" placeholder="🔍 Filtrar por fornecedor..." />
            </div>
            <div class="col-6">
              <select id="filtroTipoCoco" class="form-select form-select-sm">
                <option value="">Todos os Tipos</option>
                <option value="Coco Verde">Coco Verde</option>
                <option value="Coco Seco">Coco Seco</option>
              </select>
            </div>
            <div class="col-6">
              <input type="date" id="filtroData" class="form-control form-control-sm" />
            </div>
          </div>
        </div>

        <!-- Container das Listas Separadas por Tipo -->
        <div id="containerListaCompras">
          <div class="text-center py-5 text-muted bg-white rounded-3 shadow-sm p-4">
            <div class="spinner-border text-danger mb-2" role="status"></div>
            <p class="mb-0">A carregar compras...</p>
          </div>
        </div>

        <!-- Modal de Edição de Carga Pendente -->
        <div id="modalEdicao" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1050; justify-content:center; align-items:center; padding: 20px;">
          <div class="bg-white p-4 rounded-4 shadow w-100" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h5 class="fw-bold text-danger m-0"><i class="bi bi-pencil-square me-2"></i>Editar Carga Pendente</h5>
              <button type="button" id="fecharModal" class="btn-close"></button>
            </div>
            <form id="formEdicaoCarga">
              <input type="hidden" id="editIdCarga" />
              <input type="hidden" id="editTipoCoco" />
              <input type="hidden" id="editVersion" />

              <div class="mb-3">
                <label class="form-label small fw-bold text-muted">FORNECEDOR</label>
                <input type="text" id="editFornecedor" class="form-control" required />
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">PREVISÃO ENTREGA</label>
                  <input type="date" id="editPrevisao" class="form-control" required />
                </div>
                <div class="col-6">
                  <label class="form-label small fw-bold text-muted">LOGÍSTICA</label>
                  <select id="editLogistica" class="form-select" required>
                    <option value="TERCEIRO">Terceiro</option>
                    <option value="FROTA">Frota Própria</option>
                  </select>
                </div>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label id="labelEditQtd" class="form-label small fw-bold text-muted">QUANTIDADE</label>
                  <input type="number" id="editQuantidade" class="form-control" step="any" required />
                </div>
                <div class="col-6">
                  <label id="labelEditPreco" class="form-label small fw-bold text-muted">PREÇO UNITÁRIO</label>
                  <input type="number" id="editPreco" class="form-control" step="0.01" required />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-bold text-muted">OBSERVAÇÃO</label>
                <textarea id="editObservacao" class="form-control" rows="2"></textarea>
              </div>

              <button type="submit" class="btn btn-danger w-100 fw-bold py-2">
                <i class="bi bi-check-circle me-1"></i>Guardar Alterações
              </button>
            </form>
          </div>
        </div>

      </div>
    `;
  }

  static attachEvents(): void {
    const emailLogado = localStorage.getItem('@adel_coco:user_email') || '';
    const container = document.getElementById('containerListaCompras') as HTMLDivElement;
    const btnAtualizar = document.getElementById('btnAtualizarCompras');
    const filtroFornecedor = document.getElementById('filtroFornecedor') as HTMLInputElement;
    const filtroTipoCoco = document.getElementById('filtroTipoCoco') as HTMLSelectElement;
    const filtroData = document.getElementById('filtroData') as HTMLInputElement;

    const modal = document.getElementById('modalEdicao') as HTMLDivElement;
    const btnFecharModal = document.getElementById('fecharModal');
    const formEdicao = document.getElementById('formEdicaoCarga') as HTMLFormElement;

    let todasAsCompras: any[] = [];

    const normalizarData = (dataStr: string): string => {
      if (!dataStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;
      if (dataStr.includes('T')) return dataStr.split('T')[0];
      const partes = dataStr.split(/[\/\-]/);
      if (partes.length === 3) {
        if (partes[0].length === 4) return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
      return dataStr;
    };

    const renderizarTela = () => {
      const termoFornecedor = filtroFornecedor.value.toLowerCase();
      const tipoSelecionado = filtroTipoCoco.value;
      const dataSelecionada = filtroData.value;

      const filtradas = todasAsCompras.filter((c: any) => {
        const comp = c.comprador || {};
        const matchEmail = comp.email?.toLowerCase() === emailLogado.toLowerCase();
        const matchFornecedor = !termoFornecedor || comp.fornecedor?.toLowerCase().includes(termoFornecedor);
        const matchTipo = !tipoSelecionado || c.tipo_coco === tipoSelecionado;
        const dataCargaNormalizada = normalizarData(comp.previsao_entrega);
        const matchData = !dataSelecionada || dataCargaNormalizada === dataSelecionada;

        return matchEmail && matchFornecedor && matchTipo && matchData;
      });

      if (filtradas.length === 0) {
        container.innerHTML = `
          <div class="text-center py-5 text-muted bg-white rounded-3 shadow-sm p-4">
            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
            <p class="mb-1 fw-bold">Nenhuma compra encontrada com estes filtros.</p>
          </div>
        `;
        return;
      }

      const comprasVerde = filtradas.filter((c: any) => c.tipo_coco === 'Coco Verde');
      const comprasSeco = filtradas.filter((c: any) => c.tipo_coco === 'Coco Seco');

      container.innerHTML = `
        ${comprasVerde.length > 0 ? `
          <div class="mb-4">
            <h6 class="text-success fw-bold border-bottom pb-2 mb-2">
              <i class="bi bi-circle-fill me-1"></i> Coco Verde (${comprasVerde.length})
            </h6>
            <div class="d-flex flex-column gap-2">
              ${comprasVerde.map((c: any) => this.renderCardCompra(c)).join('')}
            </div>
          </div>
        ` : ''}

        ${comprasSeco.length > 0 ? `
          <div>
            <h6 class="text-warning text-dark fw-bold border-bottom pb-2 mb-2">
              <i class="bi bi-circle-fill me-1 text-warning"></i> Coco Seco (${comprasSeco.length})
            </h6>
            <div class="d-flex flex-column gap-2">
              ${comprasSeco.map((c: any) => this.renderCardCompra(c)).join('')}
            </div>
          </div>
        ` : ''}
      `;

      // Atribui os eventos aos botões de edição gerados nos cards
      document.querySelectorAll('.btn-editar-carga').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idCarga = (e.currentTarget as HTMLElement).getAttribute('data-id');
          const cargaEncontrada = todasAsCompras.find((c: any) => c.id_carga === idCarga);
          if (cargaEncontrada) {
            this.abrirModalEdicao(cargaEncontrada);
          }
        });
      });
    };

    const carregarDados = async () => {
      try {
        const resultado = await apiGet<{ status: string; compras: any[] }>({ action: 'LIST', limit: '500', include_cancelled: 'false' });

        if (resultado.status === 'success' && Array.isArray(resultado.compras)) {
          todasAsCompras = resultado.compras;
          renderizarTela();
        } else {
          container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados da planilha.</div>`;
        }
      } catch (error) {
        container.innerHTML = `
          <div class="alert alert-warning text-center">
            <i class="bi bi-wifi-off fs-3 d-block mb-1"></i>
            <span>Não foi possível carregar as compras. Verifique a conexão e a configuração da API.</span>
          </div>
        `;
      }
    };

    btnAtualizar?.addEventListener('click', carregarDados);
    filtroFornecedor?.addEventListener('input', renderizarTela);
    filtroTipoCoco?.addEventListener('change', renderizarTela);
    filtroData?.addEventListener('change', renderizarTela);

    btnFecharModal?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    formEdicao?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idCarga = (document.getElementById('editIdCarga') as HTMLInputElement).value;
      const tipoCoco = (document.getElementById('editTipoCoco') as HTMLInputElement).value;
      const fornecedor = (document.getElementById('editFornecedor') as HTMLInputElement).value;
      const previsaoEntrega = (document.getElementById('editPrevisao') as HTMLInputElement).value;
      const logistica = (document.getElementById('editLogistica') as HTMLSelectElement).value;
      const quantidade = parseFloat((document.getElementById('editQuantidade') as HTMLInputElement).value);
      const valorUnitario = parseFloat((document.getElementById('editPreco') as HTMLInputElement).value);
      const observacao = (document.getElementById('editObservacao') as HTMLTextAreaElement).value;

      // Recalcula o valor total
      const valorTotal = tipoCoco === 'Coco Verde'
        ? (quantidade * 0.4) * valorUnitario
        : quantidade * valorUnitario;

      const version = Number((document.getElementById('editVersion') as HTMLInputElement).value || 1);
      const cargaAtualizada = {
        action: 'UPDATE',
        id_carga: idCarga,
        version,
        tipo_coco: tipoCoco,
        comprador: {
          email: emailLogado,
          fornecedor,
          previsao_entrega: previsaoEntrega,
          quantidade_prevista: quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          logistica,
          observacao
        },
      };

      try {
        modal.style.display = 'none';
        container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-danger"></div><p>A atualizar carga...</p></div>`;

        await apiPost(cargaAtualizada);
        alert('Carga atualizada com confirmação do servidor.');
        await carregarDados();
      } catch (err) {
        alert('Erro ao atualizar a carga.');
        carregarDados();
      }
    });

    carregarDados();
  }

  private static abrirModalEdicao(carga: any): void {
    const modal = document.getElementById('modalEdicao') as HTMLDivElement;
    const comp = carga.comprador || {};

    (document.getElementById('editIdCarga') as HTMLInputElement).value = carga.id_carga;
    (document.getElementById('editVersion') as HTMLInputElement).value = String(carga.version || 1);
    (document.getElementById('editTipoCoco') as HTMLInputElement).value = carga.tipo_coco;
    (document.getElementById('editFornecedor') as HTMLInputElement).value = comp.fornecedor || '';
    (document.getElementById('editPrevisao') as HTMLInputElement).value = carga.comprador?.previsao_entrega ? carga.comprador.previsao_entrega.split('T')[0] : '';
    (document.getElementById('editLogistica') as HTMLSelectElement).value = comp.logistica || 'TERCEIRO';
    (document.getElementById('editQuantidade') as HTMLInputElement).value = comp.quantidade_prevista || '';
    (document.getElementById('editPreco') as HTMLInputElement).value = comp.valor_unitario || '';
    (document.getElementById('editObservacao') as HTMLTextAreaElement).value = comp.observacao || '';

    const labelQtd = document.getElementById('labelEditQtd');
    const labelPreco = document.getElementById('labelEditPreco');

    if (carga.tipo_coco === 'Coco Verde') {
      if (labelQtd) labelQtd.textContent = 'QUANTIDADE (FRUTOS)';
      if (labelPreco) labelPreco.textContent = 'PREÇO UN. (R$/LITRO)';
    } else {
      if (labelQtd) labelQtd.textContent = 'PESO (KG)';
      if (labelPreco) labelPreco.textContent = 'PREÇO UN. (R$/KG)';
    }

    modal.style.display = 'flex';
  }

  private static escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private static renderCardCompra(carga: any): string {
    const comp = carga.comprador || {};
    const fornecedorSeguro = this.escapeHtml(comp.fornecedor || 'Fornecedor');
    const idSeguro = this.escapeHtml(carga.id_carga);
    const dataEntregaSegura = this.escapeHtml(comp.previsao_entrega || 'N/D');
    const status = carga.status || 'PREVISTO';
    const isPendente = status === 'PREVISTO';

    const badgeClass = isPendente ? 'bg-warning text-dark' : 'bg-success';
    const badgeText = isPendente ? 'Pendente (Editável)' : 'Confirmada';

    const qtdFormatada = Number(comp.quantidade_prevista || 0).toLocaleString('pt-BR');
    const unidadeLabel = carga.tipo_coco === 'Coco Verde' ? 'frutos' : 'kg';
    const totalFormatado = Number(comp.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `
      <div class="card border-0 shadow-sm rounded-3 p-3 bg-white position-relative">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 class="fw-bold text-dark mb-1">
              <i class="bi bi-building me-1 text-danger"></i>${fornecedorSeguro}
            </h6>
            <small class="text-muted">Total: <strong>${totalFormatado}</strong></small>
          </div>
          <span class="badge ${badgeClass} px-2 py-1">${badgeText}</span>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small text-secondary">
          <div>
            <span class="fw-bold text-dark">${qtdFormatada} ${unidadeLabel}</span>
          </div>
          <div>
            <i class="bi bi-calendar-event me-1"></i>Entrega: <strong>${dataEntregaSegura}</strong>
          </div>
        </div>

        ${isPendente ? `
          <div class="mt-2 pt-2 text-end">
            <button class="btn btn-sm btn-outline-danger px-3 py-0 btn-editar-carga" data-id="${idSeguro}">
              <i class="bi bi-pencil-square me-1"></i>Editar
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }
}