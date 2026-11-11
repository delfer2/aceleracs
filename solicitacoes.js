let supabaseClient = null;
let todasSolicitacoes = [];
let solicitacaoAtual = null;
let usuarioLogado = '';

// ---- Estado da nova experiência ----
let visaoAtual = 'kanban';
let filaAlertas = [];
let alertaAberto = false;
let timerAlertas = null;
let ultimoDiaAlertaCancelamento = '';
let itemArrastadoId = null;

// ============================================================
// CONFIGURAÇÃO DAS ETIQUETAS / COLUNAS
// ============================================================
const STATUS_BASE = [
  {
    valor: 'Pendente',
    label: 'Aguardando retorno e-mail',
    classe: 'status-pendente',
    tom: '',
    cor: '#6b7280',
    fixo: true,
  },
  {
    valor: 'Em Andamento',
    label: 'Em Andamento',
    classe: 'status-andamento',
    tom: '',
    cor: '#059669',
    fixo: true,
  },
  {
    valor: 'Cancelamento',
    label: 'Cancelamento',
    classe: 'status-analise',
    tom: '',
    cor: '#2563eb',
    fixo: true,
    ignoraRegraRetorno: true,
  },
  {
    valor: 'Sem Retorno 1° Dia',
    label: 'Sem Retorno 1° Dia',
    classe: 'status-semretorno1',
    tom: 'semretorno1',
    cor: '#f59e0b',
    fixo: true,
  },
  {
    valor: 'Sem Retorno 2° Dia',
    label: 'Sem Retorno 2° Dia',
    classe: 'status-semretorno2',
    tom: 'semretorno2',
    cor: '#ea580c',
    fixo: true,
  },
  {
    valor: 'Atenção',
    label: 'Sem Retorno 3° Dia',
    classe: 'status-atencao',
    tom: 'atencao',
    cor: '#dc2626',
    fixo: true,
  },
  {
    valor: 'Concluída',
    label: 'Concluídas',
    classe: 'status-concluido',
    tom: '',
    cor: '#9ca3af',
    fixo: true,
    ignoraRegraRetorno: true,
  },
];

const LS_ETIQUETAS = 'acelera_cs_etiquetas_custom';
const LS_ALERTAS = 'acelera_cs_alertas_cards';
const LS_RENAMES = 'acelera_cs_etiquetas_renames';

let etiquetasCustom = [];
let renomeacoes = {};
let alertasCards = {};

function carregarEstadoLocal() {
  try {
    const ec = localStorage.getItem(LS_ETIQUETAS);
    etiquetasCustom = ec ? JSON.parse(ec) : [];
  } catch {
    etiquetasCustom = [];
  }
  try {
    const r = localStorage.getItem(LS_RENAMES);
    renomeacoes = r ? JSON.parse(r) : {};
  } catch {
    renomeacoes = {};
  }
  try {
    const a = localStorage.getItem(LS_ALERTAS);
    alertasCards = a ? JSON.parse(a) : {};
  } catch {
    alertasCards = {};
  }
}

function salvarEtiquetasCustom() {
  localStorage.setItem(LS_ETIQUETAS, JSON.stringify(etiquetasCustom));
}
function salvarRenomeacoes() {
  localStorage.setItem(LS_RENAMES, JSON.stringify(renomeacoes));
}
function salvarAlertasCards() {
  localStorage.setItem(LS_ALERTAS, JSON.stringify(alertasCards));
}

function getStatusConfigList() {
  const fixas = STATUS_BASE.map((s) => {
    const labelCustom = renomeacoes[s.valor];
    return labelCustom ? { ...s, label: labelCustom } : s;
  });
  const custom = etiquetasCustom.map((c) => ({
    valor: c.valor,
    label: c.label,
    classe: c.classe || 'status-pendente',
    tom: c.tom || '',
    cor: c.cor || '#8e94a8',
    fixo: false,
  }));
  return [...fixas, ...custom];
}

function getStatusConfig(status) {
  const list = getStatusConfigList();
  return list.find((c) => c.valor === status) || list[0];
}

function getStatusLabel(status) {
  return getStatusConfig(status).label.replace(/^Concluídas$/, 'Concluída');
}

function statusIgnoraRegraRetorno(status) {
  const cfg = getStatusConfig(status);
  if (cfg.ignoraRegraRetorno) return true;
  if (cfg.fixo) return false;
  return true;
}

function gerarValorEtiqueta(nome) {
  const base = 'custom_' + nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  let v = base;
  let i = 2;
  const existentes = new Set(getStatusConfigList().map((c) => c.valor));
  while (existentes.has(v)) {
    v = base + '_' + i;
    i++;
  }
  return v;
}

const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
const ICON_DOTS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  try {
    carregarEstadoLocal();

    if (typeof _supabase !== 'undefined') {
      supabaseClient = _supabase;
    } else if (
      typeof supabase !== 'undefined' &&
      typeof supabase.createClient === 'function'
    ) {
      const SUPABASE_URL = 'https://pgsjhesbgqcqilkxfzed.supabase.co';
      const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc2poZXNiZ3FjcWlsa3hmemVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjkwMjQsImV4cCI6MjEwMDc0NTAyNH0.YmZ41BDMU_cafyTOInh-R4aSotvXnnWXCuPqorsfxqg';
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      throw new Error('Supabase não encontrado');
    }

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    usuarioLogado =
      session.user.user_metadata?.name ||
      session.user.email?.split('@')[0] ||
      'Usuário';

    configurarEventListeners();
    gerarProtocolo();
    await carregarSolicitacoes();

    verificarTodosAlertas(true);
    iniciarAlertaPorHora();
  } catch (err) {
    console.error('Erro na inicialização:', err);
    mostrarToast('Erro ao inicializar: ' + err.message, 'error');
  }
});

// ============================================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================================
function getDataHoraBrasilia() {
  const now = new Date();
  const offsetBrasilia = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const diff = offsetBrasilia + localOffset;
  return new Date(now.getTime() + diff * 60000);
}

