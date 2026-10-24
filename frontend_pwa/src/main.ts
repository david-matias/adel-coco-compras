import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

import { FormView } from './views/formView';
import { AppViews } from './views/views';
import { OfflineStore } from './services/offlineStore';
import { SyncService } from './services/syncService';

// Referências Globais do DOM
const appContainer = document.getElementById('appContainer') as HTMLElement;
const statusConexao = document.getElementById('statusConexao') as HTMLSpanElement;
const bannerOffline = document.getElementById('bannerOffline') as HTMLDivElement;
const textoPendentes = document.getElementById('textoPendentes') as HTMLSpanElement;
const navButtons = document.querySelectorAll('.nav-btn');

// Roteador de Telas
function navegarPara(target: string): void {
  // Atualiza estado visual dos botões na Bottom Nav
  navButtons.forEach(btn => {
    const btnTarget = btn.getAttribute('data-target');
    if (btnTarget === target) {
      btn.classList.remove('text-muted');
      btn.classList.add('text-danger');
    } else {
      btn.classList.remove('text-danger');
      btn.classList.add('text-muted');
    }
  });

  // Renderiza a visão correspondente
  switch (target) {
    case 'form':
      appContainer.innerHTML = FormView.render();
      FormView.attachEvents(() => {
        atualizarBannerFila();
        // Dispara tentativa de sincronização se estiver online
        if (navigator.onLine) {
          SyncService.sincronizarFila(() => atualizarBannerFila());
        }
      });
      break;

    case 'minhas-compras':
      appContainer.innerHTML = AppViews.renderMinhasCompras();
      break;

    case 'projecao':
      appContainer.innerHTML = AppViews.renderProjecaoEstoque();
      break;

    case 'teto-preco':
      appContainer.innerHTML = AppViews.renderTetoPreco();
      break;

    default:
      appContainer.innerHTML = FormView.render();
      FormView.attachEvents();
      break;
  }
}

// Ouvintes de Clique na Barra Inferior
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');
    if (target) navegarPara(target);
  });
});

// Atualização de Status da Rede (Online/Offline)
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
    textoPendentes.textContent = `${pendentes} carga(s) salva(s) no aparelho aguardando conexão.`;
  } else {
    bannerOffline.classList.add('d-none');
  }
}

window.addEventListener('online', atualizarStatusRede);
window.addEventListener('offline', atualizarStatusRede);

// Inicialização da Aplicação
atualizarStatusRede();
navegarPara('form'); // Tela inicial padrão

// Inicializa ouvinte de reconexão e sincronização
SyncService.inicializarOuvintes(() => {
  atualizarBannerFila();
  console.log('Fila sincronizada com o servidor GAS!');
});