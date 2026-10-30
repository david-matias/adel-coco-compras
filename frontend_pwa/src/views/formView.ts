
import type {
  CargaPayload,
  TipoCoco,
  ModalidadeLogistica,
  Fornecedor
} from '../types/compra';

import { FornecedoresService } from '../services/fornecedoresService';
import { OfflineStore } from '../services/offlineStore';
import {
  abrirWhatsAppComMensagem,
  gerarMensagemCompraWhatsApp
} from '../services/whatsapp';

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
            <label class="form-label fw-bold small text-muted">
              TIPO DE MATÉRIA-PRIMA
            </label>

            <div class="btn-group w-100 mb-3" role="group">
              <input
                type="radio"
                class="btn-check"
                name="tipo_coco"
                id="tipoVerde"
                value="Coco Verde"
                checked
              />

              <label
                class="btn btn-outline-success py-2 fw-bold"
                for="tipoVerde"
              >
                <i class="bi bi-circle-fill me-1 text-success"></i>Coco Verde
              </label>

              <input
                type="radio"
                class="btn-check"
                name="tipo_coco"
                id="tipoSeco"
                value="Coco Seco"
              />

              <label
                class="btn btn-outline-warning py-2 fw-bold"
                for="tipoSeco"
              >
                <i class="bi bi-circle-fill me-1 text-warning"></i>Coco Seco
              </label>
            </div>

            <!-- Dados do Fornecedor -->
            <div class="mb-3">
              <label
                for="fornecedor"
                class="form-label fw-bold small text-muted"
              >
                FORNECEDOR / FAZENDA
              </label>

              <div class="position-relative">
                <input
                  type="text"
                  id="fornecedor"
                  class="form-control form-control-lg"
                  placeholder="Digite o nome do fornecedor..."
                  autocomplete="off"
                  required
                  disabled
                />

                <div
                  id="listaSugestoesFornecedores"
                  class="list-group position-absolute w-100 shadow"
                  style="z-index: 1050; max-height: 240px; overflow-y: auto; display: none;"
                ></div>
              </div>

              <div id="statusFornecedores" class="form-text">
                Consultando fornecedores cadastrados...
              </div>
            </div>

            <!-- Condições comuns a todas as entregas -->
            <div class="mb-3">
              <label
                for="logistica"
                class="form-label fw-bold small text-muted"
              >
                LOGÍSTICA
              </label>

              <select
                id="logistica"
                class="form-select form-select-lg"
                required
              >
                <option value="TERCEIRO">Terceiro</option>
                <option value="FROTA">Frota Adel Coco</option>
              </select>
            </div>

            <!-- Entregas independentes -->
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-bold small text-muted mb-0">
                ENTREGAS PROGRAMADAS
              </label>

              <span class="badge bg-secondary" id="contadorEntregas">
                1 entrega
              </span>
            </div>

            <p class="small text-muted mb-2">
              Cada data e quantidade gera uma carga independente.
              Se preço ou condições mudarem, faça outro lançamento.
            </p>

            <div id="deliveryRows" class="d-flex flex-column gap-2 mb-2">
              <div class="delivery-row border rounded p-2" data-index="0">
                <div class="row g-2 align-items-end">
                  <div class="col-6">
                    <label
                      class="form-label small fw-bold text-muted labelQuantidadeEntrega"
                    >
                      QUANTIDADE (FRUTOS)
                    </label>

                    <input
                      type="number"
                      class="form-control form-control-lg delivery-quantity"
                      placeholder="Ex: 10000"
                      min="1"
                      step="any"
                      required
                    />
                  </div>

                  <div class="col-6">
                    <label class="form-label small fw-bold text-muted">
                      PREVISÃO ENTREGA
                    </label>

                    <input
                      type="date"
                      class="form-control form-control-lg delivery-date"
                      required
                    />
                  </div>
                </div>

                <div class="text-end mt-2 delivery-remove-container"></div>
              </div>
            </div>

            <button
              type="button"
              id="btnAdicionarEntrega"
              class="btn btn-outline-secondary w-100 mb-3"
            >
              <i class="bi bi-plus-circle me-1"></i>Adicionar outra entrega
            </button>

            <!-- Preço unitário comum a todas as entregas -->
            <div class="mb-3">
              <label
                id="labelValorUnitario"
                for="valorUnitario"
                class="form-label fw-bold small text-muted"
              >
                PREÇO UN. (R$/LITRO)
              </label>

              <input
                type="number"
                id="valorUnitario"
                class="form-control form-control-lg"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <!-- Conversão para Coco Verde -->
            <div
              id="painelConversaoVerde"
              class="alert alert-light border small py-2 mb-3"
            >
              <div class="d-flex justify-content-between">
                <span>Volume de Água Estimado:</span>
                <strong
                  id="displayLitrosEstimados"
                  class="text-success"
                >
                  0 Litros
                </strong>
              </div>
            </div>

            <!-- Valor Total -->
            <div class="p-3 bg-light rounded mb-3 border">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold text-muted small">
                  VALOR TOTAL A PAGAR:
                </span>

                <span
                  id="displayValorTotal"
                  class="h4 mb-0 fw-bold text-danger"
                >
                  R$ 0,00
                </span>
              </div>
            </div>

            <!-- Observações -->
            <div class="mb-3">
              <label
                for="observacao"
                class="form-label fw-bold small text-muted"
              >
                OBSERVAÇÕES (OPCIONAL)
              </label>

              <textarea
                id="observacao"
                class="form-control"
                rows="2"
                placeholder="Qualidade, padrão, rota..."
              ></textarea>
            </div>

            <!-- Botão de Ação -->
            <button
              type="submit"
              id="btnSalvar"
              class="btn btn-adel btn-lg w-100 py-3 fw-bold shadow-sm"
            >
              <i class="bi bi-check-circle-fill me-2"></i>Salvar Compra
            </button>

          </form>
        </div>
      </div>
    `;
  }

  static attachEvents(onSavedCallback?: () => void): void {
    const formCompra = document.getElementById(
      'formCompra'
    ) as HTMLFormElement;

    const radioVerde = document.getElementById(
      'tipoVerde'
    ) as HTMLInputElement;

    const radioSeco = document.getElementById(
      'tipoSeco'
    ) as HTMLInputElement;

    const labelValorUnitario = document.getElementById(
      'labelValorUnitario'
    ) as HTMLLabelElement;

    const inputValorUnitario = document.getElementById(
      'valorUnitario'
    ) as HTMLInputElement;

    const displayValorTotal = document.getElementById(
      'displayValorTotal'
    ) as HTMLSpanElement;

    const painelConversaoVerde = document.getElementById(
      'painelConversaoVerde'
    ) as HTMLDivElement;

    const displayLitrosEstimados = document.getElementById(
      'displayLitrosEstimados'
    ) as HTMLElement;

    const deliveryRows = document.getElementById(
      'deliveryRows'
    ) as HTMLDivElement;

    const contadorEntregas = document.getElementById(
      'contadorEntregas'
    ) as HTMLSpanElement;

    const btnAdicionarEntrega = document.getElementById(
      'btnAdicionarEntrega'
    ) as HTMLButtonElement;

    const inputFornecedor = document.getElementById(
      'fornecedor'
    ) as HTMLInputElement;

    const listaSugestoes = document.getElementById(
      'listaSugestoesFornecedores'
    ) as HTMLDivElement;

    const statusFornecedores = document.getElementById(
      'statusFornecedores'
    ) as HTMLDivElement;

    if (!formCompra || !deliveryRows) return;

    let fornecedoresDisponiveis: Fornecedor[] = [];

    let fornecedorSelecionado: Fornecedor | null = null;

    // Normaliza texto para pesquisar sem diferenciar
    // acentos, maiúsculas ou minúsculas.
    const normalizarTexto = (texto: string): string => {
      return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    };

    // Retorna fornecedores ativos que atendem ao tipo de coco.
    const obterFornecedoresPorTipo = (
      tipo: TipoCoco
    ): Fornecedor[] => {
      return FornecedoresService.filtrarPorTipo(
        fornecedoresDisponiveis,
        tipo
      );
    };

    // Esconde e limpa as sugestões.
    const esconderSugestoes = (): void => {
      listaSugestoes.innerHTML = '';
      listaSugestoes.style.display = 'none';
    };

    // Pesquisa fornecedores pelo nome.
    const pesquisarFornecedores = (): void => {
      // Qualquer alteração no texto invalida a seleção anterior.
      fornecedorSelecionado = null;

      const termo = normalizarTexto(inputFornecedor.value);

      if (!termo) {
        esconderSugestoes();
        return;
      }

      const tipoCoco: TipoCoco = radioVerde.checked
        ? 'Coco Verde'
        : 'Coco Seco';

      const encontrados = obterFornecedoresPorTipo(tipoCoco)
        .filter(fornecedor =>
          normalizarTexto(fornecedor.nome).includes(termo)
        );

      listaSugestoes.innerHTML = '';

      if (encontrados.length === 0) {
        const mensagem = document.createElement('div');

        mensagem.className = 'list-group-item text-muted small';
        mensagem.textContent = 'Nenhum fornecedor encontrado.';

        listaSugestoes.appendChild(mensagem);
        listaSugestoes.style.display = 'block';

        return;
      }

      encontrados.forEach(fornecedor => {
        const botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'list-group-item list-group-item-action';

        botao.textContent = fornecedor.nome;

        botao.addEventListener('click', () => {
          fornecedorSelecionado = fornecedor;

          inputFornecedor.value = fornecedor.nome;

          esconderSugestoes();
        });

        listaSugestoes.appendChild(botao);
      });

      listaSugestoes.style.display = 'block';
    };

    // Atualiza o campo quando o tipo de coco muda.
    const atualizarListaFornecedores = (tipo: TipoCoco): void => {
      fornecedorSelecionado = null;

      inputFornecedor.value = '';

      esconderSugestoes();

      const filtrados = obterFornecedoresPorTipo(tipo);

      inputFornecedor.disabled = filtrados.length === 0;

      if (filtrados.length === 0) {
        inputFornecedor.placeholder =
          'Nenhum fornecedor disponível para este tipo';

        statusFornecedores.textContent =
          'Não há fornecedores ativos cadastrados para este tipo de coco.';
      } else {
        inputFornecedor.placeholder =
          'Digite o nome do fornecedor...';
      }
    };

    // Carrega fornecedores do servidor ou utiliza o cache local.
    const carregarFornecedores = async (): Promise<void> => {
      statusFornecedores.textContent =
        'Consultando fornecedores...';

      inputFornecedor.disabled = true;

      try {
        const resultado = await FornecedoresService.carregar();

        fornecedoresDisponiveis = resultado.fornecedores;

        const tipoCoco: TipoCoco = radioVerde.checked
          ? 'Coco Verde'
          : 'Coco Seco';

        atualizarListaFornecedores(tipoCoco);

        if (resultado.origem === 'online') {
          statusFornecedores.textContent =
            'Lista de fornecedores atualizada com o servidor.';
        } else if (resultado.origem === 'cache') {
          const data = resultado.atualizado_em
            ? new Date(resultado.atualizado_em)
            : null;

          statusFornecedores.textContent = data
            ? `Usando lista salva em ${data.toLocaleString('pt-BR')}. Pode estar desatualizada.`
            : 'Usando lista salva neste aparelho. Pode estar desatualizada.';
        } else {
          statusFornecedores.textContent =
            'Não foi possível carregar fornecedores. Verifique sua conexão.';
        }

        // Se não houver fornecedores para o tipo atual,
        // mantém a mensagem específica.
        if (
          obterFornecedoresPorTipo(tipoCoco).length === 0
        ) {
          inputFornecedor.disabled = true;

          statusFornecedores.textContent =
            'Não há fornecedores ativos cadastrados para este tipo de coco.';
        }
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);

        fornecedoresDisponiveis = [];

        inputFornecedor.disabled = true;

        statusFornecedores.textContent =
          'Erro ao consultar fornecedores. Verifique sua conexão.';
      }
    };

    // Atualiza o contador e os botões de remoção das entregas.
    const atualizarContadorEntregas = (): void => {
      const total = deliveryRows.querySelectorAll('.delivery-row').length;

      contadorEntregas.textContent =
        total === 1 ? '1 entrega' : `${total} entregas`;

      deliveryRows.querySelectorAll('.delivery-row').forEach(row => {
        const container = row.querySelector(
          '.delivery-remove-container'
        ) as HTMLDivElement;

        container.innerHTML = total > 1
          ? `<button
                type="button"
                class="btn btn-sm btn-outline-danger btn-remover-entrega"
             >
                <i class="bi bi-trash me-1"></i>Remover entrega
             </button>`
          : '';
      });
    };

    // Calcula os totais de todas as entregas.
    const calcularTotais = (): void => {
      const quantities = Array.from(
        deliveryRows.querySelectorAll<HTMLInputElement>(
          '.delivery-quantity'
        )
      );

      const totalQuantidade = quantities.reduce(
        (sum, input) => sum + (Number(input.value) || 0),
        0
      );

      const precoUn = Number(inputValorUnitario.value) || 0;

      const litrosEstimados = radioVerde.checked
        ? totalQuantidade * LITROS_POR_FRUTO_VERDE
        : 0;

      const valorTotal = radioVerde.checked
        ? litrosEstimados * precoUn
        : totalQuantidade * precoUn;

      displayLitrosEstimados.textContent =
        `${litrosEstimados.toLocaleString('pt-BR', {
          maximumFractionDigits: 1
        })} Litros`;

      displayValorTotal.textContent = valorTotal.toLocaleString(
        'pt-BR',
        {
          style: 'currency',
          currency: 'BRL'
        }
      );
    };

    // Atualiza unidades, rótulos e conversão conforme o tipo de coco.
    const atualizarUnidades = (): void => {
      const verde = radioVerde.checked;

      labelValorUnitario.textContent = verde
        ? 'PREÇO UN. (R$/LITRO)'
        : 'PREÇO UN. (R$/KG)';

      painelConversaoVerde.classList.toggle('d-none', !verde);

      deliveryRows
        .querySelectorAll<HTMLInputElement>('.delivery-quantity')
        .forEach(input => {
          input.placeholder = verde
            ? 'Ex: 10000'
            : 'Ex: 15000';

          const label = input.closest('.delivery-row')?.querySelector(
            '.labelQuantidadeEntrega'
          );

          if (label) {
            label.textContent = verde
              ? 'QUANTIDADE (FRUTOS)'
              : 'PESO PREVISTO (KG)';
          }
        });

      calcularTotais();
    };

    // Adiciona uma nova entrega independente.
    const adicionarLinhaEntrega = (): void => {
      const row = document.createElement('div');

      row.className = 'delivery-row border rounded p-2';

      row.innerHTML = `
        <div class="row g-2 align-items-end">
          <div class="col-6">
            <label class="form-label small fw-bold text-muted labelQuantidadeEntrega">
              QUANTIDADE (FRUTOS)
            </label>

            <input
              type="number"
              class="form-control form-control-lg delivery-quantity"
              placeholder="Ex: 10000"
              min="1"
              step="any"
              required
            />
          </div>

          <div class="col-6">
            <label class="form-label small fw-bold text-muted">
              PREVISÃO ENTREGA
            </label>

            <input
              type="date"
              class="form-control form-control-lg delivery-date"
              required
            />
          </div>
        </div>

        <div class="text-end mt-2 delivery-remove-container"></div>
      `;

      deliveryRows.appendChild(row);

      atualizarContadorEntregas();
      atualizarUnidades();
    };

    // Eventos de pesquisa do fornecedor.
    inputFornecedor.addEventListener(
      'input',
      pesquisarFornecedores
    );

    inputFornecedor.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        esconderSugestoes();
      }
    });

    // Fecha as sugestões ao clicar fora do campo.
    document.addEventListener('click', event => {
      const target = event.target as Node;

      if (
        !inputFornecedor.contains(target) &&
        !listaSugestoes.contains(target)
      ) {
        esconderSugestoes();
      }
    });

    // Eventos de alteração do tipo de matéria-prima.
    radioVerde.addEventListener('change', () => {
      atualizarUnidades();
      atualizarListaFornecedores('Coco Verde');
    });

    radioSeco.addEventListener('change', () => {
      atualizarUnidades();
      atualizarListaFornecedores('Coco Seco');
    });

    // Eventos de cálculo.
    inputValorUnitario.addEventListener('input', calcularTotais);

    deliveryRows.addEventListener('input', calcularTotais);

    deliveryRows.addEventListener('change', calcularTotais);

    // Remoção de entregas.
    deliveryRows.addEventListener('click', event => {
      const target = event.target as HTMLElement;

      const button = target.closest<HTMLButtonElement>(
        '.btn-remover-entrega'
      );

      if (!button) return;

      button.closest('.delivery-row')?.remove();

      atualizarContadorEntregas();
      calcularTotais();
    });

    // Adição de entregas.
    btnAdicionarEntrega.addEventListener(
      'click',
      adicionarLinhaEntrega
    );

    // Envio do formulário.
    formCompra.addEventListener('submit', (e: Event) => {
      e.preventDefault();

      if (!formCompra.reportValidity()) return;

      const tipoCoco: TipoCoco = radioVerde.checked
        ? 'Coco Verde'
        : 'Coco Seco';

      // Exige seleção real, não apenas texto digitado.
      const codigoFornecedor =
        fornecedorSelecionado?.codigo.trim() || '';

      const nomeFornecedor =
        fornecedorSelecionado?.nome.trim() || '';

      if (!codigoFornecedor || !nomeFornecedor) {
        alert(
          'Pesquise e selecione um fornecedor cadastrado.'
        );

        inputFornecedor.focus();

        return;
      }

      // Confere se o fornecedor continua válido para o tipo escolhido.
      const fornecedorValido = obterFornecedoresPorTipo(
        tipoCoco
      ).some(fornecedor =>
        fornecedor.codigo === codigoFornecedor
      );

      if (!fornecedorValido) {
        fornecedorSelecionado = null;

        inputFornecedor.value = '';

        alert(
          'O fornecedor selecionado não está disponível para este tipo de coco. Selecione novamente.'
        );

        inputFornecedor.focus();

        return;
      }

      const logistica = (
        document.getElementById('logistica') as HTMLSelectElement
      ).value as ModalidadeLogistica;

      const valorUnitario = parseFloat(inputValorUnitario.value);

      const observacao = (
        document.getElementById('observacao') as HTMLTextAreaElement
      ).value;

      const emailComprador = (
        localStorage.getItem('@adel_coco:user_email') || ''
      ).trim().toLowerCase();

      if (!emailComprador) {
        alert(
          'Sua sessão não tem um e-mail informado. Entre novamente antes de cadastrar.'
        );

        return;
      }

      const linhas = Array.from(
        deliveryRows.querySelectorAll<HTMLDivElement>(
          '.delivery-row'
        )
      );

      const entregas = linhas.map(row => ({
        quantidade: Number(
          (
            row.querySelector(
              '.delivery-quantity'
            ) as HTMLInputElement
          ).value
        ),

        previsaoEntrega: (
          row.querySelector(
            '.delivery-date'
          ) as HTMLInputElement
        ).value
      }));

      if (
        entregas.length === 0 ||
        entregas.some(item =>
          !item.previsaoEntrega ||
          !Number.isFinite(item.quantidade) ||
          item.quantidade <= 0
        )
      ) {
        alert(
          'Informe uma data e uma quantidade válida para cada entrega.'
        );

        return;
      }

      if (
        !Number.isFinite(valorUnitario) ||
        valorUnitario <= 0
      ) {
        alert('Informe um preço unitário válido.');
        inputValorUnitario.focus();
        return;
      }

      // Cada entrega gera uma carga independente,
      // mantendo fornecedor e condições comerciais.
      const cargas: CargaPayload[] = entregas.map(entrega => {
        const valorTotal = radioVerde.checked
          ? (
              entrega.quantidade * LITROS_POR_FRUTO_VERDE
            ) * valorUnitario
          : entrega.quantidade * valorUnitario;

        return {
          id_carga: `CARGA-${crypto.randomUUID().toUpperCase()}`,

          tipo_coco: tipoCoco,

          comprador: {
            email: emailComprador,
            codigo_fornecedor: codigoFornecedor,
            fornecedor: nomeFornecedor,
            previsao_entrega: entrega.previsaoEntrega,
            quantidade_prevista: entrega.quantidade,
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
      });

      // Mantém o comportamento atual de armazenamento offline.
      cargas.forEach(carga =>
        OfflineStore.salvarNaFila(carga)
      );

      const mensagemWhatsApp = cargas
        .map(gerarMensagemCompraWhatsApp)
        .join('\n\n--------------------\n\n');

      document
        .getElementById('painelWhatsAppCompartilhamento')
        ?.remove();

      const painelWhatsApp = document.createElement('div');

      painelWhatsApp.id = 'painelWhatsAppCompartilhamento';

      painelWhatsApp.className =
        'alert alert-success mt-3 mb-0';

      painelWhatsApp.innerHTML = `
        <div class="fw-bold mb-1">
          <i class="bi bi-check-circle-fill me-1"></i>
          ${cargas.length} carga(s) salva(s) neste aparelho
        </div>

        <p class="small mb-2">
          Cada entrega foi registrada como uma carga independente.
          Prepare a mensagem e escolha o grupo no WhatsApp;
          o envio só acontece quando você confirmar no aplicativo.
        </p>

        <button
          type="button"
          id="btnCompartilharWhatsApp"
          class="btn btn-success w-100"
        >
          <i class="bi bi-whatsapp me-2"></i>
          Preparar mensagem no WhatsApp
        </button>
      `;

      formCompra.insertAdjacentElement(
        'afterend',
        painelWhatsApp
      );

      document
        .getElementById('btnCompartilharWhatsApp')
        ?.addEventListener('click', () => {
          abrirWhatsAppComMensagem(mensagemWhatsApp);
        });

      // Limpa o formulário e restaura a configuração inicial.
      formCompra.reset();

      fornecedorSelecionado = null;

      inputFornecedor.value = '';

      esconderSugestoes();

      deliveryRows.innerHTML = `
        <div class="delivery-row border rounded p-2" data-index="0">
          <div class="row g-2 align-items-end">
            <div class="col-6">
              <label class="form-label small fw-bold text-muted labelQuantidadeEntrega">
                QUANTIDADE (FRUTOS)
              </label>

              <input
                type="number"
                class="form-control form-control-lg delivery-quantity"
                placeholder="Ex: 10000"
                min="1"
                step="any"
                required
              />
            </div>

            <div class="col-6">
              <label class="form-label small fw-bold text-muted">
                PREVISÃO ENTREGA
              </label>

              <input
                type="date"
                class="form-control form-control-lg delivery-date"
                required
              />
            </div>
          </div>

          <div class="text-end mt-2 delivery-remove-container"></div>
        </div>
      `;

      atualizarContadorEntregas();
      atualizarUnidades();

      // O reset retorna para Coco Verde.
      atualizarListaFornecedores('Coco Verde');

      if (onSavedCallback) {
        onSavedCallback();
      }
    });

    // Estado inicial.
    atualizarContadorEntregas();
    atualizarUnidades();

    // Busca a lista de fornecedores ao abrir o formulário.
    void carregarFornecedores();
  }
}
