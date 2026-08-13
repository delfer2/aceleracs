let supabaseClient = null;
let todasSolicitacoes = [];
let solicitacaoAtual = null;
let usuarioLogado = '';

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
  try {
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

    // Verifica alertas imediatamente após carregar
    verificarAlertas();
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
  // Ajusta para UTC-3 (Brasília)
  const offsetBrasilia = -3 * 60; // -3 horas em minutos
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

  document.getElementById('btnFabNova').addEventListener('click', () => {
    gerarProtocolo();
    abrirModalFormulario();
  });

  document
    .getElementById('solicitacaoForm')
    .addEventListener('submit', salvarSolicitacao);

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

  // Preenche a data com horário de Brasília
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
      if (!sol.andamentos) {
        sol.andamentos = [];
      }
    });

    classificarStatus(todasSolicitacoes);
    renderizarSolicitacoes(todasSolicitacoes);
    atualizarStats(todasSolicitacoes);
  } catch (err) {
    console.error('Erro ao carregar:', err);
    mostrarToast('Erro ao carregar solicitações: ' + err.message, 'error');
  }
}

function classificarStatus(solicitacoes) {
  const agora = new Date();

  solicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;

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

async function registrarAndamento(e) {
  e.preventDefault();

  try {
    if (!solicitacaoAtual) return;

    const titulo = document.getElementById('andamentoTitulo').value.trim();
    const resumo = document.getElementById('andamentoResumo').value.trim();

    if (!titulo) {
      mostrarToast('Informe o título da atualização!', 'error');
      return;
    }

    const now = new Date();
    const offsetBrasilia = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const diff = offsetBrasilia + localOffset;
    const dataBrasilia = new Date(now.getTime() + diff * 60000);

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
    document.getElementById('andamentoForm').reset();
    await carregarSolicitacoes();
    abrirModalDetalhes(solicitacaoAtual.id);
  } catch (err) {
    console.error('Erro ao registrar andamento:', err);
    mostrarToast('Erro ao registrar andamento: ' + err.message, 'error');
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
    mostrarToast('Erro ao alterar status', 'error');
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

    mostrarToast('Solicitação excluída!', 'success');
    await carregarSolicitacoes();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    mostrarToast('Erro ao excluir solicitação', 'error');
  }
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function renderizarSolicitacoes(solicitacoes) {
  const container = document.getElementById('solicitacoesContainer');

  if (!solicitacoes || solicitacoes.length === 0) {
    container.innerHTML = `<div class="empty-state">Nenhuma solicitação encontrada.</div>`;
    return;
  }

  container.innerHTML = solicitacoes
    .map((item) => {
      const dataFormatada = item.data_pedido
        ? formatarDataHora(item.data_pedido)
        : '-';
      const statusClass = getStatusClass(item.status);
      const isConcluido = item.status === 'Concluída';
      const statusLabel = item.status || 'Pendente';

      const primeiroAndamento =
        item.andamentos && item.andamentos.length > 0
          ? item.andamentos[item.andamentos.length - 1].titulo
          : null;

      return `
            <div class="solicitacao-card ${
              isConcluido ? 'is-completed' : ''
            }" onclick="abrirModalDetalhes('${item.id}')">
                <div class="card-header">
                    <span class="protocolo">${escapeHtml(item.protocolo)}</span>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="card-title">${escapeHtml(item.nome_cliente)}</div>
                <div class="card-subtitle">${escapeHtml(
                  item.tipo_solicitacao || 'Sem tipo'
                )}</div>
                <div class="card-details">
                    <span><strong>Data:</strong> ${dataFormatada}</span>
                    ${
                      primeiroAndamento
                        ? `<span><strong>Última:</strong> ${escapeHtml(
                            primeiroAndamento
                          )}</span>`
                        : ''
                    }
                </div>
                <div class="card-footer">
                    <div class="badge-container">
                        <span class="badge badge-date">${dataFormatada}</span>
                        ${
                          item.andamentos && item.andamentos.length > 0
                            ? `<span class="badge badge-andamento">${item.andamentos.length} atualizações</span>`
                            : ''
                        }
                    </div>
                    <div class="card-actions" onclick="event.stopPropagation();">
                        <button class="btn-icon ${
                          isConcluido ? 'active-check' : ''
                        }" title="${
        isConcluido ? 'Reabrir' : 'Concluir'
      }" onclick="toggleConcluido('${item.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        <button class="btn-icon" title="Editar" onclick="editarSolicitacao('${
                          item.id
                        }')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon" title="Excluir" onclick="excluirSolicitacao('${
                          item.id
                        }')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');
}

function getStatusClass(status) {
  const map = {
    Pendente: 'status-pendente',
    'Análise Interna': 'status-analise',
    'Em Andamento': 'status-andamento',
    Concluída: 'status-concluido',
    'Sem Retorno 1° Dia': 'status-semretorno1',
    'Sem Retorno 2° Dia': 'status-semretorno2',
    Atenção: 'status-atencao',
  };
  return map[status] || 'status-pendente';
}

function atualizarStats(solicitacoes) {
  const total = solicitacoes.length;
  const pendente = solicitacoes.filter((s) => s.status === 'Pendente').length;
  const andamento = solicitacoes.filter(
    (s) => s.status === 'Em Andamento'
  ).length;
  const analise = solicitacoes.filter(
    (s) => s.status === 'Análise Interna'
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
// FILTROS
// ============================================================
function filtrarPorStatus(status) {
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
  const status = document.getElementById('filterStatus').value;
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

  renderizarSolicitacoes(todasSolicitacoes);
  atualizarStats(todasSolicitacoes);
}

// ============================================================
// MODAIS
// ============================================================
function abrirModalFormulario(editData = null) {
  document.getElementById('solicitacaoForm').reset();
  document.getElementById('solicitacaoId').value = '';
  document.getElementById('modalFormTitle').innerText = 'Nova Solicitação';

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
    document.getElementById('statusInicial').value =
      editData.status || 'Pendente';
  } else {
    gerarProtocolo();
    const dataBrasilia = getDataHoraBrasilia();
    document.getElementById('dataPedido').value =
      formatarParaInput(dataBrasilia);
    document.getElementById('statusInicial').value = 'Pendente';
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

  let html = `
      <div class="detalhes-body-full">
          <div class="detalhes-coluna-esquerda">
              <div class="detalhes-info">
                  <div class="detalhes-row"><strong>Protocolo:</strong> ${
                    item.protocolo
                  }</div>
                  <div class="detalhes-row"><strong>Cliente:</strong> ${
                    item.nome_cliente
                  }</div>
                  <div class="detalhes-row"><strong>Documento:</strong> ${
                    item.documento || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Tipo:</strong> ${
                    item.tipo_solicitacao
                  }</div>
                  <div class="detalhes-row"><strong>Analista:</strong> ${
                    item.analista || '-'
                  }</div>
                  <div class="detalhes-row"><strong>Data do Pedido:</strong> ${
                    item.data_pedido ? formatarDataHora(item.data_pedido) : '-'
                  }</div>
                  <div class="detalhes-row"><strong>Status:</strong> <span class="status-badge ${getStatusClass(
                    item.status
                  )}">${item.status}</span></div>
                  <div class="detalhes-row"><strong>Observações:</strong> ${
                    item.observacoes || 'Nenhuma'
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

function fecharModalDetalhes() {
  document.getElementById('modalDetalhes').classList.remove('active');
  document.body.style.overflow = '';
  solicitacaoAtual = null;
}

// ============================================================
// ALERTAS
// ============================================================
function verificarAlertas() {
  const agora = new Date();
  const semRetorno1 = [];
  const semRetorno2 = [];
  const atencao = [];

  todasSolicitacoes.forEach((sol) => {
    if (sol.status === 'Concluída') return;

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
  const body = document.getElementById('modalAlertBody');
  let html = '';

  if (semRetorno1.length > 0) {
    html += `<div class="alerta-categoria alerta-amarelo">
            <h4>Solicitações sem retorno 1° dia útil</h4>
            ${semRetorno1
              .map(
                (s) =>
                  `<div class="alerta-item">${s.protocolo} - ${s.nome_cliente}</div>`
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
                  `<div class="alerta-item">${s.protocolo} - ${s.nome_cliente}</div>`
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
                  `<div class="alerta-item">${s.protocolo} - ${s.nome_cliente}</div>`
              )
              .join('')}
        </div>`;
  }

  body.innerHTML = html;
  document.getElementById('modalAlert').classList.add('active');
}

function fecharModalAlert() {
  document.getElementById('modalAlert').classList.remove('active');
}

// ============================================================
// UTILITÁRIOS
// ============================================================
// Formata data/hora para exibição (DD/MM/AAAA HH:MM)
function formatarDataHora(datetimeStr) {
  if (!datetimeStr) return '-';
  try {
    const date = new Date(datetimeStr);
    // Se a data for inválida, tenta sem ajuste
    if (isNaN(date.getTime())) {
      return datetimeStr;
    }
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
// Formata data para input datetime-local (YYYY-MM-DDTHH:MM)
function formatarParaInput(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
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
  }, 3000);
}
