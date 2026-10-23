import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { CargaPayload, TipoCoco, ModalidadeLogistica } from './types/compra';
import { OfflineStore } from './services/offlineStore';
import { SyncService } from './services/syncService';

// Referências aos Elementos da DOM
const formCompra = document.getElementById('formCompra') as HTMLFormElement;
const radioVerde = document.getElementById('tipoVerde') as HTMLInputElement;
const radioSeco = document.getElementById('tipoSeco') as HTMLInputElement;
const labelQuantidade = document.getElementById('labelQuantidade') as HTMLLabelElement;
const labelValorUnitario = document.getElementById('labelValorUnitario') as HTMLLabelElement;
const inputQuantidade = document.getElementById('quantidade') as HTMLInputElement;
const inputValorUnitario = document.getElementById('valorUnitario') as HTMLInputElement;
const displayValorTotal = document.getElementById('displayValorTotal') as HTMLSpanElement;
const statusConexao = document.getElementById('statusConexao') as HTMLSpanElement;
const bannerOffline = document.getElementById('bannerOffline') as HTMLDivElement;
const textoPendentes = document.getElementById('textoPendentes') as HTMLSpanElement;

// 1. Alternância Dinâmica das Unidades de Medida
function atualizarUnidades(): void {
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
}

radioVerde.addEventListener('change', atualizarUnidades);
radioSeco.addEventListener('change', atualizarUnidades);

// 2. Cálculo do Valor Total
function calcularValorTotal(): void {
  const qtd = parseFloat(inputQuantidade.value) || 0;
  const preco = parseFloat(inputValorUnitario.value) || 0;
  const total = qtd * preco;

  displayValorTotal.textContent = total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

inputQuantidade.addEventListener('input', calcularValorTotal);
inputValorUnitario.addEventListener('input', calcularValorTotal);

// 3. Monitoramento de Rede (Online / Offline)
function atualizarStatusRede(): void {
  const online = navigator.onLine;
  if (online) {
    statusConexao.className = 'badge bg-success';
    statusConexao.innerHTML = '<i class="bi bi-wifi me-1"></i>Online';
  } else {
    statusConexao.className = 'badge bg-danger';
    statusConexao.innerHTML = '<i class="bi bi-wifi-off me-1"></i>Offline';
  }
  atualizarBannerFila();
}

function atualizarBannerFila(): void {
  const pendentes = OfflineStore.quantidadePendente();
  if (pendentes > 0) {
    bannerOffline.classList.remove('d-none');
    textoPendentes.textContent = `${pendentes} carga(s) salva(s) no celular aguardando sincronização.`;
  } else {
    bannerOffline.classList.add('d-none');
  }
}

window.addEventListener('online', atualizarStatusRede);
window.addEventListener('offline', atualizarStatusRede);

// 4. Submissão do Formulário
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

  // Gerar Payload Fortemente Tipado
  const novaCarga: CargaPayload = {
    id_carga: `CARGA-${Date.now()}`,
    tipo_coco: tipoCoco,
    comprador: {
      email: 'comprador@adelcoco.com', // Será dinâmico após auth
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

  // Salva na fila local do dispositivo
  OfflineStore.salvarNaFila(novaCarga);
  
  alert('Carga registrada com sucesso no dispositivo!');
  formCompra.reset();
  atualizarUnidades();
  atualizarBannerFila();
});

// Inicialização da Página
atualizarUnidades();
atualizarStatusRede();

// Inicializa a escuta de reconexão e dispara a sincronização
SyncService.inicializarOuvintes(() => {
  atualizarBannerFila();
  console.log('Fila sincronizada e interface atualizada!');
});