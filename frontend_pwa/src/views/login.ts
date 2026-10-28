export function renderLogin(onLoginSuccess: (email: string) => void) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f4f6f8; padding: 20px;">
      <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center;">
        <h2 style="margin: 0 0 8px 0; color: #1e3a8a;">Adel Coco - Compras</h2>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">Acesso Compradores de Campo</p>
        
        <form id="login-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="text-align: left;">
            <label for="email" style="font-size: 14px; color: #374151; font-weight: bold; margin-bottom: 6px; display: block;">E-mail do Comprador</label>
            <input type="email" id="email" placeholder="comprador@adelcoco.com" required style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 16px; box-sizing: border-box;" />
          </div>
          <p id="error-msg" style="color: #dc2626; font-size: 14px; margin: 0; display: none;"></p>
          <button type="submit" style="padding: 12px; background-color: #16a34a; color: #ffffff; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer;">Entrar no Sistema</button>
        </form>
      </div>
    </div>
  `;

  const form = document.querySelector<HTMLFormElement>('#login-form');
  const emailInput = document.querySelector<HTMLInputElement>('#email');
  const errorMsg = document.querySelector<HTMLParagraphElement>('#error-msg');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim().toLowerCase() || '';

    if (!email || !email.includes('@')) {
      if (errorMsg) {
        errorMsg.textContent = 'Por favor, insira um e-mail válido.';
        errorMsg.style.display = 'block';
      }
      return;
    }

    localStorage.setItem('@adel_coco:user_email', email);
    onLoginSuccess(email);
  });
}