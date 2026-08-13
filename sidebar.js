// Renderiza o Sidebar dinamicamente com base na estrutura fornecida
document.addEventListener('DOMContentLoaded', function () {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  // Identifica a página atual para aplicar a classe 'active'
  const pathAtual = window.location.pathname.split('/').pop() || 'index.html';

  // Mapeamento das opções do menu
  const menuItems = [
    { href: 'index.html', label: 'Solicitações' },
    { href: 'calcular.html', label: 'Calcular datas' },
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
    <aside class="sidebar" id="mainSidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <div class="brand-icon">
            <img src="assets/logo/logo_aceleraCS.png" alt="Logo Acelera CS" class="brand-logo">
          </div>
          <!-- Texto envolvido em uma classe para receber a cor do logo -->
          <span class="brand-text">Acelera CS</span>
          <button class="btn-toggle-sidebar" id="btnToggleSidebar" title="Fechar Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
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

  // Botão para abrir o menu (quando fechado)
  const btnOpenSidebar = document.createElement('button');
  btnOpenSidebar.className = 'btn-open-sidebar';
  btnOpenSidebar.id = 'btnOpenSidebar';
  btnOpenSidebar.title = 'Abrir Menu';
  btnOpenSidebar.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  `;
  document.body.appendChild(btnOpenSidebar);

  injetarEstilosSidebar();
  configurarToggleSidebar();
});

// Configura o toggle do sidebar
function configurarToggleSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const btnToggle = document.getElementById('btnToggleSidebar');
  const btnOpen = document.getElementById('btnOpenSidebar');
  const mainContent = document.querySelector('.main-content');

  if (!sidebar || !btnToggle || !btnOpen) return;

  // Verifica se o estado do sidebar está salvo
  const sidebarFechado = localStorage.getItem('sidebarFechado') === 'true';
  if (sidebarFechado) {
    sidebar.classList.add('sidebar-collapsed');
    if (mainContent) mainContent.classList.add('main-expanded');
    btnOpen.style.display = 'flex';
  }

  // Fechar sidebar
  btnToggle.addEventListener('click', function () {
    sidebar.classList.add('sidebar-collapsed');
    if (mainContent) mainContent.classList.add('main-expanded');
    btnOpen.style.display = 'flex';
    localStorage.setItem('sidebarFechado', 'true');
  });

  // Abrir sidebar
  btnOpen.addEventListener('click', function () {
    sidebar.classList.remove('sidebar-collapsed');
    if (mainContent) mainContent.classList.remove('main-expanded');
    btnOpen.style.display = 'none';
    localStorage.setItem('sidebarFechado', 'false');
  });
}

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
      transition: all 0.3s ease;
    }

    .sidebar-collapsed {
      transform: translateX(-250px);
      width: 0;
      padding: 0;
      overflow: hidden;
      border-right: none;
    }

    .sidebar-top {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .sidebar-brand {
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-left: 8px;
      position: relative;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .brand-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Classe adicionada para colorir o texto da marca com o tom do logo */
    .brand-text {
      color: #6226ef;
    }

    .btn-toggle-sidebar {
      background: transparent;
      border: none;
      color: #9499a6;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      margin-left: auto;
    }

    .btn-toggle-sidebar:hover {
      background: #f1f2f7;
      color: #1a1d24;
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

    /* Botão para abrir o menu */
    .btn-open-sidebar {
      position: fixed;
      top: 16px;
      left: 16px;
      width: 40px;
      height: 40px;
      background: #ffffff;
      border: 1px solid #e4e6f1;
      border-radius: 10px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 99;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;
      color: #1a1d24;
    }

    .btn-open-sidebar:hover {
      background: #f8f7ff;
      border-color: #6226ef;
      color: #6226ef;
    }

    .btn-open-sidebar svg {
      width: 20px;
      height: 20px;
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
      background: #f1f2f7;
      color: #1a1d24;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      color: #1a1d24;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .user-role {
      color: #9499a6;
      font-size: 0.75rem;
    }

    .btn-logout {
      background: transparent;
      border: none;
      color: #9499a6;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .btn-logout:hover {
      background: #fff0f0;
      color: #ea4335;
    }
  `;
  document.head.appendChild(style);
}