function configurarEventListeners() {
  document
    .getElementById('btnNovaSolicitacao')
    .addEventListener('click', () => {
      gerarProtocolo();
      abrirModalFormulario();
    });

  document
    .getElementById('solicitacaoForm')
    .addEventListener('submit', salvarSolicitacao);

  document
    .getElementById('tipoSolicitacao')
    .addEventListener('change', atualizarCampoEfetivacao);

  document
    .getElementById('filterStatus')
    .addEventListener('change', aplicarFiltros);
  document
    .getElementById('filterTipo')
    .addEventListener('change', aplicarFiltros);
  document
    .getElementById('filterSearch')
    .addEventListener('input', aplicarFiltros);
  document
    .getElementById('btnLimparFiltros')
    .addEventListener('click', limparFiltros);

  document
    .getElementById('btnGerenciarEtiquetas')
    .addEventListener('click', abrirModalEtiquetas);
}

// ============================================================
// GERAR PROTOCOLO AUTOMÁTICO
// ============================================================
function gerarProtocolo() {
  const data = getDataHoraBrasilia();
  const ano = data.getFullYear().toString().slice(-2);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const protocolo = `${ano}${mes}${dia}-${random}`;
  document.getElementById('protocolo').value = protocolo;

  const dataBrasilia = getDataHoraBrasilia();
  document.getElementById('dataPedido').value = formatarParaInput(dataBrasilia);
}

// ============================================================
// CRUD COM SUPABASE
// ============================================================
async function carregarSolicitacoes() {
  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
      .from('solicitacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    todasSolicitacoes = data || [];

    todasSolicitacoes.forEach((sol) => {
      if (!sol.andamentos) sol.andamentos = [];
    });

    classificarStatus(todasSolicitacoes);
    aplicarFiltros();
    atualizarStats(todasSolicitacoes);
    renderizarAtividadesDoDia();
  } catch (err) {
    console.error('Erro ao carregar:', err);
    mostrarToast('Erro ao carregar solicitações: ' + err.message, 'error');
  }
}

function classificarStatus(solicitacoes) {
  const agora = new Date();

  solicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;
    if (statusIgnoraRegraRetorno(sol.status)) return;

    const temAndamento = sol.andamentos && sol.andamentos.length > 0;
    const dataPedido = new Date(sol.data_pedido);
    const diffHoras = (agora - dataPedido) / (1000 * 60 * 60);

    if (!temAndamento || sol.status === 'Pendente') {
      if (diffHoras > 48) {
        sol.status = 'Atenção';
      } else if (diffHoras > 24) {
        sol.status = 'Sem Retorno 2° Dia';
      } else if (diffHoras > 12) {
        sol.status = 'Sem Retorno 1° Dia';
      }
    } else if (sol.status === 'Pendente' && temAndamento) {
      sol.status = 'Em Andamento';
    }
  });
}

