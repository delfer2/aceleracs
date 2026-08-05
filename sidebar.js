// Renderiza o Sidebar dinamicamente com base na estrutura fornecida
document.addEventListener('DOMContentLoaded', function () {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  // Identifica a página atual para aplicar a classe 'active'
  const pathAtual = window.location.pathname.split('/').pop() || 'index.html';

  // Mapeamento das opções do menu
  const menuItems = [
    { href: 'index.html', label: 'Calcular datas' },
    { href: 'atividades.html', label: 'Atividades' },
    { href: 'reminders.html', label: 'Lembretes' },
    { href: 'onboarding.html', label: 'Treinamentos' },
    { href: 'notes.html', label: 'Notas' },
    { href: 'cancellation.html', label: 'Cancelamentos' },
  ];

  const menuHTML = menuItems
    .map((item) => {
      const isActive = pathAtual === item.href ? 'active' : '';
      return `<a href="${item.href}" class="nav-link ${isActive}"><span></span> ${item.label}</a>`;
    })
    .join('');

  sidebarContainer.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <div class="brand-icon">🛵</div>
          Acelera CS
        </div>
        <div class="divider"></div>
        <nav class="sidebar-menu">
          ${menuHTML}
        </nav>
      </div>

      <div class="sidebar-user">
        <div class="user-details">
          <div class="avatar">CS</div>
          <div class="user-info">
            <span class="user-name">Moisés</span>
            <span class="user-role">Customer Success</span>
          </div>
        </div>
        <button type="button" class="btn-logout" id="btnLogout" title="Sair da conta" onclick="fazerLogout(event)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </aside>
  `;

  injetarEstilosSidebar();
});

// Injeta os estilos CSS do Sidebar
function injetarEstilosSidebar() {
  if (document.getElementById('sidebar-styles')) return;

  const style = document.createElement('style');
  style.id = 'sidebar-styles';
  style.textContent = `
    .sidebar {
      width: 250px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      padding: 24px 16px;
      z-index: 100;
      justify-content: space-between;
      border-right: 1px solid #e4e6f1;
    }

    .sidebar-top {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .sidebar-brand {
      color: #1a1d24;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-left: 8px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      background: #6226ef;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.1rem;
    }

    .divider {
      height: 1px;
      background: #f1f2f7;
      margin-bottom: 20px;
      width: 100%;
    }

    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-link {
      color: #9499a6;
      text-decoration: none;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nav-link:hover {
      color: #6226ef;
      background: #f8f7ff;
    }

    .nav-link.active {
      color: #6226ef;
      background: #f3f0ff;
      font-weight: 600;
      position: relative;
      border-radius: 0 12px 12px 0;
    }

    .nav-link.active::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #6226ef;
      border-radius: 0 4px 4px 0;
    }

    /* Rodapé do Perfil e Botão Sair */
    .sidebar-user {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 8px;
      border-top: 1px solid #f1f2f7;
    }

    .user-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 36px;
      height: 36px;
      background: #e2d9ff;
      color: #6226ef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1a1d24;
    }

    .user-role {
      font-size: 0.75rem;
      color: #9499a6;
    }

    .btn-logout {
      background: transparent;
      border: none;
      color: #9499a6;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background-color: #fee2e2;
      color: #ef4444;
    }
  `;
  document.head.appendChild(style);
}

// Função de encerramento da sessão com tratamento assíncrono correto
async function fazerLogout(event) {
  // Impede que a página recarregue antes da conclusão do logout
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const confirmou = confirm('Deseja realmente sair da conta?');
  if (!confirmou) return;

  try {
    // Identifica o cliente do Supabase em variações de variáveis globais
    const client =
      (typeof supabaseClient !== 'undefined' && supabaseClient) ||
      (typeof supabase !== 'undefined' && supabase) ||
      window.supabaseClient ||
      window.supabase;

    if (client && client.auth) {
      const { error } = await client.auth.signOut();
      if (error) {
        console.error('Erro ao encerrar sessão no Supabase:', error.message);
      }
    } else {
      console.warn('Cliente Supabase não encontrado no escopo global.');
    }

    // Limpa dados em cache local
    localStorage.clear();
    sessionStorage.clear();
  } catch (err) {
    console.error('Exceção durante o logout:', err);
  } finally {
    // Redireciona de forma garantida para a tela de login
    window.location.href = 'login.html';
  }
}
