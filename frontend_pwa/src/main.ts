import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

import { FormView } from './views/formView';
import { AppViews } from './views/views';
import { OfflineStore } from './services/offlineStore';
import { SyncService } from './services/syncService';
import { MinhasComprasView } from './views/minhasComprasView';

// Chave para persistência do e-mail do comprador no localStorage
const STORAGE_USER_KEY = '@adel_coco:user_email';

// Função auxiliar para criar/renderizar o ecrã de Login dinamicamente se não estiver autenticado
function renderizarLogin(): void {
  const appContainer = document.getElementById('appContainer') as HTMLElement;
  if (!appContainer) return;

  // Esconde barras de navegação globais durante o login
  const navBar = document.querySelector('.navbar, .bottom-nav') as HTMLElement;
  if (navBar) navBar.style.display = 'none';

  appContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; background-color: #8b0000; padding: 24px; color: #ffffff; text-align: center;">

      <!-- Logo da Adel Coco (utilizando a imagem local do seu projeto) -->
      <div style="margin-bottom: 24px;">
        <img src="./logo.png" alt="Adel Coco" style="width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 3px solid #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.3);" />
      </div>

      <!-- Título e Subtítulo Fiel ao Protótipo -->
      <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 8px; font-family: sans-serif;">Compras de Coco</h1>
      <p style="font-size: 16px; opacity: 0.9; margin-bottom: 32px; font-weight: 300;">Mais controle, mais resultado.</p>

      <!-- Formulário de Autenticação do Comprador -->
      <div style="width: 100%; max-width: 360px; background: rgba(255, 255, 255, 0.1); padding: 24px; border-radius: 16px; backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2);">
        <form id="login-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="text-align: left;">
            <label for="emailInput" style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; color: #f8fafc;">E-mail do Comprador</label>
            <input
              type="email"
              id="emailInput"
              placeholder="seu.nome@adelcoco.com"
              required
              style="width: 100%; padding: 14px; border-radius: 8px; border: none; font-size: 15px; box-sizing: border-box; background-color: #ffffff; color: #1e293b; outline: none;"
            />
          </div>

          <p id="error-msg" style="color: #fca5a5; font-size: 13px; margin: 0; display: none; text-align: left;"></p>

          <button
            type="submit"
            style="padding: 14px; background-color: #ffffff; color: #8b0000; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.2s ease; margin-top: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);"
          >
            Acessar Sistema
          </button>
        </form>
      </div>

    </div>
  `;

  const form = document.getElementById('login-form') as HTMLFormElement;
  const emailInput = document.getElementById('emailInput') as HTMLInputElement;
  const errorMsg = document.getElementById('error-msg') as HTMLParagraphElement;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      errorMsg.textContent = 'Por favor, insira um e-mail válido da Adel Coco.';
      errorMsg.style.display = 'block';
      return;
    }

    localStorage.setItem('@adel_coco:user_email', email);
    window.location.reload();
  });
}

// Inicializador principal após validação de login
function iniciarAplicacaoApp() {
  // Referências Globais do DOM
  const appContainer = document.getElementById('appContainer') as HTMLElement;
  const statusConexao = document.getElementById('statusConexao') as HTMLSpanElement;
  const bannerOffline = document.getElementById('bannerOffline') as HTMLDivElement;
  const textoPendentes = document.getElementById('textoPendentes') as HTMLSpanElement;
  const navButtons = document.querySelectorAll('.nav-btn');

  // Roteador de Telas
  function navegarPara(target: string): void {
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

    switch (target) {
      case 'form':
        appContainer.innerHTML = FormView.render();
        FormView.attachEvents(() => {
          atualizarBannerFila();
          if (navigator.onLine) {
            SyncService.sincronizarFila(() => atualizarBannerFila());
          }
        });
        break;

      case 'minhas-compras':
        appContainer.innerHTML = MinhasComprasView.render();
        MinhasComprasView.attachEvents();
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
  navegarPara('form');

  SyncService.inicializarOuvintes(() => {
    atualizarBannerFila();
    console.log('Fila sincronizada com o servidor GAS!');
  });
}

// --- PONTO DE ENTRADA GLOBAL ---
const usuarioLogado = localStorage.getItem(STORAGE_USER_KEY);

if (!usuarioLogado) {
  renderizarLogin();
} else {
  iniciarAplicacaoApp();
}