async function salvarSolicitacao(e) {
  e.preventDefault();

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const id = document.getElementById('solicitacaoId').value;
    const dataBrasilia = getDataHoraBrasilia();

    const dados = {
      nome_cliente: document.getElementById('nomeCliente').value.trim(),
      documento: document.getElementById('documento').value.trim(),
      protocolo: document.getElementById('protocolo').value.trim(),
      tipo_solicitacao: document.getElementById('tipoSolicitacao').value,
      observacoes: document.getElementById('observacoes').value.trim(),
      data_pedido:
        document.getElementById('dataPedido').value ||
        formatarParaInput(dataBrasilia),
      analista: usuarioLogado,
      status: document.getElementById('statusInicial').value,
      user_id: user.id,
      andamentos: [],
    };

    if (dados.tipo_solicitacao === 'Cancelamento') {
      const dataEfetivacao = document.getElementById('dataEfetivacao').value;
      if (!dataEfetivacao) {
        mostrarToast('Informe a data de efetivação do cancelamento!', 'error');
        return;
      }
      dados.data_efetivacao = dataEfetivacao;
    }

    if (!dados.nome_cliente || !dados.protocolo || !dados.tipo_solicitacao) {
      mostrarToast('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    let result;
    if (id) {
      result = await supabaseClient
        .from('solicitacoes')
        .update(dados)
        .eq('id', id)
        .eq('user_id', user.id);
    } else {
      result = await supabaseClient.from('solicitacoes').insert([dados]);
    }

    if (result.error) throw result.error;

    mostrarToast(
      id ? 'Solicitação atualizada!' : 'Solicitação criada!',
      'success'
    );
    fecharModalFormulario();
    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao salvar:', err);
    mostrarToast('Erro ao salvar: ' + err.message, 'error');
  }
}

async function toggleConcluido(id) {
  try {
    const item = todasSolicitacoes.find((s) => s.id === id);
    if (!item) return;

    const novoStatus = item.status === 'Concluída' ? 'Pendente' : 'Concluída';
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({ status: novoStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    mostrarToast('Erro ao alterar etiqueta', 'error');
  }
}

async function excluirSolicitacao(id) {
  if (!confirm('Confirma a remoção definitiva desta solicitação?')) return;

  try {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    if (alertasCards[id]) {
      delete alertasCards[id];
      salvarAlertasCards();
    }

    mostrarToast('Solicitação excluída!', 'success');
    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    mostrarToast('Erro ao excluir solicitação', 'error');
  }
}

// ============================================================
// TROCA DE ETIQUETA
// ============================================================
async function atualizarStatus(id, novoStatus) {
  try {
    const item = todasSolicitacoes.find((s) => s.id === id);
    if (!item) return;

    if (item.status === novoStatus) {
      aplicarFiltros();
      return;
    }

    const statusAnterior = item.status;
    const andamento = {
      id: Date.now().toString(),
      titulo: 'Etiqueta alterada',
      resumo: `De "${getStatusLabel(statusAnterior)}" para "${getStatusLabel(
        novoStatus
      )}"`,
      data: getDataHoraBrasilia().toISOString(),
    };
    const andamentos = [...(item.andamentos || []), andamento];

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({ status: novoStatus, andamentos: andamentos })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await carregarSolicitacoes();

    const atualizado = todasSolicitacoes.find((s) => s.id === id);
    if (atualizado && atualizado.status !== novoStatus) {
      mostrarToast(
        `Regra automática manteve o card em "${getStatusLabel(
          atualizado.status
        )}" pelo tempo sem retorno.`,
        'info'
      );
    } else {
      mostrarToast(`Etiqueta: ${getStatusLabel(novoStatus)}`, 'success');
    }
  } catch (err) {
    console.error('Erro ao alterar etiqueta:', err);
    mostrarToast('Erro ao alterar etiqueta', 'error');
    aplicarFiltros();
  }
}

async function trocarStatusRapido(event, id) {
  event.stopPropagation();
  const novoStatus = event.target.value;

  const isModalDetalhesAberto = document
    .getElementById('modalDetalhes')
    .classList.contains('active');

  event.target.disabled = true;

  await atualizarStatus(id, novoStatus);

  if (isModalDetalhesAberto && solicitacaoAtual && solicitacaoAtual.id === id) {
    abrirModalDetalhes(id);
  }
}

// ---- Arrastar e soltar ----
function iniciarArraste(event, id) {
  itemArrastadoId = id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', id);
  event.currentTarget.classList.add('dragging');
}

function finalizarArraste(event) {
  event.currentTarget.classList.remove('dragging');
  document
    .querySelectorAll('.kanban-col.drag-over')
    .forEach((c) => c.classList.remove('drag-over'));
}

function permitirSoltar(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

function saiuDaColuna(event) {
  const col = event.currentTarget;
  if (!col.contains(event.relatedTarget)) col.classList.remove('drag-over');
}

function soltarNaColuna(event) {
  event.preventDefault();
  const col = event.currentTarget;
  col.classList.remove('drag-over');
  const id = event.dataTransfer.getData('text/plain') || itemArrastadoId;
  itemArrastadoId = null;
  if (id) atualizarStatus(id, col.dataset.status);
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function renderizarSolicitacoes(solicitacoes) {
  renderizarKanban(solicitacoes);
  renderizarLista(solicitacoes);
}

function opcoesStatus(statusAtual) {
  return getStatusConfigList()
    .map(
      (c) =>
        `<option value="${c.valor}" ${
          c.valor === statusAtual ? 'selected' : ''
        }>${c.label === 'Concluídas' ? 'Concluída' : c.label}</option>`
    )
    .join('');
}

function htmlSeletorStatus(item) {
  const cfg = getStatusConfig(item.status);
  return `<select class="status-select ${cfg.classe}" title="Alterar etiqueta"
            onclick="event.stopPropagation();"
            onchange="trocarStatusRapido(event, '${item.id}')">
            ${opcoesStatus(cfg.valor)}
          </select>`;
}

function htmlAcoes(item) {
  const isConcluido = item.status === 'Concluída';
  return `<div class="card-actions" onclick="event.stopPropagation();">
      <button class="btn-icon ${isConcluido ? 'active-check' : ''}" title="${
    isConcluido ? 'Reabrir' : 'Concluir'
  }" onclick="toggleConcluido('${item.id}')">${ICON_CHECK}</button>
      <button class="btn-icon" title="Alerta" onclick="abrirModalAlertaCard('${
        item.id
      }')">${ICON_BELL}</button>
      <button class="btn-icon" title="Editar" onclick="editarSolicitacao('${
        item.id
      }')">${ICON_EDIT}</button>
      <button class="btn-icon" title="Excluir" onclick="excluirSolicitacao('${
        item.id
      }')">${ICON_TRASH}</button>
    </div>`;
}

function cardTemAlertaHoje(id) {
  const data = alertasCards[id];
  if (!data) return false;
  return data === formatarParaInput(getDataHoraBrasilia()).slice(0, 10);
}

function renderizarKanban(solicitacoes) {
  const board = document.getElementById('kanbanBoard');
  const lista = solicitacoes || [];
  const statusList = getStatusConfigList();

  board.innerHTML = statusList
    .map((cfg) => {
      const cards = lista.filter(
        (s) => getStatusConfig(s.status).valor === cfg.valor
      );

      const menuBtn = cfg.fixo
        ? ''
        : `<button class="kanban-col-menu-btn" title="Opções"
             onclick="event.stopPropagation(); abrirMenuColuna(event, '${cfg.valor}')">
             ${ICON_DOTS}
           </button>`;

      return `
      <div class="kanban-col" data-status="${cfg.valor}"
           ondragover="permitirSoltar(event)"
           ondragleave="saiuDaColuna(event)"
           ondrop="soltarNaColuna(event)">
        <div class="kanban-col-header" style="--col-color:${cfg.cor}">
          <div class="kanban-col-title-wrap">
            <span class="kanban-col-title" title="${cfg.label}">${cfg.label}</span>
            ${menuBtn}
          </div>
          <span class="kanban-count">${cards.length}</span>
        </div>
        <div class="kanban-col-body">
          ${
            cards.length
              ? cards.map(htmlCardKanban).join('')
              : '<div class="kanban-empty">Nenhum card</div>'
          }
        </div>
      </div>`;
    })
    .join('');
}

function htmlCardKanban(item) {
  const cfg = getStatusConfig(item.status);
  const isConcluido = item.status === 'Concluída';
  const dataFormatada = item.data_pedido
    ? formatarDataHora(item.data_pedido)
    : '-';
  const temAlertaHoje = cardTemAlertaHoje(item.id);
  const dataAlerta = alertasCards[item.id];

  const badgeAlerta = temAlertaHoje
    ? `<div class="kcard-alerta-badge" title="Alerta para hoje">${ICON_BELL} HOJE</div>`
    : '';

  return `
    <div class="kcard ${cfg.tom ? 'tone-' + cfg.tom : ''} ${
    isConcluido ? 'is-completed' : ''
  } ${temAlertaHoje ? 'has-alerta-hoje' : ''}" draggable="true"
         ondragstart="iniciarArraste(event, '${item.id}')"
         ondragend="finalizarArraste(event)"
         onclick="abrirModalDetalhes('${item.id}')">
      ${badgeAlerta}
      <div class="kcard-title">${escapeHtml(item.nome_cliente)}</div>
      <div class="kcard-sub">${escapeHtml(item.tipo_solicitacao || 'Sem tipo')}</div>
      <div class="kcard-date">${dataFormatada}</div>
      ${
        dataAlerta
          ? `<div class="kcard-date" style="color:#f59e0b;font-weight:600;">Alerta: ${formatarDataISO(
              dataAlerta
            )}</div>`
          : ''
      }
      <div class="kcard-footer">
        ${htmlSeletorStatus(item)}
      </div>
    </div>`;
}

function renderizarLista(solicitacoes) {
  const tbody = document.getElementById('listaBody');

  if (!solicitacoes || solicitacoes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Nenhuma solicitação encontrada.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = solicitacoes
    .map((item) => {
      const isConcluido = item.status === 'Concluída';
      const efetivacao =
        item.tipo_solicitacao === 'Cancelamento' && item.data_efetivacao
          ? formatarDataISO(item.data_efetivacao)
          : '-';
      const temAlertaHoje = cardTemAlertaHoje(item.id);
      return `
      <tr class="${isConcluido ? 'is-completed' : ''} ${
        temAlertaHoje ? 'has-alerta-hoje' : ''
      }" onclick="abrirModalDetalhes('${item.id}')">
        <td><span class="protocolo">${escapeHtml(item.protocolo)}</span></td>
        <td>${escapeHtml(item.nome_cliente)}</td>
        <td class="cell-muted">${escapeHtml(item.tipo_solicitacao || '-')}</td>
        <td class="cell-muted">${
          item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
        }</td>
        <td class="cell-muted">${efetivacao}</td>
        <td class="cell-muted">${escapeHtml(item.analista || '-')}</td>
        <td>${htmlSeletorStatus(item)}</td>
        <td class="col-acoes">${htmlAcoes(item)}</td>
      </tr>`;
    })
    .join('');
}

function renderizarAtividadesDoDia() {
  const tbody = document.getElementById('atividadesBody');
  if (!tbody) return;
  const hoje = formatarParaInput(getDataHoraBrasilia()).slice(0, 10);
  const lista = todasSolicitacoes.filter((s) => alertasCards[s.id] === hoje);

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Nenhuma atividade para hoje.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = lista
    .map((item) => {
      return `
      <tr class="has-alerta-hoje" onclick="abrirModalDetalhes('${item.id}')">
        <td><span class="protocolo">${escapeHtml(item.protocolo)}</span></td>
        <td>${escapeHtml(item.nome_cliente)}</td>
        <td class="cell-muted">${escapeHtml(item.tipo_solicitacao || '-')}</td>
        <td class="cell-muted">${
          item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
        }</td>
        <td>${htmlSeletorStatus(item)}</td>
        <td class="cell-muted">${formatarDataISO(alertasCards[item.id])}</td>
        <td class="col-acoes">${htmlAcoes(item)}</td>
      </tr>`;
    })
    .join('');
}

function getStatusClass(status) {
  return getStatusConfig(status).classe;
}

function atualizarStats(solicitacoes) {
  const total = solicitacoes.length;
  const pendente = solicitacoes.filter((s) => s.status === 'Pendente').length;
  const andamento = solicitacoes.filter(
    (s) => s.status === 'Em Andamento'
  ).length;
  const analise = solicitacoes.filter(
    (s) => s.status === 'Cancelamento'
  ).length;
  const concluido = solicitacoes.filter((s) => s.status === 'Concluída').length;
  const semRetorno1 = solicitacoes.filter(
    (s) => s.status === 'Sem Retorno 1° Dia'
  ).length;
  const semRetorno2 = solicitacoes.filter(
    (s) => s.status === 'Sem Retorno 2° Dia'
  ).length;
  const atencao = solicitacoes.filter((s) => s.status === 'Atenção').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPendente').textContent = pendente;
  document.getElementById('statAndamento').textContent = andamento;
  document.getElementById('statAnalise').textContent = analise;
  document.getElementById('statConcluido').textContent = concluido;
  document.getElementById('statSemRetorno1').textContent = semRetorno1;
  document.getElementById('statSemRetorno2').textContent = semRetorno2;
  document.getElementById('statAtencao').textContent = atencao;
}

// ============================================================
// VISÕES (Kanban / Lista / Atividades)
// ============================================================
function trocarVisao(visao) {
  visaoAtual = visao;
  document.getElementById('mainContainer').dataset.view = visao;
  document
    .getElementById('tabKanban')
    .classList.toggle('active', visao === 'kanban');
  document
    .getElementById('tabLista')
    .classList.toggle('active', visao === 'lista');
  document
    .getElementById('tabAtividades')
    .classList.toggle('active', visao === 'atividades');
  document
    .getElementById('viewKanban')
    .classList.toggle('active', visao === 'kanban');
  document
    .getElementById('viewLista')
    .classList.toggle('active', visao === 'lista');
  document
    .getElementById('viewAtividades')
    .classList.toggle('active', visao === 'atividades');

  if (visao === 'atividades') {
    renderizarAtividadesDoDia();
  } else {
    aplicarFiltros();
  }
}

// ============================================================
// FILTROS
// ============================================================
function filtrarPorStatus(status) {
  if (visaoAtual === 'kanban') {
    if (status === 'todos') return;
    const col = document.querySelector(`.kanban-col[data-status="${status}"]`);
    if (col) {
      col.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      col.classList.add('col-pulse');
      setTimeout(() => col.classList.remove('col-pulse'), 1400);
    }
    return;
  }

  if (status === 'todos') {
    document.getElementById('filterStatus').value = '';
  } else {
    document.getElementById('filterStatus').value = status;
  }

  document.querySelectorAll('.stat-card').forEach((card) => {
    card.style.border = '1px solid #eef0f4';
    card.style.boxShadow = 'none';
  });

  if (status !== 'todos') {
    const card = document.querySelector(`.stat-card[data-status="${status}"]`);
    if (card) {
      card.style.border = '1px solid #6226ef';
      card.style.boxShadow = '0 2px 8px rgba(98, 38, 239, 0.06)';
    }
  }

  aplicarFiltros();
}

function aplicarFiltros() {
  const status =
    visaoAtual === 'lista' ? document.getElementById('filterStatus').value : '';
  const tipo = document.getElementById('filterTipo').value;
  const busca = document
    .getElementById('filterSearch')
    .value.toLowerCase()
    .trim();

  let filtrados = todasSolicitacoes;

  if (status) filtrados = filtrados.filter((s) => s.status === status);
  if (tipo) filtrados = filtrados.filter((s) => s.tipo_solicitacao === tipo);
  if (busca) {
    filtrados = filtrados.filter(
      (s) =>
        (s.nome_cliente && s.nome_cliente.toLowerCase().includes(busca)) ||
        (s.protocolo && s.protocolo.toLowerCase().includes(busca))
    );
  }

  renderizarSolicitacoes(filtrados);
}

function limparFiltros() {
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterTipo').value = '';
  document.getElementById('filterSearch').value = '';

  document.querySelectorAll('.stat-card').forEach((card) => {
    card.style.border = '1px solid #eef0f4';
    card.style.boxShadow = 'none';
  });

  aplicarFiltros();
  atualizarStats(todasSolicitacoes);
}

// ============================================================
// MODAIS
// ============================================================
function atualizarCampoEfetivacao() {
  const ehCancelamento =
    document.getElementById('tipoSolicitacao').value === 'Cancelamento';
  const grupo = document.getElementById('grupoEfetivacao');
  const campo = document.getElementById('dataEfetivacao');
  grupo.classList.toggle('visivel', ehCancelamento);
  campo.required = ehCancelamento;
  if (!ehCancelamento) campo.value = '';
}

function popularSelectStatusInicial(statusSel) {
  const sel = document.getElementById('statusInicial');
  const list = getStatusConfigList();
  sel.innerHTML = list
    .map(
      (c) =>
        `<option value="${c.valor}">${
          c.label === 'Concluídas' ? 'Concluída' : c.label
        }</option>`
    )
    .join('');
  if (statusSel) sel.value = statusSel;
}

function abrirModalFormulario(editData = null) {
  document.getElementById('solicitacaoForm').reset();
  document.getElementById('solicitacaoId').value = '';
  document.getElementById('modalFormTitle').innerText = 'Nova Solicitação';

  popularSelectStatusInicial(null);

  if (editData) {
    document.getElementById('modalFormTitle').innerText = 'Editar Solicitação';
    document.getElementById('solicitacaoId').value = editData.id;
    document.getElementById('nomeCliente').value = editData.nome_cliente || '';
    document.getElementById('documento').value = editData.documento || '';
    document.getElementById('protocolo').value = editData.protocolo || '';
    document.getElementById('tipoSolicitacao').value =
      editData.tipo_solicitacao || '';
    document.getElementById('observacoes').value = editData.observacoes || '';
    document.getElementById('dataPedido').value = editData.data_pedido || '';
    popularSelectStatusInicial(editData.status || 'Pendente');
    atualizarCampoEfetivacao();
    document.getElementById('dataEfetivacao').value = editData.data_efetivacao
      ? String(editData.data_efetivacao).slice(0, 10)
      : '';
    document.getElementById('dataPedido').readOnly = false;
  } else {
    gerarProtocolo();
    const dataBrasilia = getDataHoraBrasilia();
    document.getElementById('dataPedido').value =
      formatarParaInput(dataBrasilia);
    document.getElementById('dataPedido').readOnly = true;
    popularSelectStatusInicial('Pendente');
    atualizarCampoEfetivacao();
  }

  document.getElementById('modalForm').classList.add('active');
}

function fecharModalFormulario() {
  document.getElementById('modalForm').classList.remove('active');
}

function editarSolicitacao(id) {
  const item = todasSolicitacoes.find((s) => s.id === id);
  if (item) {
    if (document.getElementById('modalDetalhes').classList.contains('active')) {
      document.getElementById('modalDetalhes').classList.remove('active');
      document.body.style.overflow = '';
    }
    abrirModalFormulario(item);
  } else {
    mostrarToast('Solicitação não encontrada', 'error');
  }
}

function editarDoDetalhes() {
  if (solicitacaoAtual) {
    document.getElementById('modalDetalhes').classList.remove('active');
    document.body.style.overflow = '';
    abrirModalFormulario(solicitacaoAtual);
  }
}

function abrirModalDetalhes(id) {
  const item = todasSolicitacoes.find((s) => s.id === id);
  if (!item) {
    mostrarToast('Solicitação não encontrada', 'error');
    return;
  }

  solicitacaoAtual = item;

  const body = document.getElementById('detalhesBody');

  const linhaEfetivacao =
    item.tipo_solicitacao === 'Cancelamento' && item.data_efetivacao
      ? `<div class="detalhes-row"><strong>Efetivação:</strong> ${formatarDataISO(
          item.data_efetivacao
        )}</div>`
      : '';

  const dataAlerta = alertasCards[item.id];
  const linhaAlerta = `<div class="detalhes-row" style="display:flex; align-items:center;">
      <strong>Alerta:</strong>
      <span style="flex:1; margin-left:4px; ${
        dataAlerta ? 'color:#f59e0b; font-weight:600;' : 'color:#8e94a8;'
      }">${dataAlerta ? formatarDataISO(dataAlerta) : 'Nenhum'}</span>
      <button class="btn-secondary" style="padding: 4px 10px; font-size:0.72rem; height: 24px;" onclick="abrirModalAlertaCard('${
        item.id
      }')">
        ${dataAlerta ? 'Editar' : 'Definir'}
      </button>
    </div>`;

  let html = `
      <div class="detalhes-body-full">
          <div class="detalhes-coluna-esquerda">
              <div class="detalhes-info">
                  <div class="detalhes-row"><strong>Protocolo:</strong> ${escapeHtml(
                    item.protocolo
                  )}</div>
                  <div class="detalhes-row"><strong>Cliente:</strong> ${escapeHtml(
                    item.nome_cliente
                  )}</div>
                  <div class="detalhes-row"><strong>Documento:</strong> ${
                    escapeHtml(item.documento) || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Tipo:</strong> ${escapeHtml(
                    item.tipo_solicitacao
                  )}</div>
                  ${linhaEfetivacao}
                  ${linhaAlerta}
                  <div class="detalhes-row"><strong>Analista:</strong> ${
                    escapeHtml(item.analista) || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Data do Pedido:</strong> ${
                    item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
                  }</div>
                  <div class="detalhes-row" style="display: flex; align-items: center;">
                    <strong>Etiqueta:</strong>
                    <div style="flex:1; margin-left: 8px;">
                      ${htmlSeletorStatus(item)}
                    </div>
                  </div>
                  <div class="detalhes-row"><strong>Observações:</strong> ${
                    escapeHtml(item.observacoes) || 'Nenhuma'
                  }</div>
              </div>
          </div>
          <div class="detalhes-coluna-direita">
              <div class="detalhes-novo-andamento">
                  <button class="btn-andamento" onclick="abrirModalAndamento()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Registrar Atualização
                  </button>
              </div>
              <div class="detalhes-andamentos">
                  <h4>Histórico de Andamento</h4>
                  <div id="andamentosContainer">
  `;

  if (item.andamentos && item.andamentos.length > 0) {
    const sorted = [...item.andamentos].reverse();
    html += sorted
      .map(
        (a) => `
          <div class="andamento-item">
              <div class="andamento-bolinha"></div>
              <div class="andamento-conteudo">
                  <div class="andamento-header">
                      <span class="andamento-titulo">${escapeHtml(
                        a.titulo
                      )}</span>
                      <span class="andamento-data">${formatarDataHora(
                        a.data
                      )}</span>
                  </div>
                  ${
                    a.resumo
                      ? `<div class="andamento-resumo">${escapeHtml(
                          a.resumo
                        )}</div>`
                      : ''
                  }
              </div>
          </div>
      `
      )
      .join('');
  } else {
    html += `<p style="color: #8e94a8; font-size: 0.8rem;">Nenhum andamento registrado.</p>`;
  }

  html += `
                  </div>
              </div>
          </div>
      </div>
  `;

  body.innerHTML = html;
  document.getElementById(
    'detalhesTitulo'
  ).innerText = `${item.nome_cliente} - ${item.protocolo}`;
  document.getElementById('modalDetalhes').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').classList.remove('active');
  document.body.style.overflow = '';
  solicitacaoAtual = null;
}

// ============================================================
// MODAL ANDAMENTO
// ============================================================
function abrirModalAndamento() {
  document.getElementById('andamentoForm').reset();
  document.getElementById('modalAndamento').classList.add('active');
}

function fecharModalAndamento() {
  document.getElementById('modalAndamento').classList.remove('active');
}

async function salvarAndamento(e) {
  e.preventDefault();

  try {
    if (!solicitacaoAtual) return;

    const titulo = document.getElementById('andamentoTitulo').value.trim();
    const resumo = document.getElementById('andamentoResumo').value.trim();

    if (!titulo) {
      mostrarToast('Informe o título da atualização!', 'error');
      return;
    }

    const dataBrasilia = getDataHoraBrasilia();

    const andamento = {
      id: Date.now().toString(),
      titulo: titulo,
      resumo: resumo,
      data: dataBrasilia.toISOString(),
    };

    const andamentosAtuais = solicitacaoAtual.andamentos || [];
    andamentosAtuais.push(andamento);

    let novoStatus = solicitacaoAtual.status;
    if (
      novoStatus === 'Pendente' ||
      novoStatus === 'Sem Retorno 1° Dia' ||
      novoStatus === 'Sem Retorno 2° Dia' ||
      novoStatus === 'Atenção'
    ) {
      novoStatus = 'Em Andamento';
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
      .from('solicitacoes')
      .update({
        andamentos: andamentosAtuais,
        status: novoStatus,
      })
      .eq('id', solicitacaoAtual.id)
      .eq('user_id', user.id);

    if (error) throw error;

    mostrarToast('Andamento registrado com sucesso!', 'success');
    fecharModalAndamento();
    await carregarSolicitacoes();
    abrirModalDetalhes(solicitacaoAtual.id);
  } catch (err) {
    console.error('Erro ao registrar andamento:', err);
    mostrarToast('Erro ao registrar andamento: ' + err.message, 'error');
  }
}

// ============================================================
// MODAL ALERTA DO CARD
// ============================================================
function abrirModalAlertaCard(id) {
  const item = todasSolicitacoes.find((s) => s.id === id);
  if (!item) return;
  document.getElementById('alertaCardId').value = id;
  const dataAtual = alertasCards[id] || '';
  document.getElementById('alertaCardData').value = dataAtual;
  const btnRemover = document.getElementById('btnRemoverAlerta');
  btnRemover.style.display = dataAtual ? 'block' : 'none';
  document.getElementById('modalAlertaCard').classList.add('active');
}

function fecharModalAlertaCard() {
  document.getElementById('modalAlertaCard').classList.remove('active');
}

function salvarAlertaCard(e) {
  e.preventDefault();
  const id = document.getElementById('alertaCardId').value;
  const data = document.getElementById('alertaCardData').value;
  if (!id) return;
  if (!data) {
    mostrarToast('Informe a data do alerta!', 'error');
    return;
  }
  alertasCards[id] = data;
  salvarAlertasCards();
  mostrarToast('Alerta salvo!', 'success');
  fecharModalAlertaCard();
  aplicarFiltros();
  renderizarAtividadesDoDia();
  // Se o modal de detalhes estiver aberto, atualiza ele também
  if (
    solicitacaoAtual &&
    solicitacaoAtual.id === id &&
    document.getElementById('modalDetalhes').classList.contains('active')
  ) {
    abrirModalDetalhes(id);
  }
}

function removerAlertaCard() {
  const id = document.getElementById('alertaCardId').value;
  if (!id) return;
  delete alertasCards[id];
  salvarAlertasCards();
  mostrarToast('Alerta removido!', 'success');
  fecharModalAlertaCard();
  aplicarFiltros();
  renderizarAtividadesDoDia();
  if (
    solicitacaoAtual &&
    solicitacaoAtual.id === id &&
    document.getElementById('modalDetalhes').classList.contains('active')
  ) {
    abrirModalDetalhes(id);
  }
}

// ============================================================
// GERENCIAR ETIQUETAS / COLUNAS
// ============================================================
let etiquetaEditandoValor = null;

function abrirModalEtiquetas() {
  etiquetaEditandoValor = null;
  renderizarListaEtiquetas();
  document.getElementById('etiquetaFormWrap').style.display = 'none';
  document.getElementById('modalEtiquetas').classList.add('active');
}

function fecharModalEtiquetas() {
  document.getElementById('modalEtiquetas').classList.remove('active');
}

function renderizarListaEtiquetas() {
  const wrap = document.getElementById('etiquetasList');
  const list = getStatusConfigList();
  wrap.innerHTML = list
    .map((c) => {
      const tag = c.fixo ? 'Padrão' : 'Customizada';
      return `
        <div class="etiqueta-row">
          <span class="etiqueta-cor" style="background:${c.cor}"></span>
          <span class="etiqueta-nome">${escapeHtml(c.label)}</span>
          <span class="etiqueta-tag">${tag}</span>
          <button class="btn-icon" title="Renomear"
            onclick="abrirRenameEtiqueta('${c.valor}')">${ICON_EDIT}</button>
          ${
            c.fixo
              ? ''
              : `<button class="btn-icon" title="Excluir"
                   onclick="excluirEtiqueta('${c.valor}')">${ICON_TRASH}</button>`
          }
        </div>`;
    })
    .join('');
}

function abrirNovaEtiqueta() {
  etiquetaEditandoValor = null;
  document.getElementById('etiquetaNome').value = '';
  document.getElementById('etiquetaCor').value = '#6226ef';
  document.getElementById('etiquetaFormWrap').style.display = 'block';
}

function abrirRenameEtiqueta(valor) {
  const cfg = getStatusConfig(valor);
  if (!cfg) return;
  etiquetaEditandoValor = valor;
  document.getElementById('etiquetaNome').value = cfg.label;
  document.getElementById('etiquetaCor').value = cfg.cor;
  document.getElementById('etiquetaFormWrap').style.display = 'block';
}

function salvarEtiqueta() {
  const nome = document.getElementById('etiquetaNome').value.trim();
  const cor = document.getElementById('etiquetaCor').value;
  if (!nome) {
    mostrarToast('Informe o nome da etiqueta!', 'error');
    return;
  }

  if (etiquetaEditandoValor) {
    const cfg = getStatusConfig(etiquetaEditandoValor);
    if (cfg.fixo) {
      renomeacoes[cfg.valor] = nome;
      salvarRenomeacoes();
    } else {
      const idx = etiquetasCustom.findIndex(
        (c) => c.valor === etiquetaEditandoValor
      );
      if (idx >= 0) {
        etiquetasCustom[idx].label = nome;
        etiquetasCustom[idx].cor = cor;
        salvarEtiquetasCustom();
      }
    }
    mostrarToast('Etiqueta renomeada!', 'success');
  } else {
    const valor = gerarValorEtiqueta(nome);
    etiquetasCustom.push({
      valor,
      label: nome,
      cor,
      classe: 'status-pendente',
      tom: '',
    });
    salvarEtiquetasCustom();
    mostrarToast('Etiqueta criada!', 'success');
  }

  etiquetaEditandoValor = null;
  document.getElementById('etiquetaFormWrap').style.display = 'none';
  renderizarListaEtiquetas();
  recarregarSelectsEtiquetas();
  aplicarFiltros();
  renderizarKanban(todasSolicitacoes);
  atualizarStats(todasSolicitacoes);
}

function excluirEtiqueta(valor) {
  const cfg = getStatusConfig(valor);
  if (!cfg || cfg.fixo) return;

  const emUso = todasSolicitacoes.some((s) => s.status === valor);
  if (emUso) {
    if (
      !confirm(
        'Existem cards usando esta etiqueta. Eles voltarão para "Aguardando retorno e-mail". Continuar?'
      )
    )
      return;
  } else {
    if (!confirm('Excluir esta etiqueta?')) return;
  }

  etiquetasCustom = etiquetasCustom.filter((c) => c.valor !== valor);
  salvarEtiquetasCustom();

  (async () => {
    try {
      const afetados = todasSolicitacoes.filter((s) => s.status === valor);
      if (afetados.length > 0) {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        for (const s of afetados) {
          await supabaseClient
            .from('solicitacoes')
            .update({ status: 'Pendente' })
            .eq('id', s.id)
            .eq('user_id', user.id);
        }
        await carregarSolicitacoes();
      }
    } catch (err) {
      console.error('Erro ao migrar cards:', err);
    }
  })();

  mostrarToast('Etiqueta excluída!', 'success');
  renderizarListaEtiquetas();
  recarregarSelectsEtiquetas();
  aplicarFiltros();
  renderizarKanban(todasSolicitacoes);
}

function recarregarSelectsEtiquetas() {
  const sel = document.getElementById('filterStatus');
  const valorAtual = sel.value;
  const list = getStatusConfigList();
  sel.innerHTML =
    '<option value="">Todas</option>' +
    list
      .map(
        (c) =>
          `<option value="${c.valor}">${
            c.label === 'Concluídas' ? 'Concluída' : c.label
          }</option>`
      )
      .join('');
  sel.value = valorAtual;
}

function abrirMenuColuna(event, valor) {
  const cfg = getStatusConfig(valor);
  if (!cfg || cfg.fixo) return;
  const acao = prompt(
    `Coluna "${cfg.label}":\n\nDigite:\n1 - Renomear\n2 - Excluir`,
    '1'
  );
  if (acao === '1') {
    abrirModalEtiquetas();
    abrirRenameEtiqueta(valor);
  } else if (acao === '2') {
    excluirEtiqueta(valor);
  }
}

// ============================================================
// ALERTAS GERAIS
// ============================================================
function enfileirarAlerta(cfg) {
  filaAlertas.push(cfg);
  if (!alertaAberto) abrirProximoAlerta();
}

function abrirProximoAlerta() {
  const cfg = filaAlertas.shift();
  if (!cfg) {
    alertaAberto = false;
    return;
  }
  alertaAberto = true;
  document.getElementById('modalAlertTitulo').textContent = cfg.titulo;
  document.getElementById('modalAlertBody').innerHTML = cfg.html;
  document.getElementById('modalAlertContent').className =
    'modal-content modal-alert ' + (cfg.classe || '');
  document.getElementById('modalAlert').classList.add('active');
}

function fecharModalAlert() {
  document.getElementById('modalAlert').classList.remove('active');
  alertaAberto = false;
  setTimeout(abrirProximoAlerta, 250);
}

function verificarTodosAlertas(incluirCancelamento) {
  if (incluirCancelamento) {
    ultimoDiaAlertaCancelamento = formatarParaInput(
      getDataHoraBrasilia()
    ).slice(0, 10);
    verificarAlertasCancelamento();
  }
  verificarAlertas();
  verificarAlertasAguardando();
  verificarAlertasDeCardsDoDia();
}

function iniciarAlertaPorHora() {
  if (timerAlertas) return;
  timerAlertas = setInterval(async () => {
    if (alertaAberto) return;
    await carregarSolicitacoes();
    const hoje = formatarParaInput(getDataHoraBrasilia()).slice(0, 10);
    verificarTodosAlertas(hoje !== ultimoDiaAlertaCancelamento);
  }, 60 * 60 * 1000);
}

function verificarAlertas() {
  const agora = new Date();
  const semRetorno1 = [];
  const semRetorno2 = [];
  const atencao = [];

  todasSolicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;
    if (statusIgnoraRegraRetorno(sol.status)) return;

    const dataPedido = new Date(sol.data_pedido);
    const diffHoras = (agora - dataPedido) / (1000 * 60 * 60);
    const temAndamento = sol.andamentos && sol.andamentos.length > 0;

    if (
      !temAndamento ||
      sol.status === 'Pendente' ||
      sol.status === 'Sem Retorno 1° Dia' ||
      sol.status === 'Sem Retorno 2° Dia'
    ) {
      if (diffHoras > 48) {
        atencao.push(sol);
      } else if (diffHoras > 24) {
        semRetorno2.push(sol);
      } else if (diffHoras > 12) {
        semRetorno1.push(sol);
      }
    }
  });

  if (semRetorno1.length > 0 || semRetorno2.length > 0 || atencao.length > 0) {
    mostrarModalAlertas(semRetorno1, semRetorno2, atencao);
  }
}

function mostrarModalAlertas(semRetorno1, semRetorno2, atencao) {
  let html = '';

  if (semRetorno1.length > 0) {
    html += `<div class="alerta-categoria alerta-amarelo">
            <h4>Solicitações sem retorno 1° dia útil</h4>
            ${semRetorno1
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  if (semRetorno2.length > 0) {
    html += `<div class="alerta-categoria alerta-laranja">
            <h4>Solicitações sem retorno 2° dia útil</h4>
            ${semRetorno2
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  if (atencao.length > 0) {
    html += `<div class="alerta-categoria alerta-vermelho">
            <h4>Atenção! - Solicitações com atraso crítico</h4>
            ${atencao
              .map(
                (s) =>
                  `<div class="alerta-item">${escapeHtml(
                    s.protocolo
                  )} - ${escapeHtml(s.nome_cliente)}</div>`
              )
              .join('')}
        </div>`;
  }

  enfileirarAlerta({ titulo: 'Resumo do Dia', html: html, classe: '' });
}

function verificarAlertasAguardando() {
  const agora = new Date();
  const aguardando = todasSolicitacoes.filter((s) => s.status === 'Pendente');
  if (aguardando.length === 0) return;

  const html = `<div class="alerta-categoria alerta-roxo">
      <h4>${aguardando.length} solicitação(ões) aguardando retorno por e-mail</h4>
      ${aguardando
        .map((s) => {
          const horas = Math.max(
            0,
            Math.floor((agora - new Date(s.data_pedido)) / (1000 * 60 * 60))
          );
          return `<div class="alerta-item">${escapeHtml(
            s.protocolo
          )} - ${escapeHtml(s.nome_cliente)} <span style="color:#8e94a8">(${formatarTempo(
            horas
          )})</span></div>`;
        })
        .join('')}
    </div>
    <p class="relatorio-resumo">Você será avisado novamente a cada hora até a etiqueta mudar.</p>`;

  enfileirarAlerta({
    titulo: 'Aguardando retorno e-mail',
    html: html,
    classe: 'alert-aguardando',
  });
}

function verificarAlertasDeCardsDoDia() {
  const hoje = formatarParaInput(getDataHoraBrasilia()).slice(0, 10);
  const lista = todasSolicitacoes.filter((s) => alertasCards[s.id] === hoje);
  if (lista.length === 0) return;

  const html = `<div class="alerta-categoria alerta-amarelo">
      <h4>${lista.length} atividade(s) do dia</h4>
      ${lista
        .map(
          (s) =>
            `<div class="alerta-item">${escapeHtml(s.protocolo)} - ${escapeHtml(
              s.nome_cliente
            )}</div>`
        )
        .join('')}
    </div>
    <p class="relatorio-resumo">Esses cards estão em destaque e na aba "Atividades do Dia".</p>`;

  enfileirarAlerta({
    titulo: 'Atividades do Dia',
    html: html,
    classe: '',
  });
}

function verificarAlertasCancelamento() {
  const hoje = getDataHoraBrasilia();
  hoje.setHours(0, 0, 0, 0);

  const lista = [];

  todasSolicitacoes.forEach((sol) => {
    if (sol.tipo_solicitacao !== 'Cancelamento') return;
    if (!sol.data_efetivacao || sol.status === 'Concluída') return;

    const efetivacao = parseDataISO(sol.data_efetivacao);
    if (!efetivacao) return;

    if (mesmoDia(hoje, efetivacao)) {
      lista.push({ sol, efetivacao, quando: 'hoje' });
    } else if (mesmoDia(hoje, diaUtilAnterior(efetivacao))) {
      lista.push({ sol, efetivacao, quando: 'antes' });
    }
  });

  if (lista.length === 0) return;

  lista.sort(
    (a, b) => (a.quando === 'hoje' ? -1 : 1) - (b.quando === 'hoje' ? -1 : 1)
  );

  const linhas = lista
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.sol.nome_cliente)}</td>
        <td>${escapeHtml(r.sol.protocolo)}</td>
        <td>${formatarData(r.efetivacao)}</td>
        <td><span class="tag-prazo ${
          r.quando === 'hoje' ? 'tag-hoje' : 'tag-amanha'
        }">${
        r.quando === 'hoje' ? 'Efetiva hoje' : '1 dia útil antes'
      }</span></td>
      </tr>`
    )
    .join('');

  const html = `
    <p class="relatorio-resumo">${lista.length} cliente(s) com cancelamento na data de efetivação ou a 1 dia útil dela.</p>
    <table class="relatorio-table">
      <thead><tr><th>Cliente</th><th>Solicitação</th><th>Efetivação</th><th>Prazo</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>`;

  enfileirarAlerta({
    titulo: 'Cliente próximo a data de cancelamento',
    html: html,
    classe: 'alert-cancel',
  });
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function formatarDataHora(datetimeStr) {
  if (!datetimeStr) return '-';
  try {
    const date = new Date(datetimeStr);
    if (isNaN(date.getTime())) return datetimeStr;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  } catch {
    return datetimeStr;
  }
}

function formatarParaInput(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}

function parseDataISO(str) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function formatarData(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${date.getFullYear()}`;
}

function formatarDataISO(str) {
  const d = parseDataISO(str);
  return d ? formatarData(d) : '-';
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function ehDiaUtil(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

function diaUtilAnterior(date) {
  const r = new Date(date);
  do {
    r.setDate(r.getDate() - 1);
  } while (!ehDiaUtil(r));
  return r;
}

function formatarTempo(horas) {
  if (horas < 1) return 'há menos de 1h';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  const resto = horas % 24;
  return resto ? `há ${dias}d ${resto}h` : `há ${dias}d`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function mostrarToast(mensagem, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.className = 'toast show ' + tipo;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